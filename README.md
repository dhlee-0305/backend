# 도서관리 서비스 - Backend

도서·독서 기록·메모를 관리하고, Markdown 문서와 첨부 이미지를 저장하는 REST API 서버입니다.

## 주요 기능

- 세션 기반 회원가입·로그인·로그아웃 및 로그인 시도 이력
- 도서 CRUD, 검색·필터·정렬·페이지네이션
- 도서별 독서 기록, 별점·리뷰, 메모·하이라이트 관리
- 도서 상태·장르·평균 별점 및 로그인 사용자의 연도별 독서 통계
- Markdown 파일 업로드, 카테고리별 문서 관리, 이미지 ZIP 첨부·교체·조회
- 문서 등록·수정·삭제 이력 보존과 상세 응답의 작성자 이메일 조회

## 기술 스택

| 항목 | 내용 |
|------|------|
| Runtime / Framework | Node.js / Express |
| Language | TypeScript |
| Database / ORM | MySQL / Prisma |
| 인증 | express-session / bcrypt |
| 파일 업로드 / ZIP | multer / yauzl |
| 테스트 | Jest / Supertest / ts-jest |

## 프로젝트 구조

```text
bookbackend/
├── config/prisma.ts             # Prisma 클라이언트
├── controllers/                 # 인증·도서·독서 기록·메모·통계·문서 API
├── services/
│   ├── mkbrdService.ts          # 문서·이미지 저장, 이력, 순차 처리와 복구
│   ├── mkbrdImages.ts           # 이미지 ZIP 검증·압축 해제
│   └── mkbrdError.ts            # 문서 API 오류 타입
├── middleware/
│   ├── errorHandler.ts         # 공통 404·오류 응답
│   └── mkbrdUpload.ts          # 로그인 확인·multipart 업로드 제한
├── routes/index.ts             # API 라우터
├── migrations/                 # Prisma 마이그레이션 SQL
├── mkbrd/                      # 실행 중 생성되는 문서·이미지 저장소 (Git 제외)
├── docs/                       # API 명세·아키텍처·작업 흐름
├── test/                       # API 테스트·공통 헬퍼·테스트 계획서
├── types/session.d.ts          # 세션 타입 확장
├── index.ts                    # 서버 진입점
├── schema.prisma               # DB 스키마
├── jest.config.ts              # Jest 설정
└── package.json                # 의존성·실행 명령
```

## 시작하기

다음 명령은 프로젝트 루트에서 실행합니다. Node.js와 MySQL이 필요합니다. 이미지 ZIP의 CRC 검증은 Node.js의 `zlib.crc32`를 사용하므로 해당 API를 제공하는 런타임을 사용합니다.

### 1. 데이터베이스 생성

```sql
CREATE DATABASE book_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 환경변수 설정

프로젝트 루트에 `.env` 파일을 준비합니다. 접속 주소·계정·비밀번호는 실행 환경에 맞게 설정합니다.

```env
DATABASE_URL="mysql://user:password@127.0.0.1:3306/book_manager"
SESSION_SECRET="replace-with-a-long-random-secret"
PORT=4000
CLIENT_URL="http://localhost:3000"
NODE_ENV="development"
```

| 변수 | 설명 | 미설정 시 동작 |
|------|------|----------------|
| `DATABASE_URL` | MySQL 접속 URL | Prisma DB 연결에 필요 |
| `SESSION_SECRET` | 세션 서명 키 | `changeme` 사용 |
| `PORT` | HTTP 포트 | `4000` |
| `CLIENT_URL` | credentials를 허용할 CORS origin | `http://localhost:3000` |
| `NODE_ENV` | 실행 환경 | `production`일 때 세션 쿠키에 `secure: true` 적용 |

실제 접속 정보와 세션 서명 키는 커밋하지 않습니다. 운영 시 `SESSION_SECRET`을 지정하고 HTTPS 환경에서 세션 쿠키를 사용합니다.

### 3. 패키지 설치 및 DB 준비

```bash
npm ci
npm run prisma:generate
npx prisma migrate deploy
```

위 명령은 저장소에 있는 마이그레이션을 적용합니다. 스키마를 변경하고 개발용 마이그레이션을 새로 만들 때는 `npm run prisma:migrate`를 사용합니다.

### 4. 서버 실행

개발:

```bash
npm run dev
```

빌드 후 실행:

```bash
npm run build
npm start
```

| 항목 | 기본 URL |
|------|----------|
| 서버 | `http://localhost:4000` |
| API 기본 경로 | `http://localhost:4000/api` |
| 헬스 체크 | `http://localhost:4000/health` |

헬스 체크는 서버 상태와 시각을 반환하며 DB 연결을 검사하지 않습니다.

## 문서 게시판 사용

카테고리는 `AI`, `관리`, `설계`, `기타`입니다. 문서·이미지 조회는 공개이며 등록·수정·삭제는 로그인 세션이 필요합니다. 로그인한 사용자는 모든 문서를 수정·삭제할 수 있습니다.

등록·수정은 `multipart/form-data`로 전송합니다.

| 필드 | 등록 | 수정 | 설명 |
|------|------|------|------|
| `category` | 필수 | 선택 | 문서 카테고리 |
| `file` | 필수 | 선택 | UTF-8 `.md` 파일, 최대 10MB |
| `images` | 선택 | 선택 | 이미지 ZIP 파일, 최대 10MB |

수정은 세 필드 중 하나 이상 필요합니다. 제목은 업로드 파일명이며 크기는 Markdown 파일의 실제 바이트 수입니다. 파일은 BOM·줄바꿈을 포함한 원본 바이트를 보존합니다.

예를 들어 `AI` 카테고리에 `안내.md`와 이미지를 업로드하면 다음 구조로 저장됩니다.

