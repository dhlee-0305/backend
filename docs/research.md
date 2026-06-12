# Research Draft

이 문서는 현재 저장소의 서비스 코드와 문서를 조사한 초안이다. 민감정보와 운영 데이터는 포함하지 않으며, 환경변수는 이름만 언급한다.

## 조사 목표와 범위

### 확인한 사실

- 목표: 개인 도서관리 백엔드의 현재 구조, 동작 흐름, 데이터 모델, API, 운영/테스트 리스크를 파악한다.
- 범위: 문서, 설정, Express 진입점, 라우터, 컨트롤러, Prisma 스키마, 테스트 헬퍼를 조사했다.
- 확인한 주요 파일:
  - `README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/spec.md`
  - `docs/auth-api.md`
  - `docs/books-api.md`
  - `docs/reading-logs-api.md`
  - `docs/memos-api.md`
  - `docs/stats-api.md`
  - `package.json`
  - `tsconfig.json`
  - `jest.config.ts`
  - `index.ts`
  - `routes/index.ts`
  - `controllers/*.ts`
  - `schema.prisma`
  - `config/prisma.ts`
  - `middleware/errorHandler.ts`
  - `types/session.d.ts`
  - `test/helpers.ts`

### 확인되지 않은 항목

- ADR 파일은 저장소 루트와 `docs/` 하위의 일반적인 파일 탐색에서 확인되지 않았다.
- CI/CD, Docker, 운영 배포 파이프라인 설정 파일은 확인되지 않았다.

## 확인한 문서와 코드 근거

### 문서 근거

- `README.md`: 기술 스택, 프로젝트 구조, 실행 방법, API 목록, 테스트 방법을 설명한다.
- `docs/ARCHITECTURE.md`: 현재 요청 흐름, 모듈 책임, 데이터 모델, 인증/운영 리스크를 정리한 아키텍처 초안이다.
- `docs/spec.md`: 서비스 개요, 도메인 관계, enum, 핵심 기능과 비즈니스 규칙을 설명한다.
- `docs/auth-api.md`: 인증 API의 요청/응답, 세션 쿠키, 로그인 시도 기록을 설명한다.
- `docs/books-api.md`: 도서 목록/상세/CRUD, 필터, 검색, 정렬, 페이지네이션을 설명한다.
- `docs/reading-logs-api.md`: 독서 기록 CRUD, 재독 기록, cascade 삭제를 설명한다.
- `docs/memos-api.md`: 메모/하이라이트 CRUD와 정렬 방식을 설명한다.
- `docs/stats-api.md`: 통계 응답 필드와 세션 필요 조건을 설명한다.

### 코드 근거

- `index.ts`: Express 앱, CORS, body parser, morgan, session, `/health`, `/api`, 에러 핸들러, 서버 listen을 구성한다.
- `routes/index.ts`: 도서, 독서 기록, 메모, 통계, 인증 라우트를 컨트롤러에 직접 매핑한다.
- `controllers/authController.ts`: 회원가입, 로그인, 로그아웃, 현재 사용자 조회를 구현한다.
- `controllers/bookController.ts`: 도서 목록/상세/생성/수정/삭제를 구현한다.
- `controllers/readingLogController.ts`: 독서 기록 목록/생성/수정/삭제를 구현한다.
- `controllers/memoController.ts`: 메모 목록/생성/수정/삭제를 구현한다.
- `controllers/statsController.ts`: 세션 확인 후 도서/독서 기록 통계를 계산한다.
- `schema.prisma`: MySQL datasource, Prisma client generator, `User`, `LoginHistory`, `Book`, `ReadingLog`, `Memo` 모델과 enum을 정의한다.
- `test/helpers.ts`: 테스트용 Express 앱 구성, 테스트 DB 초기화, Prisma 연결 해제를 제공한다.

## 현재 서비스 구조 요약

### 확인한 사실

서비스는 단일 Express 애플리케이션이다. 요청 흐름은 다음과 같다.

