# Architecture Draft

이 문서는 현재 저장소를 기준으로 확인한 아키텍처 초안이다. "확인된 사실"은 코드, Prisma 스키마, 기존 문서에서 직접 확인한 내용이고, "추정/추가 확인 필요"는 배포 환경이나 제품 정책처럼 저장소만으로 확정할 수 없는 내용이다.

구조 설명은 이 문서를 기준으로 관리한다. 조사 과정과 미확정 질문은 [research.md](./research.md)에 남기고, 엔드포인트 목록은 [spec.md](./spec.md)의 API 문서 섹션을 기준으로 관리한다.

## 프로젝트 개요

### 확인된 사실

- 개인 도서관리 서비스의 백엔드 API이다.
- 런타임은 Node.js, 웹 프레임워크는 Express, 언어는 TypeScript이다.
- 데이터베이스는 MySQL이고 Prisma Client/Prisma Migrate를 사용한다.
- 인증은 `express-session` 기반 세션과 `bcrypt` 비밀번호 해시로 구현되어 있다.
- 주요 기능은 인증, 도서 CRUD, 독서 기록 CRUD, 메모/하이라이트 CRUD, 통계 조회이다.
- API 기본 경로는 `/api`, 헬스 체크 경로는 `/health`이다.

## 시스템 구성 요약

### 확인된 사실

요청 흐름은 다음과 같다.

```text
Client
  -> Express app (index.ts)
  -> 공통 미들웨어(cors, json/urlencoded parser, morgan, express-session)
  -> /api router (routes/index.ts)
  -> controller 함수 (controllers/*.ts)
  -> Prisma Client singleton (config/prisma.ts)
  -> MySQL
```

- `index.ts`는 앱 생성, 미들웨어 등록, `/health`, `/api`, 404/에러 핸들러 등록, `app.listen`을 담당한다.
- `routes/index.ts`는 도메인별 라우트를 컨트롤러 함수에 직접 연결한다.
- 별도의 service/repository 계층은 없고 컨트롤러가 Prisma Client를 직접 호출한다.
- `config/prisma.ts`는 `new PrismaClient()` 인스턴스를 기본 export한다.
- 공통 오류 미들웨어는 `middleware/errorHandler.ts`에 있다.

## 주요 디렉터리와 책임

### 확인된 사실

| 경로 | 책임 |
| --- | --- |
| `index.ts` | Express 앱 구성과 서버 시작 |
| `routes/` | API 라우팅 정의 |
| `controllers/` | 요청 검증 일부, 비즈니스 로직, Prisma DB 접근, 응답 생성 |
| `config/prisma.ts` | Prisma Client 인스턴스 생성 |
| `middleware/errorHandler.ts` | 404 응답과 일반 에러 응답 처리 |
| `schema.prisma` | Prisma 데이터 모델, enum, MySQL datasource, client generator 정의 |
| `migrations/` | Prisma 마이그레이션 SQL |
| `types/session.d.ts` | `express-session`의 `SessionData` 타입 확장 |
| `docs/` | 서비스/API 명세, 테스트용 SQL, 이 아키텍처 문서 |
| `test/` | Jest/Supertest 기반 API 테스트와 테스트 계획서 |
| `graphify-out/` | 코드/문서 그래프 분석 산출물로 보이는 파일들 |

### 추정/추가 확인 필요

- `graphify-out/`은 런타임에는 필요하지 않은 분석 산출물로 보이지만, 배포 산출물에서 제외되는지 여부는 별도 설정이 확인되지 않았다.

## 애플리케이션 진입점

### 확인된 사실

- 개발 실행: `npm run dev` -> `ts-node-dev --respawn --transpile-only index.ts`
- 빌드: `npm run build` -> `tsc`
- 운영 실행: `npm start` -> `node dist/index.js`
- TypeScript 출력 디렉터리는 `dist/`이고, `package.json`의 `main`도 `dist/index.js`이다.
- 기본 포트는 `process.env.PORT || 4000`이다.
- CORS origin은 `process.env.CLIENT_URL || 'http://localhost:3000'`이다.
- `.env`는 `dotenv.config()`로 로드된다.

## 주요 모듈과 의존 관계

### 확인된 사실

- `index.ts`
  - `express`, `cors`, `morgan`, `dotenv`, `express-session`에 의존한다.
  - `routes/index.ts`, `middleware/errorHandler.ts`를 등록한다.
- `routes/index.ts`
  - 모든 컨트롤러를 import하고 URL/HTTP method를 매핑한다.
  - 인증 미들웨어를 라우터 레벨에서 적용하지 않는다.
- `controllers/authController.ts`
  - `bcrypt`와 Prisma `user`, `loginHistory` 모델을 사용한다.
  - 로그인 성공 시 `req.session.userId`, `req.session.email`을 저장한다.
- `controllers/bookController.ts`
  - Prisma `book` 모델과 연관 `readingLogs`, `memos` count를 사용한다.
  - 목록 조회에서 상태, 장르, 검색어, 독서 상태, 독자명, 정렬, 페이지네이션을 처리한다.
