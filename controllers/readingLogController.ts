import { Request, Response } from 'express';
import prisma from '../config/prisma';

// ─── 독서 기록 목록 조회 ──────────────────────────────────────
export const getReadingLogs = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;

    const logs = await prisma.readingLog.findMany({
      where: { bookId: Number(bookId) },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: logs, total: logs.length });
  } catch (error) {
    res.status(500).json({ success: false, message: '독서 기록 조회 실패', error });
  }
};

// ─── 독서 기록 등록 ───────────────────────────────────────────
export const createReadingLog = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    const { userName, startDate, endDate, rating, review } = req.body;

    const log = await prisma.readingLog.create({
      data: {
        bookId: Number(bookId),
        userName,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        rating,
        review,
      },
    });

    res.status(201).json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: '독서 기록 등록 실패', error });
  }
};

// ─── 독서 기록 수정 ───────────────────────────────────────────
export const updateReadingLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userName, startDate, endDate, rating, review } = req.body;

    const log = await prisma.readingLog.update({
      where: { id: Number(id) },
      data: {
        userName,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        rating,
        review,
      },
    });

    res.json({ success: true, data: log });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '독서 기록을 찾을 수 없습니다.' });
    }
    res.status(500).json({ success: false, message: '독서 기록 수정 실패', error });
  }
};

// ─── 독서 기록 삭제 ───────────────────────────────────────────
export const deleteReadingLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.readingLog.delete({ where: { id: Number(id) } });

    res.json({ success: true, message: '독서 기록이 삭제되었습니다.' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '독서 기록을 찾을 수 없습니다.' });
    }
    res.status(500).json({ success: false, message: '독서 기록 삭제 실패', error });
  }
};