```text
Client
  -> index.ts
  -> 공통 미들웨어
  -> routes/index.ts
  -> controllers/*.ts
  -> config/prisma.ts
  -> MySQL
```

- 별도 service/repository 계층은 확인되지 않는다. 컨트롤러가 Prisma Client를 직접 호출한다.
- 공통 라우트 prefix는 `/api`이다.
- `/health`는 DB 연결 확인 없이 상태와 timestamp만 반환한다.
- 공통 응답은 대체로 `{ success, data }`, 목록에서는 `{ success, data, total }`, 실패에서는 `{ success: false, message }` 형식을 따른다.

## 관련 사용자 흐름 또는 시스템 흐름

### 인증 흐름

확인한 근거: `controllers/authController.ts`, `docs/auth-api.md`, `schema.prisma`

1. 회원가입은 email/password를 받는다.
2. `users.email` 중복 여부를 Prisma로 확인한다.
3. 비밀번호를 bcrypt salt rounds 10으로 해시한다.
4. `users` 테이블에 사용자를 생성하고 비밀번호를 제외한 사용자 정보를 응답한다.
5. 로그인은 사용자 조회와 bcrypt 비교를 수행한다.
6. 로그인 성공/실패와 IP를 `login_history`에 기록한다.
7. 성공 시 세션에 `userId`, `email`을 저장한다.
8. `/api/auth/me`는 세션의 `userId`를 확인한다.

### 도서 관리 흐름

확인한 근거: `controllers/bookController.ts`, `docs/books-api.md`, `schema.prisma`

- 목록 조회는 `status`, `genre`, `search`, `readStatus`, `userName`, `sortBy`, `order`, `page`, `limit` query를 사용해 Prisma `where`, `orderBy`, `skip`, `take`를 구성한다.
- `search`는 제목, 저자, ISBN의 부분 일치 조건으로 적용된다.
- `readStatus=NONE`은 조건에 맞는 독서 기록이 없는 도서를 찾는 `readingLogs.none` 조건으로 구현되어 있다.
- 상세 조회는 도서와 전체 독서 기록, 메모를 함께 반환한다.
- 도서 삭제 시 Prisma relation의 cascade 설정에 따라 연결된 독서 기록과 메모도 삭제된다.

### 독서 기록 흐름

확인한 근거: `controllers/readingLogController.ts`, `docs/reading-logs-api.md`, `schema.prisma`

- 도서별 독서 기록은 `/api/books/:bookId/reading-logs`에서 조회/생성한다.
- 수정/삭제는 `/api/reading-logs/:id` 기준이다.
- 한 도서에 여러 독서 기록을 연결할 수 있다.
- 독서 기록 생성/수정은 `userName`, `readStatus`, `rating`, `review` 필드를 처리한다.

### 메모/하이라이트 흐름

확인한 근거: `controllers/memoController.ts`, `docs/memos-api.md`, `schema.prisma`

- 도서별 메모는 `/api/books/:bookId/memos`에서 조회/생성한다.
- `type` query로 `MEMO` 또는 `HIGHLIGHT` 필터를 적용할 수 있다.
- 목록 정렬은 `page asc`, `createdAt desc` 순서이다.

### 통계 흐름

확인한 근거: `controllers/statsController.ts`, `docs/stats-api.md`

- `/api/stats`는 세션의 `userId`와 `email`이 없으면 401을 반환한다.
- 전체 도서 수는 `book.count()`로 계산한다.
- 상태별/장르별 도서 수는 `book.groupBy()`로 계산한다.
- 연도별 완독 수는 `readStatus = READ`이고 `userName = session.email`인 `reading_logs`를 조회한 뒤, 애플리케이션 메모리에서 `createdAt` 연도별로 집계한다.
- 평균 별점은 로그인 사용자 기준이 아니라 전체 `reading_logs`의 non-null rating 평균이다.

## 주요 모듈, API, 데이터 모델, 외부 연동 관계

