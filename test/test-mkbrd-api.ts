import request from 'supertest';
import express from 'express';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { crc32, deflateRawSync } from 'zlib';

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
    delete: jest.fn(async ({ where }) => {
      const row = rows.find(r => match(r, where));
      rows = rows.filter(r => !match(r, where));
      return row;
    }),
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
    reset: () => {
      rows = []; histories = [];
      history.create.mockReset().mockImplementation(async ({ data }) => { histories.push(data); return data; });
    },
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
  expect(await fs.readFile(path.join(root, 'AI', '안내', '안내.md'), 'utf8')).toBe(input.content);
  const detail = await request(app).get(`/api/mkbrd/${id}`);
  expect(detail.body.data.content).toBe(input.content);
  const updated = await replace(id, '설계.md', '', '설계');
  expect(updated.status).toBe(200);
  expect(updated.body.data.size).toBe(0);
  await expect(fs.access(path.join(root, 'AI', '안내', '안내.md'))).rejects.toThrow();
  expect(await fs.readFile(path.join(root, '설계', '설계', '설계.md'), 'utf8')).toBe('');
  expect((await request(app).delete(`/api/mkbrd/${id}`).set('x-test-user', '7')).status).toBe(200);
  await expect(fs.access(path.join(root, '설계', '설계', '설계.md'))).rejects.toThrow();
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
  expect(await fs.readdir(path.join(root, 'AI'))).toEqual(['안내']);
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
  expect(await fs.readdir(path.join(root, 'AI'))).toEqual(['안내']);
  log.mockRestore();
});


it('파일 없이 카테고리만 변경하면 원본 파일명·바이트를 유지', async () => {
  const { id } = (await create()).body.data;
  const response = await request(app).put(`/api/mkbrd/${id}`).set('x-test-user', '7').field('category', '관리');
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({ category: '관리', title: input.title, size: Buffer.byteLength(input.content) });
  expect(await fs.readFile(path.join(root, '관리', '안내', input.title), 'utf8')).toBe(input.content);
});

it('업로드 원본의 UTF-8 BOM과 CRLF 바이트를 보존', async () => {
  const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('# 한글\r\n')]);
  const response = await request(app).post('/api/mkbrd').set('x-test-user', '7')
    .attach('file', bytes, { filename: '원본.md', contentType: 'application/octet-stream' }).field('category', 'AI');
  expect(response.status).toBe(201);
  expect(response.body.data).toMatchObject({ title: '원본.md', size: bytes.length });
  expect(await fs.readFile(path.join(root, 'AI', '원본', '원본.md'))).toEqual(bytes);
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


// 로컬 헤더와 중앙 디렉터리를 가진 실제 ZIP fixture (UTF-8 파일명, DEFLATE).
function imageZip(entries: Array<{ name: string; data?: Buffer; mode?: number; declaredSize?: number; encrypted?: boolean }>): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const data = entry.data ?? Buffer.alloc(0);
    const zipped = deflateRawSync(data);
    const flags = 0x800 | (entry.encrypted ? 1 : 0);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(flags, 6);
    head.writeUInt16LE(8, 8);
    head.writeUInt32LE(crc32(data), 14);
    head.writeUInt32LE(zipped.length, 18);
    head.writeUInt32LE(entry.declaredSize ?? data.length, 22);
    head.writeUInt16LE(name.length, 26);
    local.push(head, name, zipped);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(0x314, 4);
    record.writeUInt16LE(20, 6);
    record.writeUInt16LE(flags, 8);
    record.writeUInt16LE(8, 10);
    record.writeUInt32LE(crc32(data), 16);
    record.writeUInt32LE(zipped.length, 20);
    record.writeUInt32LE(entry.declaredSize ?? data.length, 24);
    record.writeUInt16LE(name.length, 28);
    record.writeUInt32LE(((entry.mode ?? (entry.name.endsWith('/') ? 0x41ed : 0x81a4)) << 16) >>> 0, 38);
    record.writeUInt32LE(offset, 42);
    central.push(record, name);
    offset += head.length + name.length + zipped.length;
  }
  const records = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(records.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, records, end]);
}
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8V8AAAAASUVORK5CYII=', 'base64');
const withImages = (archive = imageZip([{ name: '그림.png', data: png }])) => create().attach('images', archive, 'images.zip');
const imageFolder = () => path.join(root, 'AI', '안내', 'image');

