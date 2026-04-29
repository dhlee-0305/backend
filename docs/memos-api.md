# 메모 & 하이라이트 (Memos) API

---

## 엔드포인트 목록

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/books/:bookId/memos` | 메모 목록 조회 |
| POST | `/api/books/:bookId/memos` | 메모 등록 |
| PUT | `/api/memos/:id` | 메모 수정 |
| DELETE | `/api/memos/:id` | 메모 삭제 |

---

## GET /api/books/:bookId/memos

특정 도서에 등록된 메모 & 하이라이트 목록을 유형 필터를 적용하여 조회한다.

### Request

인증 필요 여부: 세션 불필요

**Path Parameters**

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|----------|------|------|------|------|
| `bookId` | number | required | 도서 고유 ID | `1` |

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 | 예시 |
|----------|------|------|--------|------|------|
| `type` | string | 선택 | - | 메모 유형 필터. `MEMO` \| `HIGHLIGHT` | `HIGHLIGHT` |

> 정렬 순서: 페이지 번호 오름차순(`page asc`)을 1차 기준으로 하고, 등록일 내림차순(`createdAt desc`)을 2차 기준으로 정렬한다.

### Request Sample

```
GET /api/books/1/memos?type=HIGHLIGHT
```

### Response

**Success (200)**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `data` | array | required | 메모 목록 | `[...]` |
| `total` | number | required | 조회된 메모 전체 수 | `5` |

**data[] 항목 필드**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `id` | number | required | 메모 고유 ID | `5` |
| `bookId` | number | required | 도서 ID | `1` |
| `page` | number \| null | required | 페이지 번호 | `42` |
| `content` | string | required | 메모 내용 | `"이 장면에서 복선이 드러난다."` |
| `type` | string | required | 메모 유형. `MEMO` \| `HIGHLIGHT` | `"HIGHLIGHT"` |
| `createdAt` | string | required | 등록일시 (ISO 8601) | `"2024-02-10T15:00:00.000Z"` |
| `updatedAt` | string | required | 수정일시 (ISO 8601) | `"2024-02-10T15:00:00.000Z"` |

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `500` | `"메모 조회 실패"` | 서버 내부 오류 |

### Response Sample

```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "bookId": 1,
      "page": 42,
      "content": "이 장면에서 복선이 드러난다.",
      "type": "HIGHLIGHT",
      "createdAt": "2024-02-10T15:00:00.000Z",
      "updatedAt": "2024-02-10T15:00:00.000Z"
    },
    {
      "id": 7,
      "bookId": 1,
      "page": 120,
      "content": "결말의 반전을 암시하는 대사",
      "type": "HIGHLIGHT",
      "createdAt": "2024-02-12T09:00:00.000Z",
      "updatedAt": "2024-02-12T09:00:00.000Z"
    }
  ],
  "total": 2
}
```

---

## POST /api/books/:bookId/memos

특정 도서에 새 메모 또는 하이라이트 구절을 등록한다.

### Request

인증 필요 여부: 세션 불필요

**Path Parameters**

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|----------|------|------|------|------|
| `bookId` | number | required | 도서 고유 ID | `1` |

**Body** (application/json)

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `content` | string | required | 메모 내용 | `"이 장면에서 복선이 드러난다."` |
| `page` | number | 선택 | 페이지 번호 | `42` |
| `type` | string | 선택 | 메모 유형. `MEMO` \| `HIGHLIGHT`. 미입력 시 `MEMO` | `"HIGHLIGHT"` |

### Request Sample

```json
{
  "page": 42,
  "content": "이 장면에서 복선이 드러난다.",
  "type": "HIGHLIGHT"
}
```

### Response

**Success (201)**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `data` | object | required | 등록된 메모 정보 | `{...}` |

**data 필드**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `id` | number | required | 메모 고유 ID | `5` |
| `bookId` | number | required | 도서 ID | `1` |
| `page` | number \| null | required | 페이지 번호 | `42` |
| `content` | string | required | 메모 내용 | `"이 장면에서 복선이 드러난다."` |
| `type` | string | required | 메모 유형. `MEMO` \| `HIGHLIGHT` | `"HIGHLIGHT"` |
| `createdAt` | string | required | 등록일시 (ISO 8601) | `"2024-02-10T15:00:00.000Z"` |
| `updatedAt` | string | required | 수정일시 (ISO 8601) | `"2024-02-10T15:00:00.000Z"` |

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `500` | `"메모 등록 실패"` | 서버 내부 오류 |

### Response Sample

```json
{
  "success": true,
  "data": {
    "id": 5,
    "bookId": 1,
    "page": 42,
    "content": "이 장면에서 복선이 드러난다.",
    "type": "HIGHLIGHT",
    "createdAt": "2024-02-10T15:00:00.000Z",
    "updatedAt": "2024-02-10T15:00:00.000Z"
  }
}
```

---

## PUT /api/memos/:id

특정 메모의 내용을 수정한다.

### Request

인증 필요 여부: 세션 불필요

**Path Parameters**

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|----------|------|------|------|------|
| `id` | number | required | 메모 고유 ID | `5` |

**Body** (application/json)

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `content` | string | 선택 | 메모 내용 | `"수정된 메모 내용"` |
| `page` | number | 선택 | 페이지 번호 | `50` |
| `type` | string | 선택 | 메모 유형. `MEMO` \| `HIGHLIGHT` | `"MEMO"` |

### Request Sample

```json
{
  "page": 50,
  "content": "수정된 메모 내용",
  "type": "MEMO"
}
```

### Response

**Success (200)**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `data` | object | required | 수정된 메모 정보 | `{...}` |

**data 필드**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `id` | number | required | 메모 고유 ID | `5` |
| `bookId` | number | required | 도서 ID | `1` |
| `page` | number \| null | required | 페이지 번호 | `50` |
| `content` | string | required | 메모 내용 | `"수정된 메모 내용"` |
| `type` | string | required | 메모 유형. `MEMO` \| `HIGHLIGHT` | `"MEMO"` |
| `createdAt` | string | required | 등록일시 (ISO 8601) | `"2024-02-10T15:00:00.000Z"` |
| `updatedAt` | string | required | 수정일시 (ISO 8601) | `"2024-02-15T10:30:00.000Z"` |

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `404` | `"메모를 찾을 수 없습니다."` | 해당 ID의 메모가 존재하지 않음 (Prisma P2025) |
| `500` | `"메모 수정 실패"` | 서버 내부 오류 |

### Response Sample

```json
{
  "success": true,
  "data": {
    "id": 5,
    "bookId": 1,
    "page": 50,
    "content": "수정된 메모 내용",
    "type": "MEMO",
    "createdAt": "2024-02-10T15:00:00.000Z",
    "updatedAt": "2024-02-15T10:30:00.000Z"
  }
}
```

---

## DELETE /api/memos/:id

특정 메모를 삭제한다.

> 도서(Book)가 삭제되면 연결된 메모도 함께 삭제된다 (Cascade).

### Request

인증 필요 여부: 세션 불필요

**Path Parameters**

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|----------|------|------|------|------|
| `id` | number | required | 메모 고유 ID | `5` |

### Request Sample

```
DELETE /api/memos/5
```

### Response

**Success (200)**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `message` | string | required | 처리 결과 메시지 | `"메모가 삭제되었습니다."` |

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `404` | `"메모를 찾을 수 없습니다."` | 해당 ID의 메모가 존재하지 않음 (Prisma P2025) |
| `500` | `"메모 삭제 실패"` | 서버 내부 오류 |

### Response Sample

```json
{
  "success": true,
  "message": "메모가 삭제되었습니다."
}
```
