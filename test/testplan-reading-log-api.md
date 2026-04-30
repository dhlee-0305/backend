# 테스트 계획서 - 독서 기록 (Reading Log) API

## 1. 테스트 범위 정의

### 포함
- `GET /api/books/:bookId/reading-logs` - 독서 기록 목록 조회
- `POST /api/books/:bookId/reading-logs` - 독서 기록 등록
- `PUT /api/reading-logs/:id` - 독서 기록 수정
- `DELETE /api/reading-logs/:id` - 독서 기록 삭제
- 재독 기록 지원 (동일 bookId에 다중 등록)
- 별점 범위 (0.0 ~ 5.0) 처리 검증
- Book Cascade 삭제 시 독서 기록 함께 삭제 검증
- 목록 정렬 (등록일 내림차순) 검증

### 제외
- 세션 인증 (현재 독서 기록 API는 인증 불필요)
- 별점 소수점 이하 2자리 이상 입력 제한 (현재 구현 없음)
- 독서 기간 유효성 검사 (startDate > endDate 금지 등 현재 구현 없음)

---

## 2. 테스트 유형 구분

| 유형 | 설명 |
|------|------|
| **기능 테스트** | CRUD 각 엔드포인트 정상 흐름 및 응답 구조 검증 |
| **경계값 테스트** | 별점 범위, 존재하지 않는 bookId/id 처리 |
| **비즈니스 규칙 테스트** | 재독 기록 다중 등록, 등록일 내림차순 정렬 |
| **통합 테스트** | 등록 → 조회 → 수정 → 삭제 전체 흐름 |
| **연계 테스트** | Book 삭제 시 독서 기록 Cascade 삭제 확인 |

---

## 3. 우선순위 산정 기준

| 우선순위 | 기준 |
|----------|------|
| **P1 - 긴급** | 데이터 저장·삭제 오류, 재독 기능 동작 불가 |
| **P2 - 높음** | 잘못된 bookId 처리, 별점 범위 초과 허용 |
| **P3 - 보통** | 정렬 순서 오류, 선택 필드 null 처리 |
| **P4 - 낮음** | 응답 필드 순서, 메시지 오타 등 |

---

## 4. 테스트 시나리오

### TC-LOG-001: 독서 기록 등록 - 전체 필드 입력
- **우선순위:** P1
- **엔드포인트:** `POST /api/books/:bookId/reading-logs`
- **전제조건:** bookId=1 도서 존재
- **요청:**
  ```json
  {
    "userName": "홍길동",
    "readStatus": "READ",
    "startDate": "2024-01-10",
    "endDate": "2024-02-05",
    "rating": 4.5,
    "review": "인상 깊은 책이었습니다."
  }
  ```
- **기대 결과:**
  - HTTP 201, `success: true`
  - `data.bookId` = 1
  - `data.startDate`, `data.endDate` ISO 8601 형식 변환 확인
  - `data.rating: 4.5`
  - `data.createdAt`, `data.updatedAt` ISO 8601

---

### TC-LOG-002: 독서 기록 등록 - 선택 필드 모두 생략
- **우선순위:** P1
- **엔드포인트:** `POST /api/books/:bookId/reading-logs`
- **전제조건:** bookId=1 도서 존재
- **요청:** `{}`
- **기대 결과:**
  - HTTP 201
  - `data.userName`, `data.readStatus`, `data.startDate`, `data.endDate`, `data.rating`, `data.review` 모두 `null`

---

### TC-LOG-003: 독서 기록 등록 - 존재하지 않는 bookId
- **우선순위:** P2
- **엔드포인트:** `POST /api/books/99999/reading-logs`
- **요청:** `{ "userName": "홍길동" }`
- **기대 결과:** HTTP 500 또는 Prisma 외래키 오류
- **비고:** 컨트롤러에 bookId 존재 여부 사전 검증 없음 - DB 외래키 제약으로 오류 발생 예상

---

### TC-LOG-004: 재독 기록 - 동일 도서에 복수 등록
- **우선순위:** P1
- **엔드포인트:** `POST /api/books/:bookId/reading-logs`
- **전제조건:** bookId=1에 독서 기록 1건 이미 존재
- **동작:** 동일 bookId에 2번째 독서 기록 등록
- **기대 결과:**
  - HTTP 201
  - `GET /api/books/1/reading-logs` 응답 `total: 2` 확인
  - 재독을 막는 제약 없음 (비즈니스 규칙: 재독 지원)

---

### TC-LOG-005: 독서 기록 등록 - 별점 경계값 (최솟값 0.0)
- **우선순위:** P2
- **엔드포인트:** `POST /api/books/:bookId/reading-logs`
- **요청:** `{ "rating": 0.0 }`
- **기대 결과:** HTTP 201, `data.rating: 0`

---

### TC-LOG-006: 독서 기록 등록 - 별점 경계값 (최댓값 5.0)
- **우선순위:** P2
- **엔드포인트:** `POST /api/books/:bookId/reading-logs`
- **요청:** `{ "rating": 5.0 }`
- **기대 결과:** HTTP 201, `data.rating: 5`