it('문서별 폴더에 ZIP을 풀고 하위 폴더·한글 이미지 경로를 공개 조회', async () => {
  const archive = imageZip([{ name: '하위/' }, { name: '하위/그림.png', data: png }]);
  const response = await withImages(archive);
  expect(response.status).toBe(201);
  const { id } = response.body.data;
  expect(await fs.readFile(path.join(imageFolder(), '하위', '그림.png'))).toEqual(png);
  expect(response.body.data.size).toBe(Buffer.byteLength(input.content));
  expect((await request(app).get(`/api/mkbrd/${id}`)).body.data.imageBaseUrl).toBe(`/api/mkbrd/${id}/image/`);
  const image = await request(app).get(`/api/mkbrd/${id}/image/${encodeURIComponent('하위')}/${encodeURIComponent('그림.png')}`);
  expect(image.status).toBe(200);
  expect(image.headers['content-type']).toMatch(/^image\/png/);
  expect(image.body).toEqual(png);
  expect(image.headers['x-content-type-options']).toBe('nosniff');
  expect((await request(app).get(`/api/mkbrd/${id}/image/missing.png`)).status).toBe(404);
});

it('이미지만 수정하면 기존 이미지를 모두 교체하고 문서는 유지', async () => {
  const { id } = (await withImages(imageZip([{ name: '하위/이전.png', data: png }]))).body.data;
  const response = await request(app).put(`/api/mkbrd/${id}`).set('x-test-user', '7')
    .attach('images', imageZip([{ name: '새그림.png', data: png }]), 'new.zip');
  expect(response.status).toBe(200);
  expect(await fs.readdir(imageFolder())).toEqual(['새그림.png']);
  expect((await request(app).get(`/api/mkbrd/${id}`)).body.data.content).toBe(input.content);
  expect((await request(app).get(`/api/mkbrd/${id}/image/${encodeURIComponent('하위/이전.png')}`)).status).toBe(404);
  expect(db.history().map((h: any) => h.action)).toEqual(['등록', '수정']);
});

it('ZIP이 없으면 이미지 유지, 문서명·카테고리 변경 시 함께 이동, 삭제 시 폴더 전체 제거', async () => {
  const { id } = (await withImages()).body.data;
  const response = await replace(id, '다른문서.md', '새 본문', '설계');
  expect(response.status).toBe(200);
  const newDir = path.join(root, '설계', '다른문서');
  expect(await fs.readFile(path.join(newDir, 'image', '그림.png'))).toEqual(png);
  expect(await fs.readFile(path.join(newDir, '다른문서.md'), 'utf8')).toBe('새 본문');
  await expect(fs.access(path.join(root, 'AI', '안내'))).rejects.toThrow();
  expect((await request(app).get(`/api/mkbrd/${id}/image/${encodeURIComponent('그림.png')}`)).status).toBe(200);
  expect((await request(app).delete(`/api/mkbrd/${id}`).set('x-test-user', '7')).status).toBe(200);
  await expect(fs.access(newDir)).rejects.toThrow();
  expect((await request(app).get(`/api/mkbrd/${id}/image/${encodeURIComponent('그림.png')}`)).status).toBe(404);
  expect(db.history()).toHaveLength(3);
});

it.each(['수정', '삭제'])('이미지 첨부 문서 %s 이력 실패 시 문서와 이미지 전체 복구', async action => {
  const { id } = (await withImages()).body.data;
  const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  db.mkbrdHist.create.mockRejectedValueOnce(new Error('history failure'));
  const response = action === '수정'
    ? await replace(id, '변경.md', '수정 본문', '관리').attach('images', imageZip([{ name: '다른.png', data: png }]), 'new.zip')
    : await request(app).delete(`/api/mkbrd/${id}`).set('x-test-user', '7');
  expect(response.status).toBe(500);
  expect(await fs.readdir(imageFolder())).toEqual(['그림.png']);
  expect((await request(app).get(`/api/mkbrd/${id}`)).body.data.content).toBe(input.content);
  expect(db.history()).toHaveLength(1);
  expect(await fs.readdir(path.join(root, 'AI'))).toEqual(['안내']);
  log.mockRestore();
});

it('잘못된 ZIP 수정은 원본 문서·이미지를 변경하지 않음', async () => {
  const { id } = (await withImages()).body.data;
  const response = await replace(id, input.title, '바뀌면 안 되는 본문')
    .attach('images', Buffer.from('not zip'), 'bad.zip');
  expect(response.status).toBe(400);
  expect(await fs.readdir(imageFolder())).toEqual(['그림.png']);
  expect((await request(app).get(`/api/mkbrd/${id}`)).body.data.content).toBe(input.content);
  expect(db.history()).toHaveLength(1);
  expect(await fs.readdir(path.join(root, 'AI'))).toEqual(['안내']);
});

