import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { BookStatus, ReadStatus } from '@prisma/client';

// ─── 도서 목록 조회 ───────────────────────────────────────────
export const getBooks = async (req: Request, res: Response) => {
  try {
    const { status, genre, search, readStatus, userName, sortBy = 'createdAt', order = 'desc', page = '1', limit = '10' } = req.query;

    const where: any = {};

    if (status) where.status = status as BookStatus;
    if (genre) where.genre = genre as string;
    if (readStatus === 'NONE') {
      const logFilter: any = {};
      if (userName) logFilter.userName = userName as string;
      where.readingLogs = { none: logFilter };
    } else if (readStatus || userName) {
      const logFilter: any = {};
      if (readStatus) logFilter.readStatus = readStatus as ReadStatus;
      if (userName) logFilter.userName = userName as string;
      where.readingLogs = { some: logFilter };
    }
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { author: { contains: search as string } },
        { isbn: { contains: search as string } },
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          readingLogs: { select: { readStatus: true, rating: true, startDate: true, endDate: true, userName: true } },
          _count: { select: { memos: true } },
        },
        orderBy: { [sortBy as string]: order },
        skip,
        take: limitNum,
      }),
      prisma.book.count({ where }),
    ]);

    res.json({ success: true, data: books, total, page: pageNum, limit: limitNum });
  } catch (error) {
    res.status(500).json({ success: false, message: '도서 목록 조회 실패', error });
  }
};

// ─── 도서 단건 조회 ───────────────────────────────────────────
export const getBookById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const book = await prisma.book.findUnique({
      where: { id: Number(id) },
      include: {
        readingLogs: true,
        memos: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!book) {
      return res.status(404).json({ success: false, message: '도서를 찾을 수 없습니다.' });
    }

    res.json({ success: true, data: book });
  } catch (error) {
    res.status(500).json({ success: false, message: '도서 조회 실패', error });
  }
};

// ─── 도서 등록 ────────────────────────────────────────────────
export const createBook = async (req: Request, res: Response) => {
  try {
    const { title, author, publisher, isbn, genre, coverUrl, purchaseDate, status } = req.body;

    const book = await prisma.book.create({
      data: {
        title,
        author,
        publisher,
        isbn,
        genre,
        coverUrl,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        status: status ?? 'OWNED',
      },
    });

    res.status(201).json({ success: true, data: book });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: '이미 등록된 ISBN입니다.' });
    }
    res.status(500).json({ success: false, message: '도서 등록 실패', error });
  }
};

// ─── 도서 수정 ────────────────────────────────────────────────
export const updateBook = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, author, publisher, isbn, genre, coverUrl, purchaseDate, status } = req.body;

    const book = await prisma.book.update({
      where: { id: Number(id) },
      data: {
        title,
        author,
        publisher,
        isbn,
        genre,
        coverUrl,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        status,
      },
    });

    res.json({ success: true, data: book });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '도서를 찾을 수 없습니다.' });
    }
    res.status(500).json({ success: false, message: '도서 수정 실패', error });
  }
};

// ─── 도서 삭제 ────────────────────────────────────────────────
export const deleteBook = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.book.delete({ where: { id: Number(id) } });

    res.json({ success: true, message: '도서가 삭제되었습니다.' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '도서를 찾을 수 없습니다.' });
    }
    res.status(500).json({ success: false, message: '도서 삭제 실패', error });
  }
};
