# 개인 도서관리 서비스 - 개발 명세서

## 서비스 개요

개인이 구입한 도서를 관리하고, 독서 기록(별점·리뷰·메모)과 통계를 한 곳에서 관리하는 웹 서비스

---

## 도메인 모델

### 모델 관계
```
Book ─── 1:N ── ReadingLog   (책 한 권에 독서 기록 여러 개)
Book ─── 1:N ── Memo         (책 한 권에 메모 여러 개)
```

Book이 삭제되면 연결된 ReadingLog와 Memo는 함께 삭제됩니다 (Cascade).

### 도서 상태 (BookStatus)

| 상태값 | 설명 |
|--------|------|
| `OWNED` | 소장 중 - 구입 후 보관중인 책 |
| `SOLD` | 판매 - 중고로 판매한 책 |
| `DONATED` | 기부 - 주위 사람에게 기부한 책 |

### 읽기 상태 (ReadStatus)

| 상태값 | 설명 |
|--------|------|
| `READ` | 읽음 |
| `EXCLUDED` | 읽기 제외 |

### 메모 유형 (MemoType)

| 유형값 | 설명 |
|--------|------|
| `MEMO` | 일반 메모 |
| `HIGHLIGHT` | 하이라이트 구절 |

---

## 핵심 기능 명세

### 1. 도서 관리

- 도서 등록 (제목, 저자, 출판사, ISBN, 장르, 표지 이미지 URL, 구입일, 상태)
- 도서 수정 / 삭제
- 상태 변경 (소장 중 → 읽는 중 → 완료 등)
- 목록 조회 (상태별·장르별 필터, 제목/저자/ISBN 검색, 정렬)

### 2. 독서 기록

- 독자(userName), 독서 시작일 / 완료일 기록
- 별점 (5점 만점) & 텍스트 리뷰 작성
- 메모 & 하이라이트 구절 저장 (페이지 번호 포함)
- 도서 1권에 독서 기록 여러 개 등록 가능 (재독 지원)

### 3. 인증

- 이메일 / 비밀번호 기반 회원가입 및 로그인
- 비밀번호는 BCrypt로 암호화 저장
- 세션 기반 인증 (로그인 유지 24시간)
- 로그인 시도 내역(성공 여부, IP) 기록
- 조회 API는 비로그인 상태에서도 접근 가능

### 4. 통계 대시보드

- 총 소장 / 완독 / 읽는 중 권수 요약 카드
- 월별 독서량 막대 차트
- 장르별 분포 파이 차트
- 연간 독서 목표 & 달성률

---

## 비즈니스 규칙

- 이메일은 중복 가입 불가 (unique 제약)
- 비밀번호는 BCrypt(salt rounds: 10)로 암호화
- 로그인 시도는 성공/실패 여부와 무관하게 login_history에 기록
- ISBN은 중복 등록 불가 (unique 제약)
- Book 삭제 시 ReadingLog, Memo 함께 삭제 (Cascade)
- ReadingLog는 bookId당 여러 개 등록 가능 (재독 기록 지원)
- 별점은 0.0 ~ 5.0 범위 (소수점 1자리)
- 메모 목록은 페이지 오름차순 → 등록일 내림차순 정렬

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

목록 조회 쿼리 파라미터:

| 파라미터 | 설명 | 기본값 |
|----------|------|--------|
| `status` | 도서 상태 필터 (`OWNED`, `SOLD`, `DONATED`) | - |
| `genre` | 장르 필터 | - |
| `search` | 제목 / 저자 / ISBN 검색 | - |
| `readStatus` | 독서 상태 필터 (`READ`, `EXCLUDED`, `NONE`) · `NONE`은 독서 기록이 없는 책(읽지 않은 책) | - |
| `userName` | 독서 기록의 독자 이름 필터 (`readStatus`와 함께 적용) | - |
| `sortBy` | 정렬 기준 컬럼 | `createdAt` |
| `order` | 정렬 방향 (`asc`, `desc`) | `desc` |
| `page` | 페이지 번호 | `1` |
| `limit` | 페이지당 항목 수 | `10` |

응답항목:

- `GET /api/books`
  `success`, `data`, `total`, `page`, `limit`
  `data[]`: `id`, `title`, `author`, `publisher`, `isbn`, `genre`, `coverUrl`, `purchaseDate`, `status`, `createdAt`, `updatedAt`, `readingLogs`, `_count`
  `data[].readingLogs[]`: `readStatus`, `rating`, `startDate`, `endDate`, `userName`
  `data[]._count`: `memos`
