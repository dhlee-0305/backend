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
  const { default: router } = await import('../routes');
  root = path.join(temp, 'mkbrd');
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).session = req.headers['x-test-user'] ? { userId: 7 } : {};
    next();
  });
  app.use('/api', router);
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
const create = (body = input) => request(app).post('/api/mkbrd').set('x-test-user', '7')
  .field('category', body.category).attach('file', Buffer.from(body.content), { filename: body.title });
const replace = (id: number, title: string, content: string, category?: string) => {
  const req = request(app).put(`/api/mkbrd/${id}`).set('x-test-user', '7');
  if (category) req.field('category', category);
  return req.attach('file', Buffer.from(content), { filename: title });
};

it('등록·UTF-8 크기·공개 상세 조회·파일 이동·삭제와 사용자 이력 보존', async () => {
  const created = await create();
  expect(created.status).toBe(201);
  const { id } = created.body.data;
  expect(created.body.data.size).toBe(Buffer.byteLength(input.content));
  expect(await fs.readFile(path.join(root, 'AI', '안내.md'), 'utf8')).toBe(input.content);
  const detail = await request(app).get(`/api/mkbrd/${id}`);
  expect(detail.body.data.content).toBe(input.content);
  const updated = await replace(id, '설계.md', '', '설계');
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
  for (const title of ['x.txt', '.md', 'CON.md']) {
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
    ? await replace(id, '변경.md', '수정', '관리')
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
  const response = await replace(id, input.title, '교체');
  expect(response.status).toBe(500);
  rename.mockRestore();
  expect((await request(app).get(`/api/mkbrd/${id}`)).body.data.content).toBe(input.content);
  expect(db.history()).toHaveLength(1);
  expect(await fs.readdir(path.join(root, 'AI'))).toEqual(['안내.md']);
  log.mockRestore();
});


it('파일 없이 카테고리만 변경하면 원본 파일명·바이트를 유지', async () => {
  const { id } = (await create()).body.data;
  const response = await request(app).put(`/api/mkbrd/${id}`).set('x-test-user', '7').field('category', '관리');
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({ category: '관리', title: input.title, size: Buffer.byteLength(input.content) });
  expect(await fs.readFile(path.join(root, '관리', input.title), 'utf8')).toBe(input.content);
});

it('업로드 원본의 UTF-8 BOM과 CRLF 바이트를 보존', async () => {
  const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('# 한글\r\n')]);
  const response = await request(app).post('/api/mkbrd').set('x-test-user', '7')
    .attach('file', bytes, { filename: '원본.md', contentType: 'application/octet-stream' }).field('category', 'AI');
  expect(response.status).toBe(201);
  expect(response.body.data).toMatchObject({ title: '원본.md', size: bytes.length });
  expect(await fs.readFile(path.join(root, 'AI', '원본.md'))).toEqual(bytes);
});

it('JSON 텍스트 등록·수정은 415로 거부하고 누락된 파일은 400으로 처리', async () => {
  expect((await request(app).post('/api/mkbrd').set('x-test-user', '7').send(input)).status).toBe(415);
  expect((await request(app).put('/api/mkbrd/1').set('x-test-user', '7').send({ content: 'text' })).status).toBe(415);
  expect((await request(app).post('/api/mkbrd').set('x-test-user', '7').field('category', 'AI')).status).toBe(400);
  expect((await request(app).post('/api/mkbrd').set('x-test-user', '7').attach('file', Buffer.from('x'), 'x.md')).status).toBe(400);
  expect((await request(app).post('/api/mkbrd').set('x-test-user', '7').field('content', 'text')).status).toBe(400);
  expect(db.history()).toEqual([]);
});

it('잘못된 파일 필드·복수 파일·UTF-8이 아닌 파일을 거부', async () => {
  const badField = await request(app).post('/api/mkbrd').set('x-test-user', '7')
    .field('category', 'AI').attach('document', Buffer.from('x'), 'x.md');
  expect(badField.status).toBe(400);
  const multiple = await request(app).post('/api/mkbrd').set('x-test-user', '7')
    .field('category', 'AI').attach('file', Buffer.from('x'), 'a.md').attach('file', Buffer.from('x'), 'b.md');
  expect(multiple.status).toBe(400);
  for (const bytes of [Buffer.from([0xff, 0xfe]), Buffer.from([0x61, 0])]) {
    const response = await request(app).post('/api/mkbrd').set('x-test-user', '7')
      .field('category', 'AI').attach('file', bytes, 'x.md');
    expect(response.status).toBe(400);
  }
  expect(db.history()).toEqual([]);
});

it('파일 크기 제한을 초과하면 413 응답 후 파일·DB를 저장하지 않음', async () => {
  const { MAX_DOCUMENT_SIZE } = await import('../middleware/mkbrdUpload');
  const response = await request(app).post('/api/mkbrd').set('x-test-user', '7')
    .field('category', 'AI').attach('file', Buffer.alloc(MAX_DOCUMENT_SIZE + 1, 97), 'large.md');
  expect(response.status).toBe(413);
  expect((await request(app).get('/api/mkbrd')).body.total).toBe(0);
  await expect(fs.access(root)).rejects.toThrow();
});

it('multipart 원본 파일명에 경로를 포함하면 400으로 거부', async () => {
  for (const filename of ['../escape.md', 'sub/escape.md', 'sub\\escape.md']) {
    const boundary = 'mkbrd-test-boundary';
    const payload = `--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\nAI\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: text/markdown\r\n\r\n# test\r\n--${boundary}--\r\n`;
    const response = await request(app).post('/api/mkbrd').set('x-test-user', '7')
      .set('Content-Type', `multipart/form-data; boundary=${boundary}`).send(payload);
    expect(response.status).toBe(400);
  }
});

it('최대 크기와 같은 파일은 허용', async () => {
  const { MAX_DOCUMENT_SIZE } = await import('../middleware/mkbrdUpload');
  const response = await request(app).post('/api/mkbrd').set('x-test-user', '7')
    .field('category', 'AI').attach('file', Buffer.alloc(MAX_DOCUMENT_SIZE, 97), 'boundary.md');
  expect(response.status).toBe(201);
  expect(response.body.data.size).toBe(MAX_DOCUMENT_SIZE);
});
