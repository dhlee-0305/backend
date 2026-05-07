import { Request, Response } from 'express';
import prisma from '../config/prisma';

// ─── 전체 통계 조회 ───────────────────────────────────────────
export const getStats = async (req: Request, res: Response) => {
  try {
    if (!req.session.userId || !req.session.email) {
      return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }

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

    const readingLogs = await prisma.readingLog.findMany({
      where: {
        readStatus: 'READ',
        userName: req.session.email,
      },
      select: { createdAt: true },
    });

    const yearlyReading = new Map<number, number>();
    readingLogs.forEach((log) => {
      const year = log.createdAt.getFullYear();
      yearlyReading.set(year, (yearlyReading.get(year) ?? 0) + 1);
    });

    const yearlyReadingStats = Array.from(yearlyReading.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year);

    const yearlyDoneCount = yearlyReading.get(currentYear) ?? 0;

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
        yearlyReading: yearlyReadingStats,
        avgRating: avgRating._avg.rating ?? 0,
        yearlyDoneCount,
        currentYear,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '통계 조회 실패', error });
  }
};
