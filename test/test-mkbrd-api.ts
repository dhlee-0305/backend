import request from 'supertest';
import express from 'express';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

// 실제 DB 대신 트랜잭션 롤백을 수행하는 저장소를 사용한다.
jest.mock('../config/prisma', () => {
  let rows: any[] = [];
  let histories: any[] = [];
  let seq = 0;
  const match = (r: any, where: any) => Object.entries(where || {}).every(([k, v]) => r[k] === v);
  const board = {
    findUnique: jest.fn(async ({ where }) => rows.find(r => match(r, where)) || null),
    findMany: jest.fn(async ({ where, skip, take }) => rows.filter(r => match(r, where)).reverse().slice(skip, skip + take)),
    count: jest.fn(async ({ where }) => rows.filter(r => match(r, where)).length),
    create: jest.fn(async ({ data }) => {
      if (rows.some(r => r.category === data.category && r.title === data.title)) throw { code: 'P2002' };
      const row = { id: ++seq, ...data, createdAt: new Date(), updatedAt: new Date() };
      rows.push(row);
      return row;
    }),
    update: jest.fn(async ({ where, data }) => {
      if (rows.some(r => r.id !== where.id && r.category === data.category && r.title === data.title)) throw { code: 'P2002' };
      const i = rows.findIndex(r => match(r, where));
      rows[i] = { ...rows[i], ...data, updatedAt: new Date() };
      return rows[i];
    }),
    delete: jest.fn(async ({ where }) => { rows = rows.filter(r => !match(r, where)); }),
  };
  const history = { create: jest.fn(async ({ data }) => { histories.push(data); return data; }) };
  const db: any = {
    mkbrd: board, mkbrdHist: history,
    $transaction: async (work: any) => {
      if (typeof work !== 'function') return Promise.all(work);
      const snapshot = [...rows];
      const oldHist = [...histories];
      try { return await work(db); } catch (err) { rows = snapshot; histories = oldHist; throw err; }
    },
    reset: () => { rows = []; histories = []; },
    history: () => histories,
  };
  return { __esModule: true, default: db };
});

import prisma from '../config/prisma';
const originalCwd = process.cwd();
let temp: string;
let app: express.Express;
let root: string;
const db = prisma as any;

beforeAll(async () => {
  temp = await fs.mkdtemp(path.join(os.tmpdir(), 'mkbrd-test-'));
  process.chdir(temp);
  const controller = await import('../controllers/mkbrdController');
  root = path.join(temp, 'mkbrd');
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).session = req.headers['x-test-user'] ? { userId: 7 } : {};
    next();
  });
  app.get('/api/mkbrd', controller.getDocuments);
  app.get('/api/mkbrd/:id', controller.getDocument);
  app.post('/api/mkbrd', controller.createDocument);
  app.put('/api/mkbrd/:id', controller.updateDocument);
  app.delete('/api/mkbrd/:id', controller.deleteDocument);
});
beforeEach(async () => {
  db.reset();
  jest.clearAllMocks();
  await fs.rm(root, { recursive: true, force: true });
});
afterAll(async () => {
  process.chdir(originalCwd);
  await fs.rm(temp, { recursive: true, force: true });
});
const input = { category: 'AI', title: '안내.md', content: '# 문서\n한글' };
const create = (body = input) => request(app).post('/api/mkbrd').set('x-test-user', '7').send(body);

it('등록·UTF-8 크기·공개 상세 조회·파일 이동·삭제와 사용자 이력 보존', async () => {
  const created = await create();
  expect(created.status).toBe(201);
  const { id } = created.body.data;
  expect(created.body.data.size).toBe(Buffer.byteLength(input.content));
  expect(await fs.readFile(path.join(root, 'AI', '안내.md'), 'utf8')).toBe(input.content);
  const detail = await request(app).get(`/api/mkbrd/${id}`);
  expect(detail.body.data.content).toBe(input.content);
  const updated = await request(app).put(`/api/mkbrd/${id}`).set('x-test-user', '7')
    .send({ category: '설계', title: '설계.md', content: '' });
  expect(updated.status).toBe(200);
  expect(updated.body.data.size).toBe(0);
  await expect(fs.access(path.join(root, 'AI', '안내.md'))).rejects.toThrow();
  expect(await fs.readFile(path.join(root, '설계', '설계.md'), 'utf8')).toBe('');
  expect((await request(app).delete(`/api/mkbrd/${id}`).set('x-test-user', '7')).status).toBe(200);
  await expect(fs.access(path.join(root, '설계', '설계.md'))).rejects.toThrow();
  expect((await request(app).get(`/api/mkbrd/${id}`)).status).toBe(404);
  expect(db.history()).toEqual(['등록', '수정', '삭제'].map(action => ({ documentId: id, userId: 7, action })));
});

