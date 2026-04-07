import { Router } from 'express';
import {
  getBooks, getBookById, createBook, updateBook, deleteBook,
} from '../controllers/bookController';
import {
  getReadingLog, upsertReadingLog, deleteReadingLog,
} from '../controllers/readingLogController';
import {
  getMemos, createMemo, updateMemo, deleteMemo,
} from '../controllers/memoController';
import { getStats } from '../controllers/statsController';

const router = Router();

// ─── 도서 API ─────────────────────────────────────────────────
router.get('/books', getBooks);
router.get('/books/:id', getBookById);
router.post('/books', createBook);
router.put('/books/:id', updateBook);
router.delete('/books/:id', deleteBook);

// ─── 독서 기록 API ────────────────────────────────────────────
router.get('/books/:bookId/reading-log', getReadingLog);
router.put('/books/:bookId/reading-log', upsertReadingLog);
router.delete('/books/:bookId/reading-log', deleteReadingLog);

// ─── 메모 & 하이라이트 API ────────────────────────────────────
router.get('/books/:bookId/memos', getMemos);
router.post('/books/:bookId/memos', createMemo);
router.put('/memos/:id', updateMemo);
router.delete('/memos/:id', deleteMemo);

// ─── 통계 API ─────────────────────────────────────────────────
router.get('/stats', getStats);

export default router;
