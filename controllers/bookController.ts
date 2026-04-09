import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { BookStatus, ReadStatus } from '@prisma/client';

// ─── 도서 목록 조회 ───────────────────────────────────────────
export const getBooks = async (req: Request, res: Response) => {
  try {
    const { status, genre, search, readStatus, sortBy = 'createdAt', order = 'desc' } = req.query;

    const where: any = {};

    if (status) where.status = status as BookStatus;
    if (genre) where.genre = genre as string;
    if (readStatus) where.readingLogs = { some: { readStatus: readStatus as ReadStatus } };
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { author: { contains: search as string } },
        { isbn: { contains: search as string } },
      ];
    }

    const books = await prisma.book.findMany({
      where,
      include: {
        readingLogs: { select: { readStatus: true, rating: true, startDate: true, endDate: true, userName: true } },
        _count: { select: { memos: true } },
      },
      orderBy: { [sortBy as string]: order },
    });

    res.json({ success: true, data: books, total: books.length });
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