### 주요 모듈

| 모듈 | 책임 | 근거 |
| --- | --- | --- |
| `index.ts` | 앱 구성, 미들웨어, 헬스 체크, 라우터 등록, 서버 시작 | `index.ts` |
| `routes/index.ts` | API 엔드포인트와 컨트롤러 매핑 | `routes/index.ts` |
| `controllers/authController.ts` | 인증/세션/로그인 이력 | `controllers/authController.ts` |
| `controllers/bookController.ts` | 도서 조회와 CRUD | `controllers/bookController.ts` |
| `controllers/readingLogController.ts` | 독서 기록 CRUD | `controllers/readingLogController.ts` |
| `controllers/memoController.ts` | 메모/하이라이트 CRUD | `controllers/memoController.ts` |
| `controllers/statsController.ts` | 통계 조회 | `controllers/statsController.ts` |
| `config/prisma.ts` | Prisma Client singleton | `config/prisma.ts` |
| `middleware/errorHandler.ts` | 404와 공통 500 처리 | `middleware/errorHandler.ts` |

### 주요 API

확인한 근거: `routes/index.ts`, `README.md`, `docs/*-api.md`

- 인증: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- 도서: `GET /api/books`, `GET /api/books/:id`, `POST /api/books`, `PUT /api/books/:id`, `DELETE /api/books/:id`
- 독서 기록: `GET /api/books/:bookId/reading-logs`, `POST /api/books/:bookId/reading-logs`, `PUT /api/reading-logs/:id`, `DELETE /api/reading-logs/:id`
- 메모: `GET /api/books/:bookId/memos`, `POST /api/books/:bookId/memos`, `PUT /api/memos/:id`, `DELETE /api/memos/:id`
- 통계: `GET /api/stats`

### 데이터 모델

확인한 근거: `schema.prisma`, `docs/spec.md`

- `User`: email/password 기반 인증 사용자. `email`은 unique이다.
- `LoginHistory`: 로그인 시도 email, 성공 여부, IP, 시각을 저장한다.
- `Book`: 도서의 제목, 저자, 출판사, ISBN, 장르, 표지 URL, 구입일, 상태를 저장한다. `isbn`은 unique이다.
- `ReadingLog`: 도서별 독자명, 읽기 상태, 시작/종료일, 별점, 리뷰를 저장한다.
- `Memo`: 도서별 페이지, 내용, 메모 유형을 저장한다.
- `Book`과 `ReadingLog`, `Book`과 `Memo`는 1:N 관계이며 `Book` 삭제 시 cascade 삭제된다.

### 외부 연동

확인한 근거: `package.json`, `index.ts`, `schema.prisma`, `controllers/authController.ts`

- MySQL: Prisma datasource가 `DATABASE_URL` 환경변수로 연결한다.
- 브라우저/프론트엔드: CORS origin은 `CLIENT_URL` 환경변수 또는 기본 localhost 설정을 사용하고 credentials를 허용한다.
- 세션 쿠키: `express-session`을 사용한다.
- 비밀번호 해시: `bcrypt`를 사용한다.
- 요청 로그: `morgan`을 사용한다.

## 현재 동작 방식과 제약 조건

### 확인한 사실

- 세션 secret은 `SESSION_SECRET` 환경변수를 사용하며, 코드에는 fallback 값이 있다. 근거: `index.ts`
- 세션 쿠키는 `httpOnly`, 운영 환경에서만 `secure`, 24시간 maxAge를 사용한다. 근거: `index.ts`
- 인증이 필요한 것으로 구현된 API는 `/api/auth/me`, `/api/stats`이다. 근거: `controllers/authController.ts`, `controllers/statsController.ts`
- 도서, 독서 기록, 메모의 조회/생성/수정/삭제는 세션 검사를 하지 않는다. 근거: `routes/index.ts`, 각 컨트롤러
- `Book`, `ReadingLog`, `Memo`에는 `User` foreign key가 없다. 근거: `schema.prisma`
- `ReadingLog.userName`은 통계에서 로그인 사용자의 email과 비교된다. 근거: `controllers/statsController.ts`
- `statsController`는 연도별 완독 집계를 DB groupBy가 아니라 `findMany()` 결과를 메모리에서 집계한다. 근거: `controllers/statsController.ts`
- TypeScript `strict`는 꺼져 있다. 근거: `tsconfig.json`
- 테스트는 Jest/ts-jest/Supertest 기반이며 `--runInBand`로 실행된다. 근거: `package.json`, `jest.config.ts`