```text
mkbrd/
└── AI/
    └── 안내/
        ├── 안내.md
        └── image/
            └── 구성.png
```

- ZIP 내부 경로를 `image/` 아래에 유지합니다. ZIP 루트에 `구성.png`가 있으면 Markdown에서 `![구성](image/구성.png)`로 참조합니다.
- 이미지 ZIP 첨부 시 기존 이미지를 전체 교체합니다. ZIP 생략 시 유지하며 빈 ZIP 첨부 시 이미지를 모두 비웁니다.
- 문서명·카테고리 변경 시 이미지도 함께 이동하고, 문서 삭제 시 폴더 전체를 삭제합니다. 작업 이력은 `mkbrd_hist`에 보존합니다.
- 압축 해제 후 총 크기는 최대 100MB, ZIP 파일·디렉터리 항목은 최대 1000개입니다. 허용 이미지 형식과 ZIP 검증 규칙은 [문서 게시판 API 명세](docs/mkbrd-api.md)를 참고합니다.
- 상세 응답에는 `content`, `imageBaseUrl`, `authorEmail`이 포함됩니다. 작성자 이메일은 최초 등록 이력으로 조회하며 등록 이력 또는 사용자가 없으면 `null`입니다.
- 프런트엔드 Markdown 렌더러에서 `image/` 상대 경로를 `imageBaseUrl` 기반 이미지 조회 URL로 변환합니다.
- 기존 평면 경로의 문서는 계속 조회·삭제할 수 있고 수정 시 새 폴더 구조로 전환됩니다.

등록 예시 (`cookies.txt`는 로그인 API에서 받은 세션 쿠키 파일):

```bash
curl -X POST http://localhost:4000/api/mkbrd \
  -b cookies.txt \
  -F 'category=AI' \
  -F 'file=@./안내.md;type=text/markdown' \
  -F 'images=@./images.zip;type=application/zip'
```

## 문서 안내

| 문서 | 내용 |
|------|------|
| [서비스 명세](docs/spec.md) | 도서관리 도메인·기능·API 개요 |
| [아키텍처](docs/ARCHITECTURE.md) | 모듈 구조·데이터 흐름·운영 제약 |
| [작업 흐름](docs/WORKFLOW.md) | 개발 작업 흐름 |
| [인증 API](docs/auth-api.md) | 회원가입·로그인·로그아웃·현재 사용자 |
| [도서 API](docs/books-api.md) | 도서 CRUD·검색·페이징 |
| [독서 기록 API](docs/reading-logs-api.md) | 도서별 독서 기록 |
| [메모 API](docs/memos-api.md) | 메모·하이라이트 |
| [통계 API](docs/stats-api.md) | 도서·독서 통계 |
| [문서 게시판 API](docs/mkbrd-api.md) | Markdown·이미지 ZIP 업로드·이미지 조회·작성자 |

엔드포인트와 상세 Request/Response의 기준은 각 도메인 API 명세입니다.

## 테스트

### 테스트 DB 준비

```sql
CREATE DATABASE book_manager_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

`.env.test` 예시:

```env
DATABASE_URL="mysql://user:password@127.0.0.1:3306/book_manager_test"
SESSION_SECRET="test-secret-key"
NODE_ENV="test"
PORT=4001
```

테스트 DB에도 마이그레이션을 적용합니다. 아래 URL은 `.env.test`와 동일한 테스트 DB로 지정합니다.

```bash
# Bash: 이 명령에만 테스트 DB 접속 URL 적용
DATABASE_URL='mysql://user:password@127.0.0.1:3306/book_manager_test' npx prisma migrate deploy
```

### 테스트 실행

```bash
npm test                                                        # 전체 실행 (순차)
npm run test:auth                                               # 인증 API
npm run test:book                                               # 도서 API
npm run test:reading-log                                        # 독서 기록 API
npm run test:memo                                               # 메모 API
npm run test:stats                                              # 통계 API
npm test -- --runTestsByPath test/test-mkbrd-api.ts               # 문서·이미지 API
```

인증·도서·독서 기록·메모·통계 테스트는 실제 테스트 DB를 사용하고 관련 테이블을 초기화합니다. 운영 DB와 분리해야 하며, `cleanDb()`는 `NODE_ENV=test`와 DB 이름에 `test`가 포함되어 있는지 확인합니다. 이미 셸에 `DATABASE_URL`을 지정했다면 `.env.test`보다 우선할 수 있으므로 테스트 DB인지 확인합니다.

문서 게시판 테스트는 Prisma mock과 임시 디렉터리를 사용합니다. 실제 DB를 변경하지 않고 파일·ZIP·이력·작성자 조회 및 오류 복구를 검증합니다. 도서관리 도메인의 테스트 계획은 [테스트 계획 개요](test/testplan-overview.md)를 참고합니다.

## 파일 저장소 운영

- 저장 루트는 `process.cwd()` 기준 `mkbrd/`입니다. 빌드 후에도 프로젝트 루트에서 실행하고 서버 계정에 쓰기 권한을 부여합니다.
- `mkbrd/`는 Git에서 제외됩니다. DB와 문서·이미지 파일을 함께 백업하고 배포 시 저장 디렉터리를 유지합니다.
- 문서·이미지의 조회·변경은 프로세스 내 큐로 순차 처리하므로 단일 서버 프로세스로 운영합니다.
- 요청 처리 중 오류는 DB 트랜잭션과 폴더 백업으로 복구합니다. 강제 종료 시에는 남은 `.mkbrd-*.tmp`·`.mkbrd-*.bak`와 DB를 확인해 복구해야 합니다.
- 세션은 별도 store 설정 없이 기본 MemoryStore를 사용하므로 재시작 시 로그인 세션이 유지되지 않습니다.
