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
async function createBook() {
  const res = await request(app)
    .post('/api/books')
    .send({ title: '테스트 도서', author: '테스트 저자' });
  return res.body.data;
}

// ─────────────────────────────────────────────────────────────
// TC-MEMO-001: 메모 등록 - HIGHLIGHT 타입, 전체 필드
// ─────────────────────────────────────────────────────────────
describe('TC-MEMO-001: 메모 등록 - HIGHLIGHT 타입, 전체 필드', () => {
  it('HTTP 201, type·page·bookId·createdAt 반환', async () => {
    const book = await createBook();

    const res = await request(app)
      .post(`/api/books/${book.id}/memos`)
      .send({ page: 42, content: '이 장면에서 복선이 드러난다.', type: 'HIGHLIGHT' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('HIGHLIGHT');
    expect(res.body.data.page).toBe(42);
    expect(res.body.data.bookId).toBe(book.id);
    expect(res.body.data.content).toBe('이 장면에서 복선이 드러난다.');
    expect(res.body.data.createdAt).toBeDefined();
    expect(res.body.data.updatedAt).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// TC-MEMO-002: 메모 등록 - type 생략 시 기본값 MEMO
// ─────────────────────────────────────────────────────────────
describe('TC-MEMO-002: 메모 등록 - type 생략 시 기본값 MEMO', () => {
  it('HTTP 201, data.type === MEMO, data.page === null', async () => {
    const book = await createBook();

    const res = await request(app)
      .post(`/api/books/${book.id}/memos`)
      .send({ content: '읽으면서 든 생각' });

    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('MEMO');
    expect(res.body.data.page).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// TC-MEMO-006: 메모 목록 조회 - 필터 없음
// ─────────────────────────────────────────────────────────────
describe('TC-MEMO-006: 메모 목록 조회 - 필터 없음', () => {
  it('HTTP 200, MEMO·HIGHLIGHT 혼합 반환, total 정합성', async () => {
    const book = await createBook();

    await prisma.memo.createMany({
      data: [
        { bookId: book.id, content: '메모1', type: 'MEMO' },
        { bookId: book.id, content: '메모2', type: 'MEMO' },
        { bookId: book.id, content: '하이라이트1', type: 'HIGHLIGHT', page: 10 },
        { bookId: book.id, content: '하이라이트2', type: 'HIGHLIGHT', page: 20 },
        { bookId: book.id, content: '하이라이트3', type: 'HIGHLIGHT', page: 30 },
      ],
    });

    const res = await request(app).get(`/api/books/${book.id}/memos`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBe(5);
    expect(res.body.data).toHaveLength(5);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-MEMO-007: 메모 목록 조회 - type=HIGHLIGHT 필터
// ─────────────────────────────────────────────────────────────
describe('TC-MEMO-007: 메모 목록 조회 - type=HIGHLIGHT 필터', () => {
  it('HIGHLIGHT 메모만 반환, total:3', async () => {
    const book = await createBook();

    await prisma.memo.createMany({
      data: [
        { bookId: book.id, content: '메모1', type: 'MEMO' },
        { bookId: book.id, content: '메모2', type: 'MEMO' },
        { bookId: book.id, content: '하이라이트1', type: 'HIGHLIGHT', page: 10 },
        { bookId: book.id, content: '하이라이트2', type: 'HIGHLIGHT', page: 20 },
        { bookId: book.id, content: '하이라이트3', type: 'HIGHLIGHT', page: 30 },
      ],
    });

    const res = await request(app).get(`/api/books/${book.id}/memos?type=HIGHLIGHT`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.data.every((m: { type: string }) => m.type === 'HIGHLIGHT')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-MEMO-008: 메모 목록 조회 - type=MEMO 필터
// ─────────────────────────────────────────────────────────────
describe('TC-MEMO-008: 메모 목록 조회 - type=MEMO 필터', () => {
  it('MEMO 타입 메모만 반환, total:2', async () => {
    const book = await createBook();

    await prisma.memo.createMany({
      data: [
        { bookId: book.id, content: '메모1', type: 'MEMO' },
        { bookId: book.id, content: '메모2', type: 'MEMO' },
        { bookId: book.id, content: '하이라이트1', type: 'HIGHLIGHT', page: 10 },
      ],
    });

    const res = await request(app).get(`/api/books/${book.id}/memos?type=MEMO`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.data.every((m: { type: string }) => m.type === 'MEMO')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-MEMO-013: 메모 수정 - 정상 수정
// ─────────────────────────────────────────────────────────────
describe('TC-MEMO-013: 메모 수정 - 정상 수정', () => {
  it('HTTP 200, 수정 필드 반영·updatedAt 갱신', async () => {
    const book = await createBook();
    const createRes = await request(app)
      .post(`/api/books/${book.id}/memos`)
      .send({ page: 42, content: '원래 내용', type: 'HIGHLIGHT' });
    const memoId = createRes.body.data.id;
    const originalUpdatedAt = createRes.body.data.updatedAt;

    await new Promise((r) => setTimeout(r, 10));

    const res = await request(app)
      .put(`/api/memos/${memoId}`)
      .send({ page: 50, content: '수정된 메모 내용', type: 'MEMO' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.page).toBe(50);
    expect(res.body.data.content).toBe('수정된 메모 내용');
    expect(res.body.data.type).toBe('MEMO');
    expect(new Date(res.body.data.updatedAt).getTime())
      .toBeGreaterThan(new Date(originalUpdatedAt).getTime());
  });
});

// ─────────────────────────────────────────────────────────────
// TC-MEMO-015: 메모 수정 - 존재하지 않는 ID
// ─────────────────────────────────────────────────────────────
describe('TC-MEMO-015: 메모 수정 - 존재하지 않는 ID', () => {
  it('HTTP 404, 메모를 찾을 수 없습니다 메시지', async () => {
    const res = await request(app)
      .put('/api/memos/99999')
      .send({ content: '수정 시도' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('메모를 찾을 수 없습니다.');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-MEMO-017: 메모 삭제 - 정상 삭제
// ─────────────────────────────────────────────────────────────
describe('TC-MEMO-017: 메모 삭제 - 정상 삭제', () => {
  it('HTTP 200, 이후 목록 조회 시 해당 메모 미포함', async () => {
    const book = await createBook();
    const createRes = await request(app)
      .post(`/api/books/${book.id}/memos`)
      .send({ content: '삭제할 메모', type: 'MEMO' });
    const memoId = createRes.body.data.id;

    const deleteRes = await request(app).delete(`/api/memos/${memoId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    expect(deleteRes.body.message).toBe('메모가 삭제되었습니다.');

    const listRes = await request(app).get(`/api/books/${book.id}/memos`);
    expect(listRes.body.total).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-MEMO-018: 메모 삭제 - 존재하지 않는 ID
// ─────────────────────────────────────────────────────────────
describe('TC-MEMO-018: 메모 삭제 - 존재하지 않는 ID', () => {
  it('HTTP 404, 메모를 찾을 수 없습니다 메시지', async () => {
    const res = await request(app).delete('/api/memos/99999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('메모를 찾을 수 없습니다.');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-MEMO-019: 연계 - Book 삭제 시 메모 Cascade 삭제
// ─────────────────────────────────────────────────────────────
describe('TC-MEMO-019: 연계 - Book 삭제 시 메모 Cascade 삭제', () => {
  it('Book 삭제 후 DB에서 연결 메모도 제거됨', async () => {
    const book = await createBook();

    await prisma.memo.createMany({
      data: [
        { bookId: book.id, content: '메모A', type: 'MEMO' },
        { bookId: book.id, content: '메모B', type: 'HIGHLIGHT', page: 5 },
      ],
    });

    await request(app).delete(`/api/books/${book.id}`);

    const memos = await prisma.memo.findMany({ where: { bookId: book.id } });
    expect(memos).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-MEMO-020: 통합 - 메모 전체 CRUD 흐름
// ─────────────────────────────────────────────────────────────
describe('TC-MEMO-020: 통합 - 메모 전체 CRUD 흐름', () => {
  it('등록 → 목록 포함 확인 → 수정 → 삭제 → 미존재 확인', async () => {
    const book = await createBook();

    // 등록
    const createRes = await request(app)
      .post(`/api/books/${book.id}/memos`)
      .send({ page: 10, content: '최초 메모', type: 'HIGHLIGHT' });
    expect(createRes.status).toBe(201);
    const memoId = createRes.body.data.id;

    // 목록 포함 확인
    const listRes = await request(app).get(`/api/books/${book.id}/memos`);
    expect(listRes.body.total).toBe(1);

    // 수정
    const updateRes = await request(app)
      .put(`/api/memos/${memoId}`)
      .send({ content: '수정된 내용' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.content).toBe('수정된 내용');

    // 삭제
    const deleteRes = await request(app).delete(`/api/memos/${memoId}`);
    expect(deleteRes.status).toBe(200);

    // 삭제 후 목록 확인
    const afterRes = await request(app).get(`/api/books/${book.id}/memos`);
    expect(afterRes.body.total).toBe(0);
  });
});
