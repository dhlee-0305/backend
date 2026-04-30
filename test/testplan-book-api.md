# 테스트 계획서 - 도서 (Books) API

## 1. 테스트 범위 정의

### 포함
- `GET /api/books` - 도서 목록 조회 (필터, 검색, 정렬, 페이지네이션)
- `GET /api/books/:id` - 도서 단건 상세 조회
- `POST /api/books` - 도서 등록
- `PUT /api/books/:id` - 도서 수정
- `DELETE /api/books/:id` - 도서 삭제 및 Cascade 검증
- ISBN 중복 방지 비즈니스 규칙
- 도서 삭제 시 ReadingLog·Memo Cascade 삭제
- 응답 구조 (`readingLogs` 요약, `_count.memos`) 검증

### 제외
- 세션 인증 (현재 도서 API는 인증 불필요)
- 도서 이미지 업로드 (URL 문자열만 저장, 파일 업로드 기능 없음)
- 대용량 데이터 성능 테스트 (별도 부하 테스트 범위)

---

## 2. 테스트 유형 구분

| 유형 | 설명 |
|------|------|
| **기능 테스트** | CRUD 각 엔드포인트 정상 흐름 및 응답 구조 검증 |
| **필터/검색 테스트** | 쿼리 파라미터 조합별 필터 동작 검증 |
| **페이지네이션 테스트** | page·limit 파라미터 처리 및 total 정합성 |
| **경계값 테스트** | 존재하지 않는 ID, 잘못된 파라미터 타입 |
| **비즈니스 규칙 테스트** | ISBN 중복 불가, Cascade 삭제, 상태값 enum 검증 |
| **통합 테스트** | 등록 → 조회 → 수정 → 삭제 전체 흐름 |

---

## 3. 우선순위 산정 기준

| 우선순위 | 기준 |
|----------|------|
| **P1 - 긴급** | 데이터 유실, 중복 저장, 삭제 시 고아 데이터 발생 |
| **P2 - 높음** | 핵심 비즈니스 필터 오동작, 필수 필드 누락 응답 |
| **P3 - 보통** | 정렬 순서 오류, 페이지네이션 경계 처리 |
| **P4 - 낮음** | 응답 필드 순서, 선택 필드 null 처리 등 |

---

## 4. 테스트 시나리오

### TC-BOOK-001: 도서 등록 - 필수 필드만 입력
- **우선순위:** P1
- **엔드포인트:** `POST /api/books`
- **요청:**
  ```json
  { "title": "채식주의자", "author": "한강" }
  ```
- **기대 결과:**
  - HTTP 201, `success: true`
  - `data.status: "OWNED"` (기본값 확인)
  - `data.isbn`, `data.genre`, `data.coverUrl`, `data.purchaseDate` → `null`
  - `data.id` 양의 정수, `data.createdAt` ISO 8601

---

### TC-BOOK-002: 도서 등록 - 전체 필드 입력
- **우선순위:** P1
- **엔드포인트:** `POST /api/books`
- **요청:**
  ```json
  {
    "title": "채식주의자",
    "author": "한강",
    "publisher": "창비",
    "isbn": "9788936434120",
    "genre": "소설",
    "coverUrl": "https://example.com/cover.jpg",
    "purchaseDate": "2024-01-15",
    "status": "OWNED"
  }
  ```
- **기대 결과:**
  - HTTP 201
  - `data.purchaseDate` ISO 8601 형식으로 변환 확인 (`2024-01-15T00:00:00.000Z`)
  - 모든 입력 필드가 응답에 정확히 반영됨

---

### TC-BOOK-003: 도서 등록 - ISBN 중복
- **우선순위:** P1
- **엔드포인트:** `POST /api/books`
- **전제조건:** `isbn: "9788936434120"` 이미 등록됨
- **요청:** 동일 ISBN으로 다른 도서 등록 시도
- **기대 결과:** HTTP 409, `message: "이미 등록된 ISBN입니다."`

---

