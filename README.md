# 도서관리 서비스 - Backend

## 기술 스택

| 항목 | 내용 |
|------|------|
| Runtime | Node.js + Express |
| Language | TypeScript |
| Database | MySQL |
| ORM | Prisma |
| 인증 | express-session + bcrypt |
| 테스트 | Jest + Supertest + ts-jest |

---

## 프로젝트 구조

```
bookbackend/
├── config/
│   └── prisma.ts               # Prisma 클라이언트
├── controllers/
│   ├── authController.ts       # 회원가입 / 로그인 / 로그아웃 / 현재 사용자 조회
│   ├── bookController.ts       # 도서 CRUD
│   ├── readingLogController.ts # 독서 기록
│   ├── memoController.ts       # 메모 & 하이라이트
│   └── statsController.ts      # 통계
├── docs/
│   ├── spec.md                 # 서비스 개발 명세서
│   ├── auth-api.md             # 인증 API 명세
│   ├── books-api.md            # 도서 API 명세
│   ├── reading-logs-api.md     # 독서 기록 API 명세
│   ├── memos-api.md            # 메모 API 명세
│   └── stats-api.md            # 통계 API 명세
├── middleware/
│   └── errorHandler.ts         # 에러 핸들러
├── migrations/                 # Prisma 마이그레이션 파일
├── routes/
│   └── index.ts                # API 라우터
├── test/
│   ├── helpers.ts              # 테스트 공통 헬퍼 (buildApp, cleanDb, closeDb)
│   ├── test-auth-api.ts        # 인증 API 테스트
│   ├── test-book-api.ts        # 도서 API 테스트
│   ├── test-reading-log-api.ts # 독서 기록 API 테스트
│   ├── test-memo-api.ts        # 메모 API 테스트
│   ├── test-stats-api.ts       # 통계 API 테스트
│   ├── testplan-overview.md    # 테스트 계획 개요
│   ├── testplan-auth-api.md    # 인증 테스트 계획서
│   ├── testplan-book-api.md    # 도서 테스트 계획서
│   ├── testplan-reading-log-api.md
│   ├── testplan-memo-api.md
│   └── testplan-stats-api.md
├── types/
│   └── session.d.ts            # express-session 타입 확장
├── .env                        # 운영 환경변수 (git 제외)
├── .env.test                   # 테스트 환경변수 (git 제외)
├── index.ts                    # 서버 진입점
├── jest.config.ts              # Jest 설정
└── schema.prisma               # DB 스키마
```

---

## 시작하기

### 1. MySQL 데이터베이스 생성

```sql
CREATE DATABASE book_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 환경변수 설정 (`.env`)

```env
DATABASE_URL="mysql://root:your_password@localhost:3306/book_manager"
SESSION_SECRET="your_secret_key_here"
PORT=4000
CLIENT_URL=http://localhost:3000
```

### 3. 패키지 설치

```bash
npm install
```

### 4. Prisma 마이그레이션 (DB 테이블 생성)

```bash
npm run prisma:migrate
```

### 5. 서버 실행

```bash
npm run dev
```

서버 기본 포트: `http://localhost:4000`  
API 기본 경로: `http://localhost:4000/api`  
헬스 체크: `http://localhost:4000/health`

---

## API 엔드포인트 요약

| 도메인 | Method | URL | 설명 |
|--------|--------|-----|------|
| 인증 | POST | `/api/auth/signup` | 회원가입 |
| 인증 | POST | `/api/auth/login` | 로그인 |
| 인증 | POST | `/api/auth/logout` | 로그아웃 |
| 인증 | GET | `/api/auth/me` | 현재 사용자 조회 |
| 도서 | GET | `/api/books` | 도서 목록 조회 (필터·검색·정렬·페이지네이션) |
| 도서 | GET | `/api/books/:id` | 도서 상세 조회 |
| 도서 | POST | `/api/books` | 도서 등록 |
| 도서 | PUT | `/api/books/:id` | 도서 수정 |
| 도서 | DELETE | `/api/books/:id` | 도서 삭제 |
| 독서 기록 | GET | `/api/books/:bookId/reading-logs` | 독서 기록 목록 |
| 독서 기록 | POST | `/api/books/:bookId/reading-logs` | 독서 기록 등록 |
| 독서 기록 | PUT | `/api/reading-logs/:id` | 독서 기록 수정 |
| 독서 기록 | DELETE | `/api/reading-logs/:id` | 독서 기록 삭제 |
| 메모 | GET | `/api/books/:bookId/memos` | 메모 목록 조회 |
| 메모 | POST | `/api/books/:bookId/memos` | 메모 등록 |
| 메모 | PUT | `/api/memos/:id` | 메모 수정 |
| 메모 | DELETE | `/api/memos/:id` | 메모 삭제 |
| 통계 | GET | `/api/stats` | 전체 통계 조회 |

> 상세 Request/Response 명세는 [docs/spec.md](docs/spec.md)를 참고하세요.

---

## 테스트

### 테스트 DB 준비

```sql
CREATE DATABASE book_manager_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### `.env.test` 설정

```env
DATABASE_URL="mysql://root:your_password@localhost:3306/book_manager_test"
SESSION_SECRET="test-secret-key"
NODE_ENV="test"
PORT=4001
```

### 테스트 DB 마이그레이션

```powershell
# PowerShell
$env:DATABASE_URL="mysql://root:your_password@localhost:3306/book_manager_test"; npx prisma migrate deploy
```

### 테스트 실행

```bash
npm test                    # 전체 실행
npm run test:auth           # 인증 API
npm run test:book           # 도서 API
npm run test:reading-log    # 독서 기록 API
npm run test:memo           # 메모 API
npm run test:stats          # 통계 API
```

> 테스트는 매 실행 전 테스트 DB를 초기화합니다. **운영 DB와 반드시 분리된 DB를 사용하세요.**  
> 전체 테스트 계획서는 [test/testplan-overview.md](test/testplan-overview.md)를 참고하세요.
