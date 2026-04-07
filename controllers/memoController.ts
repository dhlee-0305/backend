import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { MemoType } from '@prisma/client';

// ─── 메모 목록 조회 ───────────────────────────────────────────
export const getMemos = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    const { type } = req.query;

    const memos = await prisma.memo.findMany({
      where: {
        bookId: Number(bookId),
        ...(type ? { type: type as MemoType } : {}),
      },
      orderBy: [{ page: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ success: true, data: memos, total: memos.length });
  } catch (error) {
    res.status(500).json({ success: false, message: '메모 조회 실패', error });
  }
};

// ─── 메모 등록 ────────────────────────────────────────────────
export const createMemo = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    const { page, content, type } = req.body;

    const memo = await prisma.memo.create({
      data: {
        bookId: Number(bookId),
        page,
        content,
        type: type ?? 'MEMO',
      },
    });

    res.status(201).json({ success: true, data: memo });
  } catch (error) {
    res.status(500).json({ success: false, message: '메모 등록 실패', error });
  }
};

// ─── 메모 수정 ────────────────────────────────────────────────
export const updateMemo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page, content, type } = req.body;

    const memo = await prisma.memo.update({
      where: { id: Number(id) },
      data: { page, content, type },
    });

    res.json({ success: true, data: memo });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '메모를 찾을 수 없습니다.' });
    }
    res.status(500).json({ success: false, message: '메모 수정 실패', error });
  }
};

// ─── 메모 삭제 ────────────────────────────────────────────────
export const deleteMemo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.memo.delete({ where: { id: Number(id) } });

    res.json({ success: true, message: '메모가 삭제되었습니다.' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '메모를 찾을 수 없습니다.' });
    }
    res.status(500).json({ success: false, message: '메모 삭제 실패', error });
  }
};
