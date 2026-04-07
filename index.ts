import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import router from './routes';
import { notFound, errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ─── 미들웨어 ─────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ─── 헬스 체크 ───────────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API 라우터 ───────────────────────────────────────────────
app.use('/api', router);

// ─── 에러 핸들러 ──────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── 서버 시작 ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 서버 실행 중: http://localhost:${PORT}`);
  console.log(`📖 API 기본 경로: http://localhost:${PORT}/api`);
  console.log(`🩺 헬스 체크: http://localhost:${PORT}/health\n`);
});

export default app;
