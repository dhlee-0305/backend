import { Router } from 'express';
import {
  getBooks, getBookById, createBook, updateBook, deleteBook,
} from '../controllers/bookController';
import {
  getReadingLogs, createReadingLog, updateReadingLog, deleteReadingLog,
} from '../controllers/readingLogController';
import {
  getMemos, createMemo, updateMemo, deleteMemo,
} from '../controllers/memoController';
import { getStats } from '../controllers/statsController';
import { signup, login, logout, me } from '../controllers/authController';

const router = Router();

// ─── 도서 API ─────────────────────────────────────────────────
router.get('/books', getBooks);
router.get('/books/:id', getBookById);
router.post('/books', createBook);
router.put('/books/:id', updateBook);
router.delete('/books/:id', deleteBook);

// ─── 독서 기록 API ────────────────────────────────────────────
router.get('/books/:bookId/reading-logs', getReadingLogs);
router.post('/books/:bookId/reading-logs', createReadingLog);
router.put('/reading-logs/:id', updateReadingLog);
router.delete('/reading-logs/:id', deleteReadingLog);

// ─── 메모 & 하이라이트 API ────────────────────────────────────
router.get('/books/:bookId/memos', getMemos);
router.post('/books/:bookId/memos', createMemo);
router.put('/memos/:id', updateMemo);
router.delete('/memos/:id', deleteMemo);

// ─── 통계 API ─────────────────────────────────────────────────
router.get('/stats', getStats);

// ─── 인증 API ─────────────────────────────────────────────────
router.post('/auth/signup', signup);
router.post('/auth/login', login);
router.post('/auth/logout', logout);
router.get('/auth/me', me);

export default router;