- `GET /api/books/:id`
  `success`, `data`
  `data`: `id`, `title`, `author`, `publisher`, `isbn`, `genre`, `coverUrl`, `purchaseDate`, `status`, `createdAt`, `updatedAt`, `readingLogs`, `memos`
  `data.readingLogs[]`: `id`, `bookId`, `userName`, `readStatus`, `startDate`, `endDate`, `rating`, `review`, `createdAt`, `updatedAt`
  `data.memos[]`: `id`, `bookId`, `page`, `content`, `type`, `createdAt`, `updatedAt`
- `POST /api/books`
  `success`, `data`
  `data`: `id`, `title`, `author`, `publisher`, `isbn`, `genre`, `coverUrl`, `purchaseDate`, `status`, `createdAt`, `updatedAt`
- `PUT /api/books/:id`
  `success`, `data`
  `data`: `id`, `title`, `author`, `publisher`, `isbn`, `genre`, `coverUrl`, `purchaseDate`, `status`, `createdAt`, `updatedAt`
- `DELETE /api/books/:id`
  `success`, `message`

### 독서 기록 (ReadingLog)

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/books/:bookId/reading-logs` | 독서 기록 목록 조회 |
| POST | `/api/books/:bookId/reading-logs` | 독서 기록 등록 |
| PUT | `/api/reading-logs/:id` | 독서 기록 수정 |
| DELETE | `/api/reading-logs/:id` | 독서 기록 삭제 |

요청 바디: `userName`, `readStatus`, `startDate`, `endDate`, `rating`, `review`

응답항목:

- `GET /api/books/:bookId/reading-logs`
  `success`, `data`, `total`
  `data[]`: `id`, `bookId`, `userName`, `readStatus`, `startDate`, `endDate`, `rating`, `review`, `createdAt`, `updatedAt`
- `POST /api/books/:bookId/reading-logs`
  `success`, `data`
  `data`: `id`, `bookId`, `userName`, `readStatus`, `startDate`, `endDate`, `rating`, `review`, `createdAt`, `updatedAt`
- `PUT /api/reading-logs/:id`
  `success`, `data`
  `data`: `id`, `bookId`, `userName`, `readStatus`, `startDate`, `endDate`, `rating`, `review`, `createdAt`, `updatedAt`
- `DELETE /api/reading-logs/:id`
  `success`, `message`

### 메모 & 하이라이트 (Memos)

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/books/:bookId/memos` | 메모 목록 조회 |
| POST | `/api/books/:bookId/memos` | 메모 등록 |
| PUT | `/api/memos/:id` | 메모 수정 |
| DELETE | `/api/memos/:id` | 메모 삭제 |

목록 조회 쿼리 파라미터: `type`

응답항목:

- `GET /api/books/:bookId/memos`
  `success`, `data`, `total`
  `data[]`: `id`, `bookId`, `page`, `content`, `type`, `createdAt`, `updatedAt`
- `POST /api/books/:bookId/memos`
  `success`, `data`
  `data`: `id`, `bookId`, `page`, `content`, `type`, `createdAt`, `updatedAt`
- `PUT /api/memos/:id`
  `success`, `data`
  `data`: `id`, `bookId`, `page`, `content`, `type`, `createdAt`, `updatedAt`
- `DELETE /api/memos/:id`
  `success`, `message`

### 인증 (Auth)

| Method | URL | 설명 |
|--------|-----|------|
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 현재 로그인 사용자 조회 |

요청 바디: `email`, `password` (회원가입·로그인 공통)

응답항목:

- `POST /api/auth/signup`
  `success`, `data`
  `data`: `id`, `email`, `createdAt`
- `POST /api/auth/login`
  `success`, `data`
  `data`: `id`, `email`
- `POST /api/auth/logout`
  `success`, `message`
- `GET /api/auth/me`
  `success`, `data`
  `data`: `id`, `email`

### 통계 (Stats)

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/stats` | 전체 통계 조회 |

응답항목:

- `GET /api/stats`
  `success`, `data`
  `data`: `totalBooks`, `statusCounts`, `genreCounts`, `monthlyReading`, `avgRating`, `yearlyDoneCount`, `currentYear`
  `data.statusCounts[]`: `status`, `count`
  `data.genreCounts[]`: `genre`, `count`
  `data.monthlyReading[]`: `month`, `count`

---

## 공통 응답 형식

```json
// 성공
{ "success": true, "data": { ... } }

// 목록 조회 성공
{ "success": true, "data": [...], "total": 10 }

// 실패
{ "success": false, "message": "에러 메시지" }
```
