import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/prisma';

const SALT_ROUNDS = 10;

// ─── 회원가입 ─────────────────────────────────────────────────
export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: '이메일과 비밀번호를 입력해 주세요.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: '이미 사용 중인 이메일입니다.' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, password: hashed },
    });

    res.status(201).json({
      success: true,
      data: { id: user.id, email: user.email, createdAt: user.createdAt },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '회원가입 실패', error });
  }
};

// ─── 로그인 ───────────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim()
    ?? req.socket.remoteAddress
    ?? null;

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: '이메일과 비밀번호를 입력해 주세요.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const isValid = user ? await bcrypt.compare(password, user.password) : false;

    await prisma.loginHistory.create({
      data: { email, success: isValid, ipAddress },
    });

    if (!isValid) {
      return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    req.session.userId = user!.id;
    req.session.email = user!.email;

    res.json({
      success: true,
      data: { id: user!.id, email: user!.email },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '로그인 실패', error });
  }
};

// ─── 로그아웃 ─────────────────────────────────────────────────
export const logout = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: '로그아웃 실패' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: '로그아웃 되었습니다.' });
  });
};

// ─── 현재 로그인 사용자 조회 ──────────────────────────────────
export const me = (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }
  res.json({
    success: true,
    data: { id: req.session.userId, email: req.session.email },
  });
};