### 문서상 의도와 구현 차이

- `docs/spec.md`에는 통계 대시보드 항목으로 월별 독서량, 연간 목표/달성률 등이 언급되지만, 현재 `controllers/statsController.ts`는 전체 도서 수, 상태/장르별 도서 수, 연도별 완독 수, 평균 별점, 올해 완독 수를 반환한다.
- `schema.prisma`의 `ReadingLog` 주석은 "1도서 : 1기록"으로 되어 있지만, 실제 relation과 문서/마이그레이션/컨트롤러 흐름은 1:N 재독 기록을 허용한다.

## 변경 또는 구현 시 주의해야 할 리스크

### 확인한 사실 기반 리스크

- 쓰기 API 인증 부재: 도서/독서 기록/메모 쓰기 라우트에 세션 검사가 없다. 근거: `routes/index.ts`, `controllers/bookController.ts`, `controllers/readingLogController.ts`, `controllers/memoController.ts`
- 사용자별 데이터 격리 부재: 도서와 사용자 간 relation이 없다. 사용자별 소유권을 도입하려면 스키마, API, 테스트, 기존 데이터 마이그레이션이 함께 바뀐다. 근거: `schema.prisma`
- 정렬 파라미터 위험: `sortBy` query가 allowlist 없이 Prisma `orderBy` key로 들어간다. 근거: `controllers/bookController.ts`
- 입력 검증 부족: 날짜, enum, 별점 범위, 페이지네이션 값, 필수 도서 필드 검증이 대부분 Prisma 오류나 런타임 동작에 의존한다. 근거: `controllers/*.ts`
- 에러 응답 정보 노출: 여러 컨트롤러가 500 응답에 `error` 객체를 포함한다. 근거: `controllers/authController.ts`, `controllers/bookController.ts`, `controllers/readingLogController.ts`, `controllers/memoController.ts`, `controllers/statsController.ts`
- 세션 저장소: `express-session` store가 명시되지 않았다. 운영에서 기본 MemoryStore 사용은 확장성과 안정성 문제가 될 수 있다. 근거: `index.ts`
- IP 기록 신뢰성: 로그인 IP는 `x-forwarded-for` 또는 socket 주소를 사용하지만 Express `trust proxy` 설정은 확인되지 않는다. 근거: `controllers/authController.ts`, `index.ts`
- 통계 성능: 연도별 완독 통계가 대상 독서 기록을 모두 읽어 애플리케이션 메모리에서 집계한다. 데이터 증가 시 DB 집계로 바꾸는 방안을 검토해야 한다. 근거: `controllers/statsController.ts`

### 추정한 리스크

- 운영 배포에서 `SESSION_SECRET` fallback 값이 사용되면 세션 보안에 문제가 생길 수 있다. 실제 운영 환경변수 주입 방식은 저장소에서 확인되지 않았다.
- 프론트엔드가 `ReadingLog.userName`에 email을 넣는 정책을 갖고 있을 가능성이 있으나, 이 저장소만으로는 확정할 수 없다.

## 테스트, 배포, 운영 관점의 영향

### 테스트

확인한 근거: `package.json`, `jest.config.ts`, `test/helpers.ts`, `README.md`

