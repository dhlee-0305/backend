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
// TC-LOG-001: 독서 기록 등록 - 전체 필드 입력
// ─────────────────────────────────────────────────────────────
describe('TC-LOG-001: 독서 기록 등록 - 전체 필드 입력', () => {
  it('HTTP 201, bookId 연결·날짜 ISO 변환·모든 필드 반환', async () => {
    const book = await createBook();

    const res = await request(app)
      .post(`/api/books/${book.id}/reading-logs`)
      .send({
        userName: '홍길동',
        readStatus: 'READ',
        startDate: '2024-01-10',
        endDate: '2024-02-05',
        rating: 4.5,
        review: '인상 깊은 책이었습니다.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bookId).toBe(book.id);
    expect(res.body.data.userName).toBe('홍길동');
    expect(res.body.data.readStatus).toBe('READ');
    expect(res.body.data.startDate).toMatch(/^2024-01-10/);
    expect(res.body.data.endDate).toMatch(/^2024-02-05/);
    expect(res.body.data.rating).toBe(4.5);
    expect(res.body.data.review).toBe('인상 깊은 책이었습니다.');
    expect(res.body.data.createdAt).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// TC-LOG-002: 독서 기록 등록 - 선택 필드 모두 생략
// ─────────────────────────────────────────────────────────────
describe('TC-LOG-002: 독서 기록 등록 - 선택 필드 모두 생략', () => {
  it('HTTP 201, 선택 필드 모두 null', async () => {
    const book = await createBook();

    const res = await request(app)
      .post(`/api/books/${book.id}/reading-logs`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.data.userName).toBeNull();
    expect(res.body.data.readStatus).toBeNull();
    expect(res.body.data.startDate).toBeNull();
    expect(res.body.data.endDate).toBeNull();
    expect(res.body.data.rating).toBeNull();
    expect(res.body.data.review).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// TC-LOG-004: 재독 기록 - 동일 도서에 복수 등록
// ─────────────────────────────────────────────────────────────
describe('TC-LOG-004: 재독 기록 - 동일 도서에 복수 등록', () => {
  it('같은 bookId에 독서 기록 2건 등록 가능, total:2', async () => {
    const book = await createBook();

    await request(app)
      .post(`/api/books/${book.id}/reading-logs`)
      .send({ userName: '홍길동', readStatus: 'READ', rating: 4.0 });

    await request(app)
      .post(`/api/books/${book.id}/reading-logs`)
      .send({ userName: '홍길동', readStatus: 'READ', rating: 5.0 });

    const res = await request(app).get(`/api/books/${book.id}/reading-logs`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.data).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-LOG-008: 독서 기록 목록 조회 - 등록일 내림차순 정렬
// ─────────────────────────────────────────────────────────────
describe('TC-LOG-008: 독서 기록 목록 조회 - 등록일 내림차순', () => {
  it('최신 등록 기록이 data[0]에 위치', async () => {
    const book = await createBook();

    // 시간차를 두어 순서 구분
    await prisma.readingLog.create({
      data: { bookId: book.id, userName: '첫번째', readStatus: 'READ' },
    });
    await new Promise((r) => setTimeout(r, 10));
    await prisma.readingLog.create({
      data: { bookId: book.id, userName: '두번째', readStatus: 'READ' },
    });

    const res = await request(app).get(`/api/books/${book.id}/reading-logs`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].userName).toBe('두번째');
    expect(res.body.data[1].userName).toBe('첫번째');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-LOG-010: 독서 기록 수정 - 일부 필드 수정
// ─────────────────────────────────────────────────────────────
describe('TC-LOG-010: 독서 기록 수정 - 일부 필드 수정', () => {
  it('HTTP 200, 수정 필드 반영·미수정 필드 유지·updatedAt 갱신', async () => {
    const book = await createBook();
    const logRes = await request(app)
      .post(`/api/books/${book.id}/reading-logs`)
      .send({ userName: '홍길동', readStatus: 'READ', startDate: '2024-01-10', rating: 4.0 });
    const logId = logRes.body.data.id;
    const originalUpdatedAt = logRes.body.data.updatedAt;

    await new Promise((r) => setTimeout(r, 10));

    const res = await request(app)
      .put(`/api/reading-logs/${logId}`)
      .send({ endDate: '2024-02-10', rating: 5.0, review: '다시 읽어도 좋은 책입니다.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.endDate).toMatch(/^2024-02-10/);
    expect(res.body.data.rating).toBe(5.0);
    expect(res.body.data.review).toBe('다시 읽어도 좋은 책입니다.');
    expect(res.body.data.userName).toBe('홍길동');
    expect(res.body.data.readStatus).toBe('READ');
    expect(new Date(res.body.data.updatedAt).getTime())
      .toBeGreaterThan(new Date(originalUpdatedAt).getTime());
  });
});

// ─────────────────────────────────────────────────────────────
// TC-LOG-011: 독서 기록 수정 - 존재하지 않는 ID
// ─────────────────────────────────────────────────────────────
describe('TC-LOG-011: 독서 기록 수정 - 존재하지 않는 ID', () => {
  it('HTTP 404, 독서 기록을 찾을 수 없습니다 메시지', async () => {
    const res = await request(app)
      .put('/api/reading-logs/99999')
      .send({ rating: 5.0 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('독서 기록을 찾을 수 없습니다.');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-LOG-013: 독서 기록 삭제 - 정상 삭제
// ─────────────────────────────────────────────────────────────
describe('TC-LOG-013: 독서 기록 삭제 - 정상 삭제', () => {
  it('HTTP 200, 이후 목록 조회 시 해당 기록 미포함', async () => {
    const book = await createBook();
    const logRes = await request(app)
      .post(`/api/books/${book.id}/reading-logs`)
      .send({ userName: '홍길동', readStatus: 'READ' });
    const logId = logRes.body.data.id;

    const deleteRes = await request(app).delete(`/api/reading-logs/${logId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    expect(deleteRes.body.message).toBe('독서 기록이 삭제되었습니다.');

    const listRes = await request(app).get(`/api/books/${book.id}/reading-logs`);
    expect(listRes.body.total).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-LOG-014: 독서 기록 삭제 - 존재하지 않는 ID
// ─────────────────────────────────────────────────────────────
describe('TC-LOG-014: 독서 기록 삭제 - 존재하지 않는 ID', () => {
  it('HTTP 404, 독서 기록을 찾을 수 없습니다 메시지', async () => {
    const res = await request(app).delete('/api/reading-logs/99999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('독서 기록을 찾을 수 없습니다.');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-LOG-015: 연계 - Book 삭제 시 독서 기록 Cascade 삭제
// ─────────────────────────────────────────────────────────────
describe('TC-LOG-015: 연계 - Book 삭제 시 독서 기록 Cascade 삭제', () => {
  it('Book 삭제 후 DB에서 연결 독서 기록도 제거됨', async () => {
    const book = await createBook();

    await prisma.readingLog.createMany({
      data: [
        { bookId: book.id, userName: '홍길동', readStatus: 'READ' },
        { bookId: book.id, userName: '이순신', readStatus: 'EXCLUDED' },
      ],
    });

    await request(app).delete(`/api/books/${book.id}`);

    const logs = await prisma.readingLog.findMany({ where: { bookId: book.id } });
    expect(logs).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-LOG-016: 통합 - 독서 기록 전체 흐름
// ─────────────────────────────────────────────────────────────
describe('TC-LOG-016: 통합 - 독서 기록 전체 흐름', () => {
  it('등록 → 목록 포함 확인 → 수정 → 삭제 → 미존재 확인', async () => {
    const book = await createBook();

    // 등록
    const createRes = await request(app)
      .post(`/api/books/${book.id}/reading-logs`)
      .send({ userName: '홍길동', readStatus: 'READ', rating: 4.0 });
    expect(createRes.status).toBe(201);
    const logId = createRes.body.data.id;

    // 목록 포함 확인
    const listRes = await request(app).get(`/api/books/${book.id}/reading-logs`);
    expect(listRes.body.total).toBe(1);

    // 수정
    const updateRes = await request(app)
      .put(`/api/reading-logs/${logId}`)
      .send({ rating: 5.0 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.rating).toBe(5.0);

    // 삭제
    const deleteRes = await request(app).delete(`/api/reading-logs/${logId}`);
    expect(deleteRes.status).toBe(200);

    // 삭제 후 목록 확인
    const afterRes = await request(app).get(`/api/books/${book.id}/reading-logs`);
    expect(afterRes.body.total).toBe(0);
  });
});
