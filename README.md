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
DATABASE_URL="mysql://root:your_password@172.21.80.1:3306/book_manager"
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

## API 문서

엔드포인트 목록의 기준 문서는 [docs/spec.md](docs/spec.md)입니다.

- 도메인별 상세 Request/Response 명세는 `docs/*-api.md` 문서를 참고하세요.
- README에는 API 목록을 중복 관리하지 않습니다.

---

## 테스트

### 테스트 DB 준비

```sql
CREATE DATABASE book_manager_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### `.env.test` 설정

```env
DATABASE_URL="mysql://root:your_password@172.21.80.1:3306/book_manager_test"
SESSION_SECRET="test-secret-key"
NODE_ENV="test"
PORT=4001
```

### 테스트 DB 마이그레이션

```powershell
# PowerShell
$env:DATABASE_URL="mysql://root:your_password@172.21.80.1:3306/book_manager_test"; npx prisma migrate deploy
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