it('ZIP 경로 탈출·링크·암호화·중복·비이미지·과도한 압축 해제 크기 거부', async () => {
  const archives = [
    imageZip([{ name: '../escape.png', data: png }]),
    imageZip([{ name: '/absolute.png', data: png }]),
    imageZip([{ name: 'a\\escape.png', data: png }]),
    imageZip([{ name: 'link.png', data: png, mode: 0xa1ff }]),
    imageZip([{ name: 'a.png', data: png, encrypted: true }]),
    imageZip([{ name: 'A.png', data: png }, { name: 'a.png', data: png }]),
    imageZip([{ name: 'script.js', data: Buffer.from('code') }]),
    imageZip([{ name: 'huge.png', data: png, declaredSize: 100 * 1024 * 1024 + 1 }]),
  ];
  for (const archive of archives) {
    const response = await withImages(archive);
    expect(response.status).toBe(400);
  }
  expect(db.history()).toEqual([]);
  expect((await request(app).get('/api/mkbrd')).body.total).toBe(0);
  expect(await fs.readdir(path.join(root, 'AI'))).toEqual([]);
  await expect(fs.access(path.join(root, 'escape.png'))).rejects.toThrow();
});

it('ZIP이 아닌 첨부·이미지 ZIP 크기 초과·등록 시 문서 누락을 거부', async () => {
  expect((await create().attach('images', imageZip([]), 'images.png')).status).toBe(400);
  expect((await create().attach('images', Buffer.alloc(10 * 1024 * 1024 + 1, 97), 'big.zip')).status).toBe(413);
  expect((await request(app).post('/api/mkbrd').set('x-test-user', '7').field('category', 'AI')
    .attach('images', imageZip([]), 'images.zip')).status).toBe(400);
});

it('빈 ZIP으로 이미지 전체 비우기', async () => {
  const { id } = (await withImages()).body.data;
  expect((await request(app).put(`/api/mkbrd/${id}`).set('x-test-user', '7').attach('images', imageZip([]), 'empty.zip')).status).toBe(200);
  expect(await fs.readdir(imageFolder())).toEqual([]);
});

it('기존 평면 경로 문서를 조회하고 수정 시 새 폴더로 전환', async () => {
  const row = await db.mkbrd.create({ data: { category: 'AI', title: input.title, size: Buffer.byteLength(input.content) } });
  await fs.mkdir(path.join(root, 'AI'), { recursive: true });
  const legacy = path.join(root, 'AI', input.title);
  await fs.writeFile(legacy, input.content);
  expect((await request(app).get(`/api/mkbrd/${row.id}`)).body.data.content).toBe(input.content);
  expect((await request(app).put(`/api/mkbrd/${row.id}`).set('x-test-user', '7')
    .attach('images', imageZip([{ name: '그림.png', data: png }]), 'images.zip')).status).toBe(200);
  expect(await fs.readFile(path.join(root, 'AI', '안내', input.title), 'utf8')).toBe(input.content);
  expect(await fs.readFile(path.join(imageFolder(), '그림.png'))).toEqual(png);
  await expect(fs.access(legacy)).rejects.toThrow();
});

it('이미지 조회 시 경로 탈출을 차단', async () => {
  const { id } = (await withImages()).body.data;
  expect((await request(app).get(`/api/mkbrd/${id}/image/%2e%2e%2f안내.md`)).status).toBe(400);
});


it('ZIP 일부를 해제한 뒤 무결성 오류가 나도 기존 이미지 유지 및 임시 폴더 정리', async () => {
  const { id } = (await withImages()).body.data;
  const bad = imageZip([{ name: '새.png', data: png }, { name: '손상.png', data: png }]);
  const first = bad.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  const second = bad.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), first + 4);
  bad.writeUInt32LE((bad.readUInt32LE(second + 16) ^ 0xffffffff) >>> 0, second + 16);
  const response = await request(app).put(`/api/mkbrd/${id}`).set('x-test-user', '7').attach('images', bad, 'bad.zip');
  expect(response.status).toBe(400);
  expect(await fs.readdir(imageFolder())).toEqual(['그림.png']);
  expect(await fs.readdir(path.join(root, 'AI'))).toEqual(['안내']);
  expect(db.history()).toHaveLength(1);
});
