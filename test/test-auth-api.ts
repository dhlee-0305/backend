import request from 'supertest';
import { buildApp, cleanDb, closeDb } from './helpers';
import prisma from '../config/prisma';

const app = buildApp();

beforeEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await closeDb();
});

// ─────────────────────────────────────────────────────────────
// TC-AUTH-001: 회원가입 - 정상 등록
// ─────────────────────────────────────────────────────────────
describe('TC-AUTH-001: 회원가입 - 정상 등록', () => {
  it('HTTP 201, success:true, 비밀번호 미포함 응답', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'user@example.com', password: 'password1234' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeGreaterThan(0);
    expect(res.body.data.email).toBe('user@example.com');
    expect(res.body.data.createdAt).toBeDefined();
    expect(res.body.data.password).toBeUndefined();
  });

  it('DB에 비밀번호가 BCrypt 해시값으로 저장됨', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ email: 'user@example.com', password: 'password1234' });

    const user = await prisma.user.findUnique({ where: { email: 'user@example.com' } });
    expect(user).not.toBeNull();
    expect(user!.password).toMatch(/^\$2b\$/);
    expect(user!.password).not.toBe('password1234');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-AUTH-005: 회원가입 - 중복 이메일
// ─────────────────────────────────────────────────────────────
describe('TC-AUTH-005: 회원가입 - 중복 이메일', () => {
  it('HTTP 409, 이미 사용 중인 이메일 메시지', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ email: 'user@example.com', password: 'password1234' });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'user@example.com', password: 'otherpassword' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('이미 사용 중인 이메일입니다.');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-AUTH-006: 로그인 - 정상 로그인
// ─────────────────────────────────────────────────────────────
describe('TC-AUTH-006: 로그인 - 정상 로그인', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ email: 'user@example.com', password: 'password1234' });
  });

  it('HTTP 200, success:true, 세션 쿠키 발급', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password1234' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('user@example.com');
    expect(res.body.data.id).toBeGreaterThan(0);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('login_history에 success:true 기록', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password1234' });

    const history = await prisma.loginHistory.findFirst({
      where: { email: 'user@example.com', success: true },
    });
    expect(history).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// TC-AUTH-007: 로그인 - 존재하지 않는 이메일
// ─────────────────────────────────────────────────────────────
describe('TC-AUTH-007: 로그인 - 존재하지 않는 이메일', () => {
  it('HTTP 401, login_history에 success:false 기록', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notexist@example.com', password: 'password1234' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('이메일 또는 비밀번호가 올바르지 않습니다.');

    const history = await prisma.loginHistory.findFirst({
      where: { email: 'notexist@example.com', success: false },
    });
    expect(history).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// TC-AUTH-008: 로그인 - 비밀번호 불일치
// ─────────────────────────────────────────────────────────────
describe('TC-AUTH-008: 로그인 - 비밀번호 불일치', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ email: 'user@example.com', password: 'password1234' });
  });

  it('HTTP 401, login_history에 success:false 기록', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);

    const history = await prisma.loginHistory.findFirst({
      where: { email: 'user@example.com', success: false },
    });
    expect(history).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// TC-AUTH-011: 현재 사용자 조회 - 로그인 상태
// ─────────────────────────────────────────────────────────────
describe('TC-AUTH-011: GET /api/auth/me - 로그인 상태', () => {
  it('HTTP 200, 세션의 사용자 정보 반환', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ email: 'user@example.com', password: 'password1234' });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password1234' });

    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('user@example.com');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-AUTH-012: 현재 사용자 조회 - 비로그인 상태
// ─────────────────────────────────────────────────────────────
describe('TC-AUTH-012: GET /api/auth/me - 비로그인 상태', () => {
  it('HTTP 401, 로그인이 필요합니다 메시지', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('로그인이 필요합니다.');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-AUTH-013: 로그아웃 - 정상 처리
// ─────────────────────────────────────────────────────────────
describe('TC-AUTH-013: POST /api/auth/logout - 정상 처리', () => {
  it('HTTP 200, 로그아웃 메시지 반환', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ email: 'user@example.com', password: 'password1234' });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password1234' });

    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('로그아웃 되었습니다.');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-AUTH-014: 로그아웃 후 세션 무효화
// ─────────────────────────────────────────────────────────────
describe('TC-AUTH-014: 로그아웃 후 세션 무효화', () => {
  it('로그아웃 후 /me 호출 시 HTTP 401', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ email: 'user@example.com', password: 'password1234' });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password1234' });
    await agent.post('/api/auth/logout');

    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-AUTH-015: 통합 - 전체 인증 흐름
// ─────────────────────────────────────────────────────────────
describe('TC-AUTH-015: 통합 - 전체 인증 흐름', () => {
  it('회원가입 → 로그인 → me 조회 → 로그아웃 → me 차단', async () => {
    const agent = request.agent(app);

    const signup = await agent
      .post('/api/auth/signup')
      .send({ email: 'flow@example.com', password: 'flowpass123' });
    expect(signup.status).toBe(201);

    const login = await agent
      .post('/api/auth/login')
      .send({ email: 'flow@example.com', password: 'flowpass123' });
    expect(login.status).toBe(200);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('flow@example.com');

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(200);

    const meAfter = await agent.get('/api/auth/me');
    expect(meAfter.status).toBe(401);
  });
});