- `controllers/readingLogController.ts`
  - Prisma `readingLog` 모델을 사용한다.
  - `bookId` 경로 파라미터로 도서별 기록을 생성/조회한다.
- `controllers/memoController.ts`
  - Prisma `memo` 모델을 사용한다.
  - `type` query/body로 `MEMO`와 `HIGHLIGHT`를 구분한다.
- `controllers/statsController.ts`
  - 세션을 직접 확인한다.
  - Prisma `book.groupBy`, `readingLog.findMany`, `readingLog.aggregate`, `book.count`를 사용해 통계를 만든다.
- `middleware/errorHandler.ts`
  - 라우트 미매칭은 JSON 404로 처리한다.
  - 에러 핸들러는 스택을 콘솔에 출력하고 JSON 500을 반환한다.

## 데이터 모델 또는 데이터 흐름 요약

### 확인된 사실

Prisma 모델은 다음과 같다.

| 모델 | 주요 필드 | 관계/제약 |
| --- | --- | --- |
| `User` | `id`, `email`, `password`, `createdAt` | `email` unique, DB 테이블명 `users` |
| `LoginHistory` | `id`, `email`, `success`, `ipAddress`, `attemptAt` | 로그인 시도 기록, DB 테이블명 `login_history` |
| `Book` | `title`, `author`, `publisher`, `isbn`, `genre`, `coverUrl`, `purchaseDate`, `status` | `isbn` unique, `ReadingLog[]`, `Memo[]`, DB 테이블명 `books` |
| `ReadingLog` | `bookId`, `userName`, `readStatus`, `rating`, `review` | `Book`과 N:1, `onDelete: Cascade`, DB 테이블명 `reading_logs` |
| `Memo` | `bookId`, `page`, `content`, `type` | `Book`과 N:1, `onDelete: Cascade`, DB 테이블명 `memos` |

Enum은 다음과 같다.

- `BookStatus`: `OWNED`, `SOLD`, `DONATED`
- `ReadStatus`: `READ`, `EXCLUDED`
- `MemoType`: `MEMO`, `HIGHLIGHT`

주요 데이터 흐름:

- 회원가입: request body email/password -> 중복 이메일 확인 -> bcrypt hash -> `users` insert -> 비밀번호 제외 응답
- 로그인: email/password -> 사용자 조회 -> bcrypt compare -> 성공/실패와 IP를 `login_history`에 기록 -> 성공 시 세션에 user id/email 저장
- 도서 목록: query parameter -> Prisma `where/orderBy/skip/take` 구성 -> 도서, 독서 기록 요약, 메모 수, total 반환
- 도서 상세: `books.id` -> 도서, 전체 독서 기록, 최신순 메모 반환
- 독서 기록/메모: `bookId` 또는 항목 `id` -> Prisma create/update/delete/findMany
- 통계: 세션 사용자 확인 -> 전체 도서 집계 + 전체 평균 별점 + 로그인 사용자 이메일과 `readingLogs.userName`이 일치하는 `READ` 기록의 연도별 집계

### 추정/추가 확인 필요

- `ReadingLog.userName`은 이름처럼 보이지만 통계에서는 로그인 사용자의 email과 비교한다. 프론트엔드 또는 운영 데이터에서 이 필드에 이메일을 저장하는 정책인지 확인이 필요하다.
- 별점 범위는 문서상 `0.0 ~ 5.0`이나 Prisma/컨트롤러 레벨에서 범위 검증은 확인되지 않았다.

## 외부 시스템 연동 지점

### 확인된 사실

- MySQL: `DATABASE_URL` 환경변수로 Prisma datasource가 연결한다.
- 프론트엔드/브라우저 클라이언트: CORS `CLIENT_URL` origin과 credentials를 허용한다.
- 세션 쿠키: `express-session`이 기본 쿠키명 `connect.sid`를 사용한다.
- bcrypt: 비밀번호 해시와 검증에 사용한다.
- morgan: HTTP 요청 로그를 stdout에 출력한다.

### 추정/추가 확인 필요

- 현재 코드에서 외부 도서 검색 API, 파일 스토리지, 이메일 발송, OAuth 같은 외부 서비스 연동은 확인되지 않았다.
- `express-session`의 store 설정이 없으므로 기본 MemoryStore를 사용하는 것으로 보인다. 운영 환경에서는 별도 세션 저장소가 필요한지 확인해야 한다.

## 인증, 권한, 보안 고려사항

### 확인된 사실

- 비밀번호는 `bcrypt.hash(password, 10)`으로 저장한다.
- 로그인 성공 시 세션에 `userId`, `email`을 저장한다.
- `GET /api/auth/me`와 `GET /api/stats`는 컨트롤러 내부에서 `req.session.userId` 존재 여부를 확인한다.
- 도서, 독서 기록, 메모 API에는 라우터/미들웨어/컨트롤러 수준의 로그인 필수 검사가 없다.
- 세션 쿠키 옵션:
  - `httpOnly: true`
  - `secure: process.env.NODE_ENV === 'production'`
  - `maxAge: 24시간`
