# 개인 도서관리 서비스 - 개발 명세서

## 서비스 개요

개인이 구입한 도서를 관리하고, 독서 기록(별점·리뷰·메모)과 통계를 한 곳에서 관리하는 웹 서비스

---

## 도메인 모델

### 모델 관계
```
Book ─── 1:1 ── ReadingLog   (책 한 권당 독서 기록 하나)
Book ─── 1:N ── Memo         (책 한 권에 메모 여러 개)
```

Book이 삭제되면 연결된 ReadingLog와 Memo는 함께 삭제됩니다 (Cascade).

### 도서 상태 (BookStatus)

| 상태값 | 설명 |
|--------|------|
| `OWNED` | 소장 중 - 구입했지만 아직 읽지 않은 책 |
| `READING` | 읽는 중 - 현재 읽고 있는 책 |
| `DONE` | 읽기 완료 - 다 읽은 책 |
| `EXCLUDED` | 읽기 제외 - 읽지 않기로 한 책 |
| `SOLD` | 판매 - 중고로 판매한 책 |
| `DONATED` | 기부 - 주위 사람에게 기부한 책 |

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
- 도서 1권당 독서 기록 1개 (없으면 생성, 있으면 수정 - upsert)

### 3. 통계 대시보드

- 총 소장 / 완독 / 읽는 중 권수 요약 카드
- 월별 독서량 막대 차트
- 장르별 분포 파이 차트
- 연간 독서 목표 & 달성률

---

## 비즈니스 규칙

- ISBN은 중복 등록 불가 (unique 제약)
- Book 삭제 시 ReadingLog, Memo 함께 삭제 (Cascade)
- ReadingLog는 bookId당 1개만 존재 (upsert 방식으로 저장)
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

목록 조회 쿼리 파라미터: `status`, `genre`, `search`, `sortBy`, `order`

### 독서 기록 (ReadingLog)

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/books/:bookId/reading-log` | 독서 기록 조회 |
| PUT | `/api/books/:bookId/reading-log` | 독서 기록 저장/수정 |
| DELETE | `/api/books/:bookId/reading-log` | 독서 기록 삭제 |

요청 바디: `userName`, `startDate`, `endDate`, `rating`, `review`

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

## 공통 응답 형식

```json
// 성공
{ "success": true, "data": { ... } }

// 목록 조회 성공
{ "success": true, "data": [...], "total": 10 }

// 실패
{ "success": false, "message": "에러 메시지" }
```