it('목록 페이징·카테고리 필터·잘못된 입력 처리', async () => {
  await create();
  await create({ ...input, title: '두번째.md' });
  await create({ ...input, category: '관리' });
  const list = await request(app).get('/api/mkbrd?category=AI&page=2&limit=1');
  expect(list.body).toMatchObject({ success: true, total: 2, page: 2, limit: 1 });
  expect(list.body.data).toHaveLength(1);
  for (const query of ['page=0', 'page=1.5', 'limit=101', 'category=미정', 'page=99999999999999999']) {
    expect((await request(app).get(`/api/mkbrd?${query}`)).status).toBe(400);
  }
  for (const title of ['../x.md', 'x\\y.md', 'x.txt', '.md', 'CON.md']) {
    expect((await create({ ...input, title })).status).toBe(400);
  }
  expect((await create({ ...input, category: '미정' })).status).toBe(400);
  expect((await request(app).get('/api/mkbrd/abc')).status).toBe(400);
});

it('변경 API는 로그인이 필요하고 같은 카테고리 파일 중복을 거부', async () => {
  for (const method of ['post', 'put', 'delete'] as const) {
    expect((await request(app)[method](method === 'post' ? '/api/mkbrd' : '/api/mkbrd/1').send(input)).status).toBe(401);
  }
  await create();
  expect((await create()).status).toBe(409);
  expect((await create({ ...input, category: '관리' })).status).toBe(201);
});

it.each(['수정', '삭제'])('%s 이력 저장 실패 시 DB와 기존 파일을 복구', async action => {
  const { id } = (await create()).body.data;
  const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  db.mkbrdHist.create.mockRejectedValueOnce(new Error('history failure'));
  const response = action === '수정'
    ? await request(app).put(`/api/mkbrd/${id}`).set('x-test-user', '7').send({ category: '관리', title: '변경.md', content: '수정' })
    : await request(app).delete(`/api/mkbrd/${id}`).set('x-test-user', '7');
  expect(response.status).toBe(500);
  expect((await request(app).get(`/api/mkbrd/${id}`)).body.data.content).toBe(input.content);
  expect(db.history()).toHaveLength(1);
  expect(await fs.readdir(path.join(root, 'AI'))).toEqual(['안내.md']);
  spy.mockRestore();
});

it('등록 이력 실패 시 새 파일과 메타데이터를 제거', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  db.mkbrdHist.create.mockRejectedValueOnce(new Error('history failure'));
  expect((await create()).status).toBe(500);
  expect((await request(app).get('/api/mkbrd')).body.total).toBe(0);
  expect(await fs.readdir(path.join(root, 'AI'))).toEqual([]);
  spy.mockRestore();
});

it('동시 등록에서 파일 중복을 거부하고 기존 파일을 유지', async () => {
  const results = await Promise.all([create(), create({ ...input, content: '다른 내용' })]);
  expect(results.map(r => r.status).sort()).toEqual([201, 409]);
  const saved = results.find(r => r.status === 201)!.body.data;
  const detail = await request(app).get(`/api/mkbrd/${saved.id}`);
  expect(Buffer.byteLength(detail.body.data.content)).toBe(saved.size);
});

it('파일 교체 실패 시 DB·이력·원본을 복구', async () => {
  const { id } = (await create()).body.data;
  const originalRename = fs.rename.bind(fs);
  const rename = jest.spyOn(fs, 'rename').mockImplementation(async (source, dest) => {
    if (String(source).endsWith('.tmp')) throw new Error('disk failure');
    return originalRename(source, dest);
  });
  const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const response = await request(app).put(`/api/mkbrd/${id}`).set('x-test-user', '7').send({ content: '교체' });
  expect(response.status).toBe(500);
  rename.mockRestore();
  expect((await request(app).get(`/api/mkbrd/${id}`)).body.data.content).toBe(input.content);
  expect(db.history()).toHaveLength(1);
  expect(await fs.readdir(path.join(root, 'AI'))).toEqual(['안내.md']);
  log.mockRestore();
});
