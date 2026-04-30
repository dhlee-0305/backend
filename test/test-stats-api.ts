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

// ─────────────────────────────────────────────────────────────
// TC-STATS-001: 응답 구조 검증
// ─────────────────────────────────────────────────────────────
describe('TC-STATS-001: 통계 조회 - 응답 구조 검증', () => {
  it('HTTP 200, 모든 필수 필드 포함', async () => {
    const res = await request(app).get('/api/stats');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalBooks');
    expect(res.body.data).toHaveProperty('statusCounts');
    expect(res.body.data).toHaveProperty('genreCounts');
    expect(res.body.data).toHaveProperty('monthlyReading');
    expect(res.body.data).toHaveProperty('avgRating');
    expect(res.body.data).toHaveProperty('yearlyDoneCount');
    expect(res.body.data).toHaveProperty('currentYear');
    expect(typeof res.body.data.totalBooks).toBe('number');
    expect(Array.isArray(res.body.data.statusCounts)).toBe(true);
    expect(Array.isArray(res.body.data.genreCounts)).toBe(true);
    expect(Array.isArray(res.body.data.monthlyReading)).toBe(true);
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

    const res = await request(app).get('/api/stats');
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

    const res = await request(app).get('/api/stats');
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
// TC-STATS-007: monthlyReading - 12개 항목 항상 반환
// ─────────────────────────────────────────────────────────────
describe('TC-STATS-007: monthlyReading - 12개 항목 항상 반환', () => {
  it('데이터 없어도 1~12월 12개 항목, count:0', async () => {
    const res = await request(app).get('/api/stats');
    const monthly: { month: number; count: number }[] = res.body.data.monthlyReading;

    expect(monthly).toHaveLength(12);
    for (let m = 1; m <= 12; m++) {
      const item = monthly.find((x) => x.month === m);
      expect(item).toBeDefined();
      expect(item!.count).toBe(0);
    }
  });

  it('완독 기록 있는 월은 count > 0, 없는 월은 count === 0', async () => {
    const book = await prisma.book.create({
      data: { title: '책', author: '저자', status: 'OWNED' },
    });
    const currentYear = new Date().getFullYear();

    // 올해 3월 완독 기록 2건
    await prisma.readingLog.createMany({
      data: [
        { bookId: book.id, endDate: new Date(`${currentYear}-03-10`) },
        { bookId: book.id, endDate: new Date(`${currentYear}-03-20`) },
      ],
    });

    const res = await request(app).get('/api/stats');
    const monthly: { month: number; count: number }[] = res.body.data.monthlyReading;

    const march = monthly.find((x) => x.month === 3);
    expect(march!.count).toBe(2);

    const april = monthly.find((x) => x.month === 4);
    expect(april!.count).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-STATS-010: yearlyDoneCount - 올해 완독 건수 정합성
// ─────────────────────────────────────────────────────────────
describe('TC-STATS-010: yearlyDoneCount - 올해 완독 건수 정합성', () => {
  it('올해 endDate 기록만 집계, 작년 기록 제외', async () => {
    const book = await prisma.book.create({
      data: { title: '책', author: '저자', status: 'OWNED' },
    });
    const currentYear = new Date().getFullYear();

    await prisma.readingLog.createMany({
      data: [
        { bookId: book.id, endDate: new Date(`${currentYear}-06-01`) },
        { bookId: book.id, endDate: new Date(`${currentYear}-09-15`) },
        { bookId: book.id, endDate: new Date(`${currentYear - 1}-12-31`) }, // 작년
      ],
    });

    const res = await request(app).get('/api/stats');
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

    const res = await request(app).get('/api/stats');
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

    const res = await request(app).get('/api/stats');
    expect(res.body.data.avgRating).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-STATS-014: 빈 DB - 데이터 없는 초기 상태
// ─────────────────────────────────────────────────────────────
describe('TC-STATS-014: 빈 DB - 데이터 없는 초기 상태', () => {
  it('모든 집계 0, monthlyReading 12개 모두 count:0, currentYear 현재 연도', async () => {
    const res = await request(app).get('/api/stats');

    expect(res.status).toBe(200);
    expect(res.body.data.totalBooks).toBe(0);
    expect(res.body.data.statusCounts).toHaveLength(0);
    expect(res.body.data.genreCounts).toHaveLength(0);
    expect(res.body.data.avgRating).toBe(0);
    expect(res.body.data.yearlyDoneCount).toBe(0);
    expect(res.body.data.currentYear).toBe(new Date().getFullYear());
    expect(res.body.data.monthlyReading).toHaveLength(12);
    expect(res.body.data.monthlyReading.every((m: { count: number }) => m.count === 0)).toBe(true);
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

    const res = await request(app).get('/api/stats');
    const genreCounts: { genre: string; count: number }[] = res.body.data.genreCounts;

    const unclassified = genreCounts.find((g) => g.genre === '미분류');
    const novel = genreCounts.find((g) => g.genre === '소설');

    expect(unclassified?.count).toBe(2);
    expect(novel?.count).toBe(1);
  });
});