- CORS는 credentials를 허용하며 origin은 `CLIENT_URL` 또는 localhost 기본값이다.
- 로그인 시도는 성공/실패와 IP를 `login_history`에 기록한다. IP는 `x-forwarded-for` 첫 값 또는 socket remote address를 사용한다.

### 리스크/추가 확인 필요

- `SESSION_SECRET` 미설정 시 `changeme` 기본값을 사용한다. 운영에서는 강한 secret을 필수로 주입해야 한다.
- 세션 store가 명시되지 않아 운영에서 프로세스 재시작 시 세션 유실, 다중 인스턴스 세션 불일치, MemoryStore 사용 문제가 발생할 수 있다.
- 생성/수정/삭제 API에 인증/권한 검사가 없다. 의도적으로 공개 API인지, 로그인 사용자만 쓰는 API인지 확인이 필요하다.
- 사용자별 데이터 소유권 모델이 없다. `Book`, `ReadingLog`, `Memo`가 `User`와 직접 연결되지 않아 사용자별 격리가 구현되어 있지 않다.
- 입력값 검증은 필수 필드 일부와 Prisma 제약에 주로 의존한다. enum, 날짜, 정렬 컬럼, 페이지네이션 값, 별점 범위 검증 강화가 필요할 수 있다.
- 오류 응답에 원본 `error` 객체를 포함하는 컨트롤러가 있다. 운영에서 내부 정보 노출 가능성을 검토해야 한다.
- `x-forwarded-for`를 신뢰하려면 프록시 설정과 Express `trust proxy` 정책 확인이 필요하다.

## 배포와 운영 관점의 구조적 고려사항

### 확인된 사실

- 빌드 산출물은 `dist/`이다.
- 운영 시작 명령은 `node dist/index.js`이다.
- Prisma client generator의 `binaryTargets`는 `native`, `windows`, `debian-openssl-3.0.x`를 포함한다.
- DB 마이그레이션은 `prisma migrate dev` 스크립트가 있고, README의 테스트 DB 적용 예시는 `npx prisma migrate deploy`를 사용한다.
- 테스트는 `jest --runInBand`로 순차 실행한다.
- 테스트는 실제 DB를 사용하며 `.env.test`를 로드하고 `cleanDb()`로 주요 테이블을 초기화한다.

### 추정/추가 확인 필요

- 운영 배포 시에는 일반적으로 `npm run build`, `prisma generate`, `prisma migrate deploy`, `npm start` 순서가 필요할 것으로 보이지만 배포 파이프라인 파일은 확인되지 않았다.
- Dockerfile, docker-compose, CI 설정은 저장소 루트에서 확인되지 않았다.
- 헬스 체크는 DB 연결 확인 없이 프로세스 상태와 timestamp만 반환한다.
- graceful shutdown에서 Prisma `$disconnect()`를 호출하는 운영 코드가 확인되지 않았다.
- 로그는 morgan stdout과 `console.error` 중심이다. 구조화 로그, 요청 ID, 에러 수집 연동은 확인되지 않았다.

## 알려진 제약, 리스크, 추가 확인 필요 항목

### 확인된 사실

- 서비스 계층 없이 컨트롤러가 Prisma를 직접 호출하므로 작은 코드베이스에는 단순하지만, 도메인 로직이 커질 경우 컨트롤러 비대화 가능성이 있다.
- `tsconfig.json`의 `strict`는 `false`이다.
- 통계의 연도별 독서량은 `ReadingLog.createdAt` 기준이다.
- `avgRating`은 로그인 사용자 기준이 아니라 전체 독서 기록의 평균 별점이다.
- `Book` 삭제 시 연결된 `ReadingLog`, `Memo`는 cascade 삭제된다.
- 최초 마이그레이션에는 `reading_logs.bookId` unique가 있었으나 이후 마이그레이션에서 제거되어 현재 스키마는 도서 1권에 독서 기록 N개를 허용한다.

### 추가 확인 필요

- API 쓰기 작업의 인증/권한 정책: 현재 공개 동작이 의도인지 확인해야 한다.
- 사용자별 도서 소유 모델 필요 여부: 현재 `Book`은 `User`와 관계가 없다.
- 세션 저장소 운영 전략: Redis/MySQL 등 외부 store 도입 여부.
- 운영 환경변수 필수 목록과 secret 관리 방식.
- `ReadingLog.userName`의 의미: 표시용 이름인지, 사용자 email 식별자인지 정리 필요.
- 입력 검증/에러 응답 표준화: 현재 컨트롤러별 처리 방식이 조금씩 다르다.
- 정렬 컬럼(`sortBy`) allowlist 필요 여부: 현재 query 값을 Prisma `orderBy` 키로 직접 사용한다.
- 배포 산출물에서 `docs/`, `test/`, `graphify-out/`을 포함할지 여부.
