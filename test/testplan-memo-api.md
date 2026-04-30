# 테스트 계획서 - 메모 & 하이라이트 (Memo) API

## 1. 테스트 범위 정의

### 포함
- `GET /api/books/:bookId/memos` - 메모 목록 조회 (type 필터 포함)
- `POST /api/books/:bookId/memos` - 메모 등록
- `PUT /api/memos/:id` - 메모 수정
- `DELETE /api/memos/:id` - 메모 삭제
- type 필터 (`MEMO` / `HIGHLIGHT`) 동작 검증
- 정렬 기준 (page 오름차순 → createdAt 내림차순) 검증
- type 기본값 (`MEMO`) 검증
- Book Cascade 삭제 시 메모 함께 삭제 검증

### 제외
- 세션 인증 (현재 메모 API는 인증 불필요)
- content 최대 길이 제한 (현재 구현 없음 - DB TEXT 타입)
- page 음수 입력 제한 (현재 구현 없음)

---

## 2. 테스트 유형 구분

| 유형 | 설명 |
|------|------|
| **기능 테스트** | CRUD 각 엔드포인트 정상 흐름 및 응답 구조 검증 |
| **필터 테스트** | type 필터 단독 및 미입력 시 동작 |
| **정렬 테스트** | page 오름차순 → createdAt 내림차순 복합 정렬 |
| **경계값 테스트** | 존재하지 않는 bookId/id, content 누락 |
| **통합 테스트** | 등록 → 조회 → 수정 → 삭제 전체 흐름 |
| **연계 테스트** | Book 삭제 시 메모 Cascade 삭제 확인 |

---

## 3. 우선순위 산정 기준

| 우선순위 | 기준 |
|----------|------|
| **P1 - 긴급** | 데이터 저장·삭제 오류, type 필터 오동작 |
| **P2 - 높음** | 정렬 오류, content 필수 필드 누락 처리 |
| **P3 - 보통** | page 선택 필드 null 처리, 메시지 형식 |
| **P4 - 낮음** | 응답 필드 순서 등 경미한 사항 |

---

## 4. 테스트 시나리오

### TC-MEMO-001: 메모 등록 - HIGHLIGHT 타입, 전체 필드
- **우선순위:** P1
- **엔드포인트:** `POST /api/books/:bookId/memos`
- **전제조건:** bookId=1 도서 존재
- **요청:**
  ```json
  { "page": 42, "content": "이 장면에서 복선이 드러난다.", "type": "HIGHLIGHT" }
  ```
- **기대 결과:**
  - HTTP 201, `success: true`
  - `data.type: "HIGHLIGHT"`
  - `data.page: 42`
  - `data.bookId: 1`
  - `data.createdAt`, `data.updatedAt` ISO 8601

---

### TC-MEMO-002: 메모 등록 - type 생략 시 기본값 MEMO
- **우선순위:** P1
- **엔드포인트:** `POST /api/books/:bookId/memos`
- **요청:** `{ "content": "읽으면서 든 생각" }`
- **기대 결과:**
  - HTTP 201
  - `data.type: "MEMO"` (기본값 확인)
  - `data.page: null`

---

### TC-MEMO-003: 메모 등록 - page 생략
- **우선순위:** P2
- **엔드포인트:** `POST /api/books/:bookId/memos`
- **요청:** `{ "content": "전체적인 감상", "type": "MEMO" }`
- **기대 결과:** HTTP 201, `data.page: null`

---

### TC-MEMO-004: 메모 등록 - content 누락
- **우선순위:** P2
- **엔드포인트:** `POST /api/books/:bookId/memos`
- **요청:** `{ "page": 10, "type": "HIGHLIGHT" }`
- **기대 결과:** HTTP 500 또는 DB NOT NULL 오류
- **비고:** `content`는 DB NOT NULL이나 컨트롤러 레벨 검증 없음 - 실제 동작 확인 필요

---

### TC-MEMO-005: 메모 등록 - 존재하지 않는 bookId
- **우선순위:** P2
- **엔드포인트:** `POST /api/books/99999/memos`
- **요청:** `{ "content": "테스트" }`
- **기대 결과:** HTTP 500 또는 Prisma 외래키 오류
- **비고:** 컨트롤러에 bookId 사전 검증 없음

---

### TC-MEMO-006: 메모 목록 조회 - 필터 없음
- **우선순위:** P1
- **엔드포인트:** `GET /api/books/:bookId/memos`
- **전제조건:** bookId=1에 MEMO 2건, HIGHLIGHT 3건 등록
- **기대 결과:**
  - HTTP 200, `success: true`
  - `data` 5건, `total: 5`
  - MEMO, HIGHLIGHT 혼합 반환

---

### TC-MEMO-007: 메모 목록 조회 - type=HIGHLIGHT 필터
- **우선순위:** P1
- **엔드포인트:** `GET /api/books/:bookId/memos?type=HIGHLIGHT`
- **전제조건:** bookId=1에 MEMO 2건, HIGHLIGHT 3건 등록
- **기대 결과:**
  - HTTP 200
  - `data` 3건 모두 `type: "HIGHLIGHT"`
  - `total: 3`

---

### TC-MEMO-008: 메모 목록 조회 - type=MEMO 필터
- **우선순위:** P1
- **엔드포인트:** `GET /api/books/:bookId/memos?type=MEMO`
- **전제조건:** bookId=1에 MEMO 2건, HIGHLIGHT 3건 등록
- **기대 결과:**
  - HTTP 200
  - `data` 2건 모두 `type: "MEMO"`
  - `total: 2`

