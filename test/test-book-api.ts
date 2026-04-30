import request from 'supertest';
import { buildApp, cleanDb, closeDb } from './helpers';
import prisma from '../config/prisma';

const app = buildApp();

beforeEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await closeDb();
});

// 테스트용 도서 생성 헬퍼
async function createBook(overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/books')
    .send({
      title: '채식주의자',
      author: '한강',
      publisher: '창비',
      isbn: `TEST-${Date.now().toString().slice(-10)}-${Math.floor(Math.random() * 9999)}`,
      genre: '소설',
      status: 'OWNED',
      ...overrides,
    });
  return res.body.data;
}

// ─────────────────────────────────────────────────────────────
// TC-BOOK-001: 도서 등록 - 필수 필드만 입력
// ─────────────────────────────────────────────────────────────
describe('TC-BOOK-001: 도서 등록 - 필수 필드만 입력', () => {
  it('HTTP 201, status 기본값 OWNED, 선택 필드 null', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ title: '채식주의자', author: '한강' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeGreaterThan(0);
    expect(res.body.data.status).toBe('OWNED');
    expect(res.body.data.isbn).toBeNull();
    expect(res.body.data.genre).toBeNull();
    expect(res.body.data.coverUrl).toBeNull();
    expect(res.body.data.purchaseDate).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// TC-BOOK-002: 도서 등록 - 전체 필드 입력
// ─────────────────────────────────────────────────────────────
describe('TC-BOOK-002: 도서 등록 - 전체 필드 입력', () => {
  it('HTTP 201, purchaseDate ISO 8601 변환, 모든 필드 반영', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({
        title: '채식주의자',
        author: '한강',
        publisher: '창비',
        isbn: '9788936434120',
        genre: '소설',
        coverUrl: 'https://example.com/cover.jpg',
        purchaseDate: '2024-01-15',
        status: 'OWNED',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.publisher).toBe('창비');
    expect(res.body.data.isbn).toBe('9788936434120');
    expect(res.body.data.genre).toBe('소설');
    expect(res.body.data.coverUrl).toBe('https://example.com/cover.jpg');
    expect(res.body.data.purchaseDate).toMatch(/^2024-01-15/);
    expect(res.body.data.createdAt).toBeDefined();
    expect(res.body.data.updatedAt).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// TC-BOOK-003: 도서 등록 - ISBN 중복
// ─────────────────────────────────────────────────────────────
describe('TC-BOOK-003: 도서 등록 - ISBN 중복', () => {
  it('HTTP 409, 이미 등록된 ISBN 메시지', async () => {
    await request(app)
      .post('/api/books')
      .send({ title: '채식주의자', author: '한강', isbn: '9788936434120' });

    const res = await request(app)
      .post('/api/books')
      .send({ title: '다른 책', author: '다른 저자', isbn: '9788936434120' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('이미 등록된 ISBN입니다.');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-BOOK-006: 도서 단건 조회 - 정상 조회
// ─────────────────────────────────────────────────────────────
describe('TC-BOOK-006: 도서 단건 조회 - 정상 조회', () => {
  it('HTTP 200, readingLogs·memos 포함 전체 필드 반환', async () => {
    const book = await createBook({ title: '소년이 온다', author: '한강' });

    await prisma.readingLog.create({
      data: { bookId: book.id, userName: '홍길동', readStatus: 'READ', rating: 4.5 },
    });
    await prisma.memo.create({
      data: { bookId: book.id, content: '인상 깊은 구절', type: 'HIGHLIGHT', page: 10 },
    });

    const res = await request(app).get(`/api/books/${book.id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(book.id);
    expect(Array.isArray(res.body.data.readingLogs)).toBe(true);
    expect(res.body.data.readingLogs).toHaveLength(1);
    expect(Array.isArray(res.body.data.memos)).toBe(true);
    expect(res.body.data.memos).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-BOOK-007: 도서 단건 조회 - 존재하지 않는 ID
// ─────────────────────────────────────────────────────────────
describe('TC-BOOK-007: 도서 단건 조회 - 존재하지 않는 ID', () => {
  it('HTTP 404, 도서를 찾을 수 없습니다 메시지', async () => {
    const res = await request(app).get('/api/books/99999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('도서를 찾을 수 없습니다.');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-BOOK-008: 도서 목록 조회 - 파라미터 없음 (기본값)
// ─────────────────────────────────────────────────────────────
describe('TC-BOOK-008: 도서 목록 조회 - 기본값', () => {
  it('HTTP 200, data 배열·total·page·limit 포함, readingLogs·_count 포함', async () => {
    await createBook({ title: '책1', author: '저자1' });
    await createBook({ title: '책2', author: '저자2' });

    const res = await request(app).get('/api/books');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
    expect(res.body.data[0]).toHaveProperty('readingLogs');
    expect(res.body.data[0]).toHaveProperty('_count');
    expect(res.body.data[0]._count).toHaveProperty('memos');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-BOOK-020: 도서 수정 - 일부 필드 수정
// ─────────────────────────────────────────────────────────────
describe('TC-BOOK-020: 도서 수정 - 일부 필드만 수정', () => {
  it('HTTP 200, 변경 필드 반영·미변경 필드 유지', async () => {
    const book = await createBook({ title: '원래 제목', author: '원래 저자', status: 'OWNED' });

    const res = await request(app)
      .put(`/api/books/${book.id}`)
      .send({ status: 'SOLD' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SOLD');
    expect(res.body.data.title).toBe('원래 제목');
    expect(res.body.data.author).toBe('원래 저자');
    expect(new Date(res.body.data.updatedAt).getTime())
      .toBeGreaterThanOrEqual(new Date(book.updatedAt).getTime());
  });
});

// ─────────────────────────────────────────────────────────────
// TC-BOOK-021: 도서 수정 - 존재하지 않는 ID
// ─────────────────────────────────────────────────────────────
describe('TC-BOOK-021: 도서 수정 - 존재하지 않는 ID', () => {
  it('HTTP 404, 도서를 찾을 수 없습니다 메시지', async () => {
    const res = await request(app)
      .put('/api/books/99999')
      .send({ status: 'SOLD' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('도서를 찾을 수 없습니다.');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-BOOK-022: 도서 삭제 - 정상 삭제 및 Cascade
// ─────────────────────────────────────────────────────────────
describe('TC-BOOK-022: 도서 삭제 - 정상 삭제 및 Cascade', () => {
  it('HTTP 200, 이후 조회 시 404, ReadingLog·Memo도 삭제됨', async () => {
    const book = await createBook();

    await prisma.readingLog.create({
      data: { bookId: book.id, userName: '홍길동', readStatus: 'READ' },
    });
    await prisma.memo.create({
      data: { bookId: book.id, content: '테스트 메모', type: 'MEMO' },
    });

    const deleteRes = await request(app).delete(`/api/books/${book.id}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    expect(deleteRes.body.message).toBe('도서가 삭제되었습니다.');

    const getRes = await request(app).get(`/api/books/${book.id}`);
    expect(getRes.status).toBe(404);

    const logs = await prisma.readingLog.findMany({ where: { bookId: book.id } });
    expect(logs).toHaveLength(0);

    const memos = await prisma.memo.findMany({ where: { bookId: book.id } });
    expect(memos).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-BOOK-023: 도서 삭제 - 존재하지 않는 ID
// ─────────────────────────────────────────────────────────────
describe('TC-BOOK-023: 도서 삭제 - 존재하지 않는 ID', () => {
  it('HTTP 404, 도서를 찾을 수 없습니다 메시지', async () => {
    const res = await request(app).delete('/api/books/99999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('도서를 찾을 수 없습니다.');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-BOOK-024: 통합 - 도서 전체 CRUD 흐름
// ─────────────────────────────────────────────────────────────
describe('TC-BOOK-024: 통합 - 도서 전체 CRUD 흐름', () => {
  it('등록 → 조회 → 수정 → 삭제 → 404 확인', async () => {
    // 등록
    const createRes = await request(app)
      .post('/api/books')
      .send({ title: '흐름 테스트', author: '테스트 저자', isbn: '9780000000001' });
    expect(createRes.status).toBe(201);
    const id = createRes.body.data.id;

    // 조회
    const getRes = await request(app).get(`/api/books/${id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.title).toBe('흐름 테스트');

    // 수정
    const updateRes = await request(app)
      .put(`/api/books/${id}`)
      .send({ title: '수정된 제목', status: 'SOLD' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe('수정된 제목');

    // 삭제
    const deleteRes = await request(app).delete(`/api/books/${id}`);
    expect(deleteRes.status).toBe(200);

    // 삭제 후 조회 → 404
    const afterRes = await request(app).get(`/api/books/${id}`);
    expect(afterRes.status).toBe(404);
  });
});