### TC-BOOK-004: 도서 등록 - title 누락
- **우선순위:** P2
- **엔드포인트:** `POST /api/books`
- **요청:** `{ "author": "한강" }`
- **기대 결과:** HTTP 500 또는 DB 제약 오류 응답
- **비고:** `title`은 DB NOT NULL 컬럼이나 컨트롤러 레벨 유효성 검사 부재 - 실제 동작 확인 필요

---

### TC-BOOK-005: 도서 등록 - status 유효하지 않은 값
- **우선순위:** P3
- **엔드포인트:** `POST /api/books`
- **요청:** `{ "title": "테스트", "author": "저자", "status": "INVALID_STATUS" }`
- **기대 결과:** HTTP 500 또는 Prisma enum 오류 응답
- **비고:** 컨트롤러 레벨 enum 검증 부재 - Prisma 오류 발생 예상

---

### TC-BOOK-006: 도서 단건 조회 - 정상 조회
- **우선순위:** P1
- **엔드포인트:** `GET /api/books/:id`
- **전제조건:** id=1인 도서, 독서기록 1건, 메모 2건 존재
- **기대 결과:**
  - HTTP 200, `success: true`
  - `data.readingLogs` 배열 (전체 필드 포함)
  - `data.memos` 배열 (등록일 내림차순 정렬)
  - `data.memos` 에 `_count` 불포함 (단건 조회는 전체 포함)

---

### TC-BOOK-007: 도서 단건 조회 - 존재하지 않는 ID
- **우선순위:** P1
- **엔드포인트:** `GET /api/books/99999`
- **기대 결과:** HTTP 404, `message: "도서를 찾을 수 없습니다."`

---

### TC-BOOK-008: 도서 목록 조회 - 파라미터 없음 (기본값)
- **우선순위:** P1
- **엔드포인트:** `GET /api/books`
- **기대 결과:**
  - HTTP 200, `success: true`
  - `data` 배열 (최대 10건, 기본 limit)
  - `total` 전체 도서 수
  - `page: 1`, `limit: 10`
  - `data[]` 에 `readingLogs` 요약, `_count.memos` 포함

---

### TC-BOOK-009: 도서 목록 조회 - status 필터
- **우선순위:** P2
- **엔드포인트:** `GET /api/books?status=OWNED`
- **기대 결과:** 응답 `data[]` 전체가 `status: "OWNED"` 인 도서만 포함

---

### TC-BOOK-010: 도서 목록 조회 - genre 필터
- **우선순위:** P2
- **엔드포인트:** `GET /api/books?genre=소설`
- **기대 결과:** 응답 `data[]` 전체가 `genre: "소설"` 인 도서만 포함 (완전 일치)

---

### TC-BOOK-011: 도서 목록 조회 - search 필터 (제목 부분 일치)
- **우선순위:** P2
- **엔드포인트:** `GET /api/books?search=채식`
- **기대 결과:** 제목에 "채식" 포함된 도서만 반환

---

### TC-BOOK-012: 도서 목록 조회 - search 필터 (저자 부분 일치)
- **우선순위:** P2
- **엔드포인트:** `GET /api/books?search=한강`
- **기대 결과:** 저자에 "한강" 포함된 도서만 반환

---

### TC-BOOK-013: 도서 목록 조회 - search 필터 (ISBN 부분 일치)
- **우선순위:** P3
- **엔드포인트:** `GET /api/books?search=9788936`
- **기대 결과:** ISBN에 해당 값이 포함된 도서만 반환

---

### TC-BOOK-014: 도서 목록 조회 - readStatus=READ 필터
- **우선순위:** P2
- **엔드포인트:** `GET /api/books?readStatus=READ`
- **기대 결과:** `readingLogs` 중 `readStatus: "READ"` 인 기록이 하나라도 있는 도서만 반환

---

### TC-BOOK-015: 도서 목록 조회 - readStatus=NONE 필터
- **우선순위:** P2
- **엔드포인트:** `GET /api/books?readStatus=NONE`
- **기대 결과:** 독서 기록이 전혀 없는 도서만 반환

---

