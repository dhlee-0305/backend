import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

import express from 'express';
import session from 'express-session';
import cors from 'cors';
import router from '../routes';
import { notFound, errorHandler } from '../middleware/errorHandler';
import prisma from '../config/prisma';

export function buildApp() {
  const app = express();
  app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(session({
    secret: process.env.SESSION_SECRET || 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false, maxAge: 1000 * 60 * 60 * 24 },
  }));
  app.use('/api', router);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

// 테스트 종료 시 Prisma 연결 해제
export async function closeDb() {
  await prisma.$disconnect();
}

function assertSafeTestDatabase() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('cleanDb() can only run when NODE_ENV is "test".');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('cleanDb() requires DATABASE_URL.');
  }

  let databaseName: string;
  try {
    databaseName = new URL(databaseUrl).pathname.replace(/^\//, '');
  } catch {
    throw new Error('cleanDb() requires a valid DATABASE_URL.');
  }

  if (!databaseName.toLowerCase().includes('test')) {
    throw new Error(`cleanDb() refused to run against non-test database: ${databaseName}`);
  }
}

// 테스트 DB 전체 초기화 (테이블 의존 순서 고려)
export async function cleanDb() {
  assertSafeTestDatabase();

  await prisma.memo.deleteMany();
  await prisma.readingLog.deleteMany();
  await prisma.book.deleteMany();
  await prisma.loginHistory.deleteMany();
  await prisma.user.deleteMany();
}
