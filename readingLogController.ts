import { Request, Response } from 'express';
import prisma from '../config/prisma';

// ─── 독서 기록 조회 ───────────────────────────────────────────
export const getReadingLog = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;

    const log = await prisma.readingLog.findUnique({
      where: { bookId: Number(bookId) },
    });

    if (!log) {
      return res.status(404).json({ success: false, message: '독서 기록이 없습니다.' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: '독서 기록 조회 실패', error });
  }
};

// ─── 독서 기록 생성/수정 (upsert) ────────────────────────────
export const upsertReadingLog = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    const { startDate, endDate, rating, review } = req.body;

    const log = await prisma.readingLog.upsert({
      where: { bookId: Number(bookId) },
      update: {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        rating,
        review,
      },
      create: {
        bookId: Number(bookId),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        rating,
        review,
      },
    });

    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: '독서 기록 저장 실패', error });
  }
};

// ─── 독서 기록 삭제 ───────────────────────────────────────────
export const deleteReadingLog = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;

    await prisma.readingLog.delete({ where: { bookId: Number(bookId) } });

    res.json({ success: true, message: '독서 기록이 삭제되었습니다.' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '독서 기록을 찾을 수 없습니다.' });
    }
    res.status(500).json({ success: false, message: '독서 기록 삭제 실패', error });
  }
};