---

### TC-LOG-007: 독서 기록 등록 - 별점 범위 초과 (6.0)
- **우선순위:** P2
- **엔드포인트:** `POST /api/books/:bookId/reading-logs`
- **요청:** `{ "rating": 6.0 }`
- **기대 결과:** HTTP 400 또는 오류 응답
- **비고:** 컨트롤러에 별점 범위 검증 없음 - DB Float 컬럼에 그대로 저장될 수 있음 (결함 후보)

---

### TC-LOG-008: 독서 기록 목록 조회 - 등록일 내림차순 정렬
- **우선순위:** P2
- **엔드포인트:** `GET /api/books/:bookId/reading-logs`
- **전제조건:** bookId=1에 독서 기록 3건 존재 (등록 시각 상이)
- **기대 결과:**
  - HTTP 200
  - `data[0].createdAt` >= `data[1].createdAt` >= `data[2].createdAt` (내림차순)
  - `total: 3`

---

### TC-LOG-009: 독서 기록 목록 조회 - 기록 없는 도서
- **우선순위:** P3
- **엔드포인트:** `GET /api/books/:bookId/reading-logs`
- **전제조건:** bookId=1 도서는 존재하나 독서 기록 없음
- **기대 결과:** HTTP 200, `data: []`, `total: 0`

---

### TC-LOG-010: 독서 기록 수정 - 일부 필드 수정
- **우선순위:** P1
- **엔드포인트:** `PUT /api/reading-logs/:id`
- **전제조건:** id=1 독서 기록 존재
- **요청:**
  ```json
  { "endDate": "2024-02-10", "rating": 5.0, "review": "다시 읽어도 좋은 책입니다." }
  ```
- **기대 결과:**
  - HTTP 200
  - `data.endDate`, `data.rating`, `data.review` 변경 반영
  - `data.updatedAt` 이전보다 최신 시각
  - 수정하지 않은 `userName`, `readStatus`, `startDate` 기존값 유지

---

### TC-LOG-011: 독서 기록 수정 - 존재하지 않는 ID
- **우선순위:** P1
- **엔드포인트:** `PUT /api/reading-logs/99999`
- **기대 결과:** HTTP 404, `message: "독서 기록을 찾을 수 없습니다."`

---

### TC-LOG-012: 독서 기록 수정 - readStatus 변경 (READ → EXCLUDED)
- **우선순위:** P2
- **엔드포인트:** `PUT /api/reading-logs/:id`
- **요청:** `{ "readStatus": "EXCLUDED" }`
- **기대 결과:** HTTP 200, `data.readStatus: "EXCLUDED"`

---

### TC-LOG-013: 독서 기록 삭제 - 정상 삭제
- **우선순위:** P1
- **엔드포인트:** `DELETE /api/reading-logs/:id`
- **전제조건:** id=1 독서 기록 존재
- **기대 결과:**
  - HTTP 200, `message: "독서 기록이 삭제되었습니다."`
  - 이후 `GET /api/books/:bookId/reading-logs` 에서 해당 기록 미조회

---

### TC-LOG-014: 독서 기록 삭제 - 존재하지 않는 ID
- **우선순위:** P1
- **엔드포인트:** `DELETE /api/reading-logs/99999`
- **기대 결과:** HTTP 404, `message: "독서 기록을 찾을 수 없습니다."`

---

### TC-LOG-015: 연계 - Book 삭제 시 독서 기록 Cascade 삭제
- **우선순위:** P1
- **유형:** 연계 테스트
- **순서:**
  1. `POST /api/books` → bookId 획득
  2. `POST /api/books/:bookId/reading-logs` → 기록 2건 등록
  3. `DELETE /api/books/:bookId` → 도서 삭제
  4. `GET /api/books/:bookId/reading-logs` → 독서 기록도 함께 삭제됨 확인
- **기대 결과:** 도서 삭제 후 독서 기록이 DB에서도 제거됨

---

### TC-LOG-016: 통합 - 독서 기록 전체 흐름
- **우선순위:** P1
- **유형:** 통합 테스트
- **순서:**
  1. `POST /api/books/:bookId/reading-logs` → 201, id 획득
  2. `GET /api/books/:bookId/reading-logs` → 목록에 포함 확인
  3. `PUT /api/reading-logs/:id` → 200, 수정 확인
  4. `DELETE /api/reading-logs/:id` → 200
  5. `GET /api/books/:bookId/reading-logs` → 해당 기록 미존재 확인

---

## 5. 알려진 위험 및 주의사항

| 항목 | 내용 |
|------|------|
| 별점 범위 검증 부재 | 0.0~5.0 외 값이 DB에 그대로 저장될 수 있음 - 결함 후보 |
| 존재하지 않는 bookId 처리 | 컨트롤러에 사전 검증 없어 DB 외래키 오류가 500으로 반환됨 |
| endDate < startDate 허용 | 날짜 역순 입력에 대한 검증 없음 - 데이터 오염 가능 |
| Cascade 삭제 | Book 삭제 시 독서 기록도 삭제되므로 복구 불가 - 운영 주의 |
