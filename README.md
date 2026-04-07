# 도서관리 서비스 - Backend

## 기술 스택
- **Runtime**: Node.js + Express
- **Language**: TypeScript
- **Database**: MySQL
- **ORM**: Prisma

## 프로젝트 구조
```
backend/
├── config/
│   └── prisma.ts        # Prisma 클라이언트
├── controllers/
│   ├── bookController.ts       # 도서 CRUD
│   ├── readingLogController.ts # 독서 기록
│   ├── memoController.ts       # 메모 & 하이라이트
│   └── statsController.ts      # 통계
├── middleware/
│   └── errorHandler.ts  # 에러 핸들러
├── migrations/          # Prisma 마이그레이션 파일
├── routes/
│   └── index.ts         # API 라우터
├── index.ts             # 서버 진입점
├── schema.prisma        # DB 스키마 (Book, ReadingLog, Memo)
├── package.json
└── tsconfig.json
```

## 시작하기

### 1. MySQL 데이터베이스 생성
```sql
CREATE DATABASE book_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 환경변수 설정
```env
DATABASE_URL="mysql://root:your_password@localhost:3306/book_manager"
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

---

## API 엔드포인트

### 도서 (Books)
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/books` | 도서 목록 조회 |
| GET | `/api/books/:id` | 도서 상세 조회 |
| POST | `/api/books` | 도서 등록 |
| PUT | `/api/books/:id` | 도서 수정 |
| DELETE | `/api/books/:id` | 도서 삭제 |

**목록 조회 쿼리 파라미터**
- `status`: `OWNED` \| `READING` \| `DONE` \| `EXCLUDED`
- `genre`: 장르명
- `search`: 제목/저자/ISBN 검색
- `sortBy`: 정렬 필드 (기본: `createdAt`)
- `order`: `asc` \| `desc` (기본: `desc`)

### 독서 기록 (Reading Log)
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/books/:bookId/reading-log` | 독서 기록 조회 |
| PUT | `/api/books/:bookId/reading-log` | 독서 기록 저장/수정 |
| DELETE | `/api/books/:bookId/reading-log` | 독서 기록 삭제 |

**독서 기록 저장 요청 바디**
| 필드 | 타입 | 설명 |
|------|------|------|
| `userName` | string | 읽은 사람 이름 |
| `startDate` | string (ISO 날짜) | 읽기 시작일 |
| `endDate` | string (ISO 날짜) | 읽기 완료일 |
| `rating` | number (0.0~5.0) | 별점 |
| `review` | string | 독후감 |

### 메모 & 하이라이트 (Memos)
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/books/:bookId/memos` | 메모 목록 조회 |
| POST | `/api/books/:bookId/memos` | 메모 등록 |
| PUT | `/api/memos/:id` | 메모 수정 |
| DELETE | `/api/memos/:id` | 메모 삭제 |

### 통계 (Stats)
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/stats` | 전체 통계 조회 |

---

## 요청/응답 예시

### 도서 등록
```json
POST /api/books
Content-Type: application/json

{
  "title": "클린 코드",
  "author": "로버트 C. 마틴",
  "publisher": "인사이트",
  "isbn": "9788966260959",
  "genre": "프로그래밍",
  "coverUrl": "https://example.com/cover.jpg",
  "purchaseDate": "2024-01-15",
  "status": "OWNED"
}
```

### 독서 기록 저장
```json
PUT /api/books/1/reading-log
Content-Type: application/json

{
  "userName": "홍길동",
  "startDate": "2024-02-01",
  "endDate": "2024-02-20",
  "rating": 4.5,
  "review": "코드 품질에 대한 인사이트가 많은 책"
}
```

### 메모 등록
```json
POST /api/books/1/memos
Content-Type: application/json

{
  "page": 42,
  "content": "함수는 한 가지 일만 해야 한다",
  "type": "HIGHLIGHT"
}
```