- 전체 테스트 명령은 `npm test`이고 순차 실행(`--runInBand`)이다.
- 도메인별 테스트 스크립트가 있다: auth, book, reading-log, memo, stats.
- 테스트 앱은 `test/helpers.ts`의 `buildApp()`에서 별도 Express 앱으로 구성한다.
- 테스트는 `.env.test`를 로드하고 실제 DB에 연결한다.
- `cleanDb()`는 `Memo -> ReadingLog -> Book -> LoginHistory -> User` 순서로 데이터를 삭제한다.
- 테스트 DB와 운영 DB 분리가 필수이다.

### 배포/운영

확인한 근거: `package.json`, `README.md`, `schema.prisma`, `index.ts`

- 빌드는 `npm run build`로 TypeScript를 `dist/`에 컴파일한다.
- 운영 실행 명령은 `npm start`이고 `node dist/index.js`를 실행한다.
- Prisma generator는 `native`, `windows`, `debian-openssl-3.0.x` binary target을 포함한다.
- DB 마이그레이션 적용 절차는 운영용으로 명시된 스크립트가 별도로 없고, README의 테스트 DB 예시는 `prisma migrate deploy`를 사용한다.
- 헬스 체크는 DB 상태를 확인하지 않는다.
- 운영 graceful shutdown에서 Prisma 연결을 종료하는 코드는 확인되지 않았다.
- 로그는 morgan과 `console.error` 기반이다.

## 확인한 사실과 추정 내용

### 확인한 사실

- 이 프로젝트는 Express + TypeScript + Prisma + MySQL 백엔드이다. 근거: `README.md`, `package.json`, `schema.prisma`
- API 라우팅은 `routes/index.ts` 한 파일에서 관리한다.
- 컨트롤러가 Prisma Client를 직접 호출한다. 근거: `controllers/*.ts`
- 인증은 세션 기반이고 비밀번호는 bcrypt로 해시된다. 근거: `controllers/authController.ts`, `index.ts`
- `/api/stats`는 세션이 필요하지만 도서/독서 기록/메모 API는 세션 검사를 하지 않는다. 근거: `routes/index.ts`, `controllers/statsController.ts`
- 데이터 모델은 사용자와 도서 데이터를 직접 연결하지 않는다. 근거: `schema.prisma`
- 외부 도서 검색, 파일 업로드, 이메일 발송, OAuth 연동 코드는 확인되지 않는다. 근거: `package.json`, `controllers/*.ts`, `routes/index.ts`

### 추정 내용

- 이 서비스는 현재 개인 또는 단일 컬렉션 중심 모델로 구현되어 있고, 다중 사용자별 데이터 격리는 아직 설계되지 않은 것으로 보인다.
- `graphify-out/`은 분석 산출물로 보이며 런타임 필수 파일은 아닌 것으로 보인다. 다만 배포 제외 여부는 확인되지 않았다.
- 운영에서는 별도 세션 store, 환경변수 검증, 더 엄격한 입력 검증이 필요할 가능성이 높다.

## 추가 확인이 필요한 질문

- 도서/독서 기록/메모의 생성/수정/삭제 API는 의도적으로 비로그인 접근을 허용하는가?
- `Book`을 `User`에 연결해 사용자별 도서 컬렉션으로 분리할 계획이 있는가?
- `ReadingLog.userName`은 표시용 이름인가, 로그인 email 식별자인가?
- 통계는 `createdAt` 기준이 맞는가?
- 평균 별점은 전체 사용자 기준이 맞는가, 로그인 사용자 기준이어야 하는가?
- 운영 세션 저장소는 무엇을 사용할 계획인가?
- 운영 환경변수 필수 검증과 secret 관리 정책은 어디에서 담당하는가?
- API 입력 검증 라이브러리 또는 공통 validation 계층을 도입할 계획이 있는가?
- 에러 응답에서 내부 오류 객체를 제거하고 표준화할 계획이 있는가?
- Docker/CI/CD/마이그레이션 배포 절차는 별도 저장소나 문서에 존재하는가?