---

### TC-MEMO-009: 메모 목록 조회 - 정렬 검증 (page 오름차순 1차)
- **우선순위:** P2
- **엔드포인트:** `GET /api/books/:bookId/memos`
- **전제조건:** page=100인 메모, page=10인 메모, page=50인 메모 등록
- **기대 결과:** `data[0].page: 10`, `data[1].page: 50`, `data[2].page: 100` (오름차순)

---

### TC-MEMO-010: 메모 목록 조회 - 정렬 검증 (동일 page 내 createdAt 내림차순 2차)
- **우선순위:** P2
- **엔드포인트:** `GET /api/books/:bookId/memos`
- **전제조건:** 동일 page=42 에 메모 2건을 시간 간격을 두고 등록
- **기대 결과:** 더 늦게 등록된 메모가 먼저 반환 (createdAt 내림차순)

---

### TC-MEMO-011: 메모 목록 조회 - page=null 메모 처리
- **우선순위:** P3
- **엔드포인트:** `GET /api/books/:bookId/memos`
- **전제조건:** page=null 메모와 page=50 메모 혼재
- **기대 결과:** page=null 은 정렬에서 앞 또는 뒤로 처리됨 - 실제 DB 정렬 동작 확인

---

### TC-MEMO-012: 메모 목록 조회 - 메모 없는 도서
- **우선순위:** P3
- **엔드포인트:** `GET /api/books/:bookId/memos`
- **전제조건:** bookId=1 도서 존재, 메모 없음
- **기대 결과:** HTTP 200, `data: []`, `total: 0`

---

### TC-MEMO-013: 메모 수정 - 정상 수정
- **우선순위:** P1
- **엔드포인트:** `PUT /api/memos/:id`
- **전제조건:** id=5 메모 존재
- **요청:**
  ```json
  { "page": 50, "content": "수정된 메모 내용", "type": "MEMO" }
  ```
- **기대 결과:**
  - HTTP 200
  - `data.page: 50`, `data.content: "수정된 메모 내용"`, `data.type: "MEMO"`
  - `data.updatedAt` 이전보다 최신 시각

---

### TC-MEMO-014: 메모 수정 - 일부 필드만 수정
- **우선순위:** P2
- **엔드포인트:** `PUT /api/memos/:id`
- **요청:** `{ "content": "내용만 수정" }`
- **기대 결과:** HTTP 200, `data.content` 변경, `data.page`·`data.type` 기존값 유지

---

### TC-MEMO-015: 메모 수정 - 존재하지 않는 ID
- **우선순위:** P1
- **엔드포인트:** `PUT /api/memos/99999`
- **기대 결과:** HTTP 404, `message: "메모를 찾을 수 없습니다."`

---

### TC-MEMO-016: 메모 수정 - type 변경 (HIGHLIGHT → MEMO)
- **우선순위:** P2
- **엔드포인트:** `PUT /api/memos/:id`
- **요청:** `{ "type": "MEMO" }`
- **기대 결과:** HTTP 200, `data.type: "MEMO"`

---

### TC-MEMO-017: 메모 삭제 - 정상 삭제
- **우선순위:** P1
- **엔드포인트:** `DELETE /api/memos/:id`
- **전제조건:** id=5 메모 존재
- **기대 결과:**
  - HTTP 200, `message: "메모가 삭제되었습니다."`
  - 이후 `GET /api/books/:bookId/memos` 에서 해당 메모 미조회

---

### TC-MEMO-018: 메모 삭제 - 존재하지 않는 ID
- **우선순위:** P1
- **엔드포인트:** `DELETE /api/memos/99999`
- **기대 결과:** HTTP 404, `message: "메모를 찾을 수 없습니다."`

---

### TC-MEMO-019: 연계 - Book 삭제 시 메모 Cascade 삭제
- **우선순위:** P1
- **유형:** 연계 테스트
- **순서:**
  1. `POST /api/books` → bookId 획득
  2. `POST /api/books/:bookId/memos` → 메모 2건 등록
  3. `DELETE /api/books/:bookId` → 도서 삭제
  4. DB에서 해당 bookId 메모 레코드 미존재 확인
- **기대 결과:** 도서 삭제 후 연결 메모가 DB에서도 제거됨

---

### TC-MEMO-020: 통합 - 메모 전체 CRUD 흐름
- **우선순위:** P1
- **유형:** 통합 테스트
- **순서:**
  1. `POST /api/books/:bookId/memos` → 201, id 획득
  2. `GET /api/books/:bookId/memos` → 목록에 포함 확인
  3. `PUT /api/memos/:id` → 200, 수정 반영 확인
  4. `DELETE /api/memos/:id` → 200
  5. `GET /api/books/:bookId/memos` → 해당 메모 미존재 확인

---

## 5. 알려진 위험 및 주의사항

| 항목 | 내용 |
|------|------|
| content 필수 검증 부재 | 컨트롤러에 content 필수 검증 없음 - DB NOT NULL 오류가 500으로 반환됨 |
| 존재하지 않는 bookId 처리 | 외래키 제약 오류가 500으로 반환됨 (사용자 친화적 오류 메시지 부재) |
| page=null 정렬 동작 | MySQL에서 NULL은 정렬 시 앞쪽에 위치 - 예상치 못한 순서 발생 가능 |
| type enum 검증 부재 | 유효하지 않은 type 값 입력 시 Prisma 오류가 500으로 반환됨 |
| Cascade 삭제 | Book 삭제 시 메모도 함께 삭제되므로 복구 불가 |
