import request from 'supertest';
import { buildApp, cleanDb, closeDb } from './helpers';
import prisma from '../config/prisma';

const app = buildApp();
const PASSWORD = 'password1234';

async function loginAs(email = 'reader@example.com') {
  const agent = request.agent(app);

  await agent
    .post('/api/auth/signup')
    .send({ email, password: PASSWORD });

  await agent
    .post('/api/auth/login')
    .send({ email, password: PASSWORD });

  return agent;
}

beforeEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await closeDb();
});

// ─────────────────────────────────────────────────────────────
// TC-STATS-001: 응답 구조 검증
// ─────────────────────────────────────────────────────────────
describe('TC-STATS-001: 통계 조회 - 응답 구조 검증', () => {
  it('HTTP 200, 모든 필수 필드 포함', async () => {
    const agent = await loginAs();
    const res = await agent.get('/api/stats');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalBooks');
    expect(res.body.data).toHaveProperty('statusCounts');
    expect(res.body.data).toHaveProperty('genreCounts');
    expect(res.body.data).toHaveProperty('yearlyReading');
    expect(res.body.data).toHaveProperty('avgRating');
    expect(res.body.data).toHaveProperty('yearlyDoneCount');
    expect(res.body.data).toHaveProperty('currentYear');
    expect(typeof res.body.data.totalBooks).toBe('number');
    expect(Array.isArray(res.body.data.statusCounts)).toBe(true);
    expect(Array.isArray(res.body.data.genreCounts)).toBe(true);
    expect(Array.isArray(res.body.data.yearlyReading)).toBe(true);
  });

  it('비로그인 상태에서는 HTTP 401', async () => {
    const res = await request(app).get('/api/stats');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-STATS-002: totalBooks - 전체 도서 수 정합성
// ─────────────────────────────────────────────────────────────
describe('TC-STATS-002: totalBooks - 전체 도서 수 정합성', () => {
  it('등록한 도서 수와 totalBooks 일치', async () => {
    await prisma.book.createMany({
      data: [
        { title: '책1', author: '저자1', status: 'OWNED' },
        { title: '책2', author: '저자2', status: 'SOLD' },
        { title: '책3', author: '저자3', status: 'DONATED' },
      ],
    });

    const agent = await loginAs();
    const res = await agent.get('/api/stats');
    expect(res.body.data.totalBooks).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-STATS-003: statusCounts - 상태별 도서 수 정합성
// ─────────────────────────────────────────────────────────────
describe('TC-STATS-003: statusCounts - 상태별 도서 수 정합성', () => {
  it('OWNED:3, SOLD:2, DONATED:1 집계 정확', async () => {
    await prisma.book.createMany({
      data: [
        { title: '책1', author: '저자', status: 'OWNED' },
        { title: '책2', author: '저자', status: 'OWNED' },
        { title: '책3', author: '저자', status: 'OWNED' },
        { title: '책4', author: '저자', status: 'SOLD' },
        { title: '책5', author: '저자', status: 'SOLD' },
        { title: '책6', author: '저자', status: 'DONATED' },
      ],
    });

    const agent = await loginAs();
    const res = await agent.get('/api/stats');
    const statusCounts: { status: string; count: number }[] = res.body.data.statusCounts;

    const owned = statusCounts.find((s) => s.status === 'OWNED');
    const sold = statusCounts.find((s) => s.status === 'SOLD');
    const donated = statusCounts.find((s) => s.status === 'DONATED');

    expect(owned?.count).toBe(3);
    expect(sold?.count).toBe(2);
    expect(donated?.count).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-STATS-007: yearlyReading - 연도별 완독 건수 반환
// ─────────────────────────────────────────────────────────────
describe('TC-STATS-007: yearlyReading - 연도별 완독 건수 반환', () => {
  it('데이터 없으면 빈 배열 반환', async () => {
    const agent = await loginAs();
    const res = await agent.get('/api/stats');
    const yearly: { year: number; count: number }[] = res.body.data.yearlyReading;

    expect(yearly).toHaveLength(0);
  });

  it('createdAt 기준으로 연도별 READ 기록을 집계', async () => {
    const book = await prisma.book.create({
      data: { title: '책', author: '저자', status: 'OWNED' },
    });
    const email = 'reader@example.com';
    const agent = await loginAs(email);
    const currentYear = new Date().getFullYear();

    await prisma.readingLog.createMany({
      data: [
        { bookId: book.id, userName: email, readStatus: 'READ', createdAt: new Date(`${currentYear}-03-10`) },
        { bookId: book.id, userName: email, readStatus: 'READ', createdAt: new Date(`${currentYear}-03-20`) },
        { bookId: book.id, userName: email, readStatus: 'READ', createdAt: new Date(`${currentYear - 1}-05-01`) },
        { bookId: book.id, userName: email, readStatus: 'EXCLUDED', createdAt: new Date(`${currentYear}-06-01`) },
        { bookId: book.id, userName: 'other@example.com', readStatus: 'READ', createdAt: new Date(`${currentYear}-07-01`) },
      ],
    });

    const res = await agent.get('/api/stats');
    const yearly: { year: number; count: number }[] = res.body.data.yearlyReading;

    expect(yearly).toEqual([
      { year: currentYear - 1, count: 1 },
      { year: currentYear, count: 2 },
    ]);

    expect(res.body.data.yearlyDoneCount).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-STATS-010: yearlyDoneCount - 올해 완독 건수 정합성
// ─────────────────────────────────────────────────────────────
describe('TC-STATS-010: yearlyDoneCount - 올해 완독 건수 정합성', () => {
  it('올해 createdAt READ 기록만 집계, 작년 기록 제외', async () => {
    const book = await prisma.book.create({
      data: { title: '책', author: '저자', status: 'OWNED' },
    });
    const email = 'reader@example.com';
    const agent = await loginAs(email);
    const currentYear = new Date().getFullYear();

    await prisma.readingLog.createMany({
      data: [
        { bookId: book.id, userName: email, readStatus: 'READ', createdAt: new Date(`${currentYear}-06-01`) },
        { bookId: book.id, userName: email, readStatus: 'READ', createdAt: new Date(`${currentYear}-09-15`) },
        { bookId: book.id, userName: email, readStatus: 'READ', createdAt: new Date(`${currentYear - 1}-12-31`) },
        { bookId: book.id, userName: email, readStatus: 'EXCLUDED', createdAt: new Date(`${currentYear}-11-01`) },
        { bookId: book.id, userName: 'other@example.com', readStatus: 'READ', createdAt: new Date(`${currentYear}-12-01`) },
      ],
    });

    const res = await agent.get('/api/stats');
    expect(res.body.data.yearlyDoneCount).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-STATS-012: avgRating - 별점 기록 없는 경우
// ─────────────────────────────────────────────────────────────
describe('TC-STATS-012: avgRating - 별점 기록 없는 경우', () => {
  it('rating이 모두 null이면 avgRating === 0', async () => {
    const book = await prisma.book.create({
      data: { title: '책', author: '저자', status: 'OWNED' },
    });
    await prisma.readingLog.create({
      data: { bookId: book.id, readStatus: 'READ', rating: null },
    });

    const agent = await loginAs();
    const res = await agent.get('/api/stats');
    expect(res.body.data.avgRating).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-STATS-013: avgRating - null 포함 혼재 시 null 제외 평균
// ─────────────────────────────────────────────────────────────
describe('TC-STATS-013: avgRating - null 포함 혼재 시 null 제외 평균', () => {
  it('rating:5.0 기록 1건, rating:null 기록 2건 → avgRating === 5', async () => {
    const book = await prisma.book.create({
      data: { title: '책', author: '저자', status: 'OWNED' },
    });
    await prisma.readingLog.createMany({
      data: [
        { bookId: book.id, rating: 5.0 },
        { bookId: book.id, rating: null },
        { bookId: book.id, rating: null },
      ],
    });

    const agent = await loginAs();
    const res = await agent.get('/api/stats');
    expect(res.body.data.avgRating).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-STATS-014: 빈 DB - 데이터 없는 초기 상태
// ─────────────────────────────────────────────────────────────
describe('TC-STATS-014: 빈 DB - 데이터 없는 초기 상태', () => {
  it('모든 집계 0, yearlyReading 빈 배열, currentYear 현재 연도', async () => {
    const agent = await loginAs();
    const res = await agent.get('/api/stats');

    expect(res.status).toBe(200);
    expect(res.body.data.totalBooks).toBe(0);
    expect(res.body.data.statusCounts).toHaveLength(0);
    expect(res.body.data.genreCounts).toHaveLength(0);
    expect(res.body.data.avgRating).toBe(0);
    expect(res.body.data.yearlyDoneCount).toBe(0);
    expect(res.body.data.currentYear).toBe(new Date().getFullYear());
    expect(res.body.data.yearlyReading).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-STATS-006: genreCounts - 장르 없는 도서 "미분류" 집계
// ─────────────────────────────────────────────────────────────
describe('TC-STATS-006: genreCounts - 장르 없는 도서 "미분류" 집계', () => {
  it('genre:null 도서는 "미분류"로 집계됨', async () => {
    await prisma.book.createMany({
      data: [
        { title: '책1', author: '저자', genre: null, status: 'OWNED' },
        { title: '책2', author: '저자', genre: null, status: 'OWNED' },
        { title: '책3', author: '저자', genre: '소설', status: 'OWNED' },
      ],
    });

    const agent = await loginAs();
    const res = await agent.get('/api/stats');
    const genreCounts: { genre: string; count: number }[] = res.body.data.genreCounts;

    const unclassified = genreCounts.find((g) => g.genre === '미분류');
    const novel = genreCounts.find((g) => g.genre === '소설');

    expect(unclassified?.count).toBe(2);
    expect(novel?.count).toBe(1);
  });
});
