import { Request, Response } from 'express';
import prisma from '../config/prisma';

// ─── 전체 통계 조회 ───────────────────────────────────────────
export const getStats = async (req: Request, res: Response) => {
  try {
    const currentYear = new Date().getFullYear();

    // 상태별 도서 수
    const statusCounts = await prisma.book.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    // 장르별 도서 수
    const genreCounts = await prisma.book.groupBy({
      by: ['genre'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // 올해 완독한 책 (월별)
    const yearlyDone = await prisma.readingLog.findMany({
      where: {
        endDate: {
          gte: new Date(`${currentYear}-01-01`),
          lte: new Date(`${currentYear}-12-31`),
        },
      },
      select: { endDate: true, rating: true, bookId: true },
    });

    // 월별 독서량 집계
    const monthlyReading: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) monthlyReading[m] = 0;
    yearlyDone.forEach((log) => {
      if (log.endDate) {
        const month = new Date(log.endDate).getMonth() + 1;
        monthlyReading[month]++;
      }
    });

    // 평균 별점
    const avgRating = await prisma.readingLog.aggregate({
      _avg: { rating: true },
      where: { rating: { not: null } },
    });

    // 전체 도서 수
    const totalBooks = await prisma.book.count();

    res.json({
      success: true,
      data: {
        totalBooks,
        statusCounts: statusCounts.map((s) => ({ status: s.status, count: s._count.id })),
        genreCounts: genreCounts.map((g) => ({ genre: g.genre ?? '미분류', count: g._count.id })),
        monthlyReading: Object.entries(monthlyReading).map(([month, count]) => ({
          month: Number(month),
          count,
        })),
        avgRating: avgRating._avg.rating ?? 0,
        yearlyDoneCount: yearlyDone.length,
        currentYear,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '통계 조회 실패', error });
  }
};