### TC-BOOK-016: 도서 목록 조회 - readStatus=NONE + userName 복합 필터
- **우선순위:** P2
- **엔드포인트:** `GET /api/books?readStatus=NONE&userName=홍길동`
- **기대 결과:** "홍길동"의 독서 기록이 없는 도서만 반환
- **비고:** `readingLogs: { none: { userName: "홍길동" } }` 조건 검증

---

### TC-BOOK-017: 도서 목록 조회 - readStatus + userName 복합 필터
- **우선순위:** P2
- **엔드포인트:** `GET /api/books?readStatus=READ&userName=홍길동`
- **기대 결과:** "홍길동"의 READ 기록이 하나 이상 있는 도서만 반환

---

### TC-BOOK-018: 도서 목록 조회 - 정렬 (title asc)
- **우선순위:** P3
- **엔드포인트:** `GET /api/books?sortBy=title&order=asc`
- **기대 결과:** `data[].title` 이 오름차순 정렬

---

### TC-BOOK-019: 도서 목록 조회 - 페이지네이션
- **우선순위:** P2
- **전제조건:** 도서 25건 등록
- **요청:**
  - `GET /api/books?page=1&limit=10` → `data` 10건, `total: 25`, `page: 1`
  - `GET /api/books?page=3&limit=10` → `data` 5건, `page: 3`
- **기대 결과:** `total` 은 전체 건수, `data` 는 해당 페이지 슬라이스

---

### TC-BOOK-020: 도서 수정 - 일부 필드만 수정
- **우선순위:** P1
- **엔드포인트:** `PUT /api/books/:id`
- **전제조건:** id=1 도서 존재
- **요청:** `{ "status": "SOLD" }`
- **기대 결과:**
  - HTTP 200
  - `data.status: "SOLD"` 로 변경
  - 다른 필드는 기존값 유지
  - `data.updatedAt` 이 이전보다 최신 시각

---

### TC-BOOK-021: 도서 수정 - 존재하지 않는 ID
- **우선순위:** P1
- **엔드포인트:** `PUT /api/books/99999`
- **기대 결과:** HTTP 404, `message: "도서를 찾을 수 없습니다."`

---

### TC-BOOK-022: 도서 삭제 - 정상 삭제
- **우선순위:** P1
- **엔드포인트:** `DELETE /api/books/:id`
- **전제조건:** 도서·독서기록·메모 모두 존재
- **기대 결과:**
  - HTTP 200, `message: "도서가 삭제되었습니다."`
  - `GET /api/books/:id` → HTTP 404 확인
  - DB에서 연결된 `reading_logs`, `memos` 도 삭제됨 (Cascade 검증)

---

### TC-BOOK-023: 도서 삭제 - 존재하지 않는 ID
- **우선순위:** P1
- **엔드포인트:** `DELETE /api/books/99999`
- **기대 결과:** HTTP 404, `message: "도서를 찾을 수 없습니다."`

---

### TC-BOOK-024: 통합 - 도서 전체 CRUD 흐름
- **우선순위:** P1
- **유형:** 통합 테스트
- **순서:**
  1. `POST /api/books` → 201, id 획득
  2. `GET /api/books/:id` → 200, 등록 데이터 확인
  3. `PUT /api/books/:id` → 200, 수정 반영 확인
  4. `DELETE /api/books/:id` → 200
  5. `GET /api/books/:id` → 404 확인

---

## 5. 알려진 위험 및 주의사항

| 항목 | 내용 |
|------|------|
| title 유효성 검사 부재 | 컨트롤러에 title 필수 검증 없음 - DB 레벨에서 오류 발생 |
| status enum 검증 부재 | 잘못된 status 값 입력 시 Prisma 오류가 그대로 500으로 반환됨 |
| Cascade 삭제 | Book 삭제 시 ReadingLog·Memo가 함께 삭제되므로 데이터 복구 불가 |
| readStatus=NONE + userName | 복합 필터 조합 로직이 코드 분기로 처리되므로 엣지 케이스 검증 필요 |
| purchaseDate 빈값 전달 | 수정 시 `purchaseDate: ""` 전달하면 `undefined` 처리되어 기존값 유지 |
