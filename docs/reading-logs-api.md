# 독서 기록 API

특정 도서에 대한 독서 기록(독자, 읽기 상태, 기간, 별점, 리뷰)을 등록·조회·수정·삭제하는 API입니다.

---

## 공통 사항

- 인증 필요 여부: 모든 엔드포인트에서 세션 인증이 불필요합니다.
- 하나의 도서(`bookId`)에 독서 기록을 여러 개 등록할 수 있습니다 (재독 기록 지원).
- 대상 도서(`bookId`)가 삭제되면 연결된 독서 기록도 함께 삭제됩니다 (Cascade).

### ReadStatus 열거값

| 값 | 설명 |
|----|------|
| `READ` | 읽음 |
| `EXCLUDED` | 읽기 제외 |

---

## 1. 독서 기록 목록 조회

특정 도서에 등록된 모든 독서 기록을 등록일 내림차순으로 반환합니다.

### GET /api/books/:bookId/reading-logs

**인증 필요 여부:** 세션 불필요

### Request

**Path Parameters**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `bookId` | number | required | 조회할 도서의 ID | `1` |

### Request Sample

```
GET /api/books/1/reading-logs
```

### Response

**Success** `200 OK`

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `data` | array | required | 독서 기록 목록 | `[...]` |
| `total` | number | required | 전체 독서 기록 수 | `2` |
| `data[].id` | number | required | 독서 기록 ID | `1` |
| `data[].bookId` | number | required | 연결된 도서 ID | `1` |
| `data[].userName` | string \| null | required | 독자 이름 | `"홍길동"` |
| `data[].readStatus` | string \| null | required | 읽기 상태 (`READ`, `EXCLUDED`) | `"READ"` |
| `data[].startDate` | string \| null | required | 독서 시작일 (ISO 8601) | `"2024-01-10T00:00:00.000Z"` |
| `data[].endDate` | string \| null | required | 독서 완료일 (ISO 8601) | `"2024-02-05T00:00:00.000Z"` |
| `data[].rating` | number \| null | required | 별점 (0.0 ~ 5.0) | `4.5` |
| `data[].review` | string \| null | required | 텍스트 리뷰 | `"인상 깊은 책이었습니다."` |
| `data[].createdAt` | string | required | 기록 등록 일시 (ISO 8601) | `"2024-02-05T12:00:00.000Z"` |
| `data[].updatedAt` | string | required | 기록 수정 일시 (ISO 8601) | `"2024-02-05T12:00:00.000Z"` |

**Error**

| 상태코드 | 발생 조건 | `message` |
|----------|-----------|-----------|
| `500` | 서버 내부 오류 | `"독서 기록 조회 실패"` |

### Response Sample

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "bookId": 1,
      "userName": "홍길동",
      "readStatus": "READ",
      "startDate": "2024-06-01T00:00:00.000Z",
      "endDate": "2024-06-20T00:00:00.000Z",
      "rating": 5.0,
      "review": "두 번째로 읽었는데 더 좋았습니다.",
      "createdAt": "2024-06-20T09:30:00.000Z",
      "updatedAt": "2024-06-20T09:30:00.000Z"
    },
    {
      "id": 1,
      "bookId": 1,
      "userName": "홍길동",
      "readStatus": "READ",
      "startDate": "2024-01-10T00:00:00.000Z",
      "endDate": "2024-02-05T00:00:00.000Z",
      "rating": 4.5,
      "review": "인상 깊은 책이었습니다.",
      "createdAt": "2024-02-05T12:00:00.000Z",
      "updatedAt": "2024-02-05T12:00:00.000Z"
    }
  ],
  "total": 2
}
```

---

## 2. 독서 기록 등록

특정 도서에 새로운 독서 기록을 등록합니다. 동일 도서에 여러 번 등록하여 재독 기록을 남길 수 있습니다.

### POST /api/books/:bookId/reading-logs

**인증 필요 여부:** 세션 불필요

### Request

**Path Parameters**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `bookId` | number | required | 독서 기록을 등록할 도서의 ID | `1` |

**Body** `application/json`

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `userName` | string | optional | 독자 이름 | `"홍길동"` |
| `readStatus` | string | optional | 읽기 상태 (`READ`, `EXCLUDED`) | `"READ"` |
| `startDate` | string | optional | 독서 시작일 (ISO 8601 또는 날짜 문자열) | `"2024-01-10"` |
| `endDate` | string | optional | 독서 완료일 (ISO 8601 또는 날짜 문자열) | `"2024-02-05"` |
| `rating` | number | optional | 별점 (0.0 ~ 5.0, 소수점 1자리) | `4.5` |
| `review` | string | optional | 텍스트 리뷰 | `"인상 깊은 책이었습니다."` |

### Request Sample

```json
POST /api/books/1/reading-logs
Content-Type: application/json

{
  "userName": "홍길동",
  "readStatus": "READ",
  "startDate": "2024-01-10",
  "endDate": "2024-02-05",
  "rating": 4.5,
  "review": "인상 깊은 책이었습니다."
}
```

### Response

**Success** `201 Created`

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `data` | object | required | 생성된 독서 기록 | `{...}` |
| `data.id` | number | required | 생성된 독서 기록 ID | `3` |
| `data.bookId` | number | required | 연결된 도서 ID | `1` |
| `data.userName` | string \| null | required | 독자 이름 | `"홍길동"` |
| `data.readStatus` | string \| null | required | 읽기 상태 (`READ`, `EXCLUDED`) | `"READ"` |
| `data.startDate` | string \| null | required | 독서 시작일 (ISO 8601) | `"2024-01-10T00:00:00.000Z"` |
| `data.endDate` | string \| null | required | 독서 완료일 (ISO 8601) | `"2024-02-05T00:00:00.000Z"` |
| `data.rating` | number \| null | required | 별점 (0.0 ~ 5.0) | `4.5` |
| `data.review` | string \| null | required | 텍스트 리뷰 | `"인상 깊은 책이었습니다."` |
| `data.createdAt` | string | required | 기록 등록 일시 (ISO 8601) | `"2024-02-05T12:00:00.000Z"` |
| `data.updatedAt` | string | required | 기록 수정 일시 (ISO 8601) | `"2024-02-05T12:00:00.000Z"` |

**Error**

| 상태코드 | 발생 조건 | `message` |
|----------|-----------|-----------|
| `500` | 서버 내부 오류 | `"독서 기록 등록 실패"` |

### Response Sample

```json
{
  "success": true,
  "data": {
    "id": 3,
    "bookId": 1,
    "userName": "홍길동",
    "readStatus": "READ",
    "startDate": "2024-01-10T00:00:00.000Z",
    "endDate": "2024-02-05T00:00:00.000Z",
    "rating": 4.5,
    "review": "인상 깊은 책이었습니다.",
    "createdAt": "2024-02-05T12:00:00.000Z",
    "updatedAt": "2024-02-05T12:00:00.000Z"
  }
}
```

---

## 3. 독서 기록 수정

기존 독서 기록의 내용을 수정합니다. 요청 바디에 포함된 필드만 업데이트됩니다.

### PUT /api/reading-logs/:id

**인증 필요 여부:** 세션 불필요

### Request

**Path Parameters**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `id` | number | required | 수정할 독서 기록의 ID | `1` |

**Body** `application/json`

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `userName` | string | optional | 독자 이름 | `"홍길동"` |
| `readStatus` | string | optional | 읽기 상태 (`READ`, `EXCLUDED`) | `"READ"` |
| `startDate` | string | optional | 독서 시작일 (ISO 8601 또는 날짜 문자열) | `"2024-01-10"` |
| `endDate` | string | optional | 독서 완료일 (ISO 8601 또는 날짜 문자열) | `"2024-02-10"` |
| `rating` | number | optional | 별점 (0.0 ~ 5.0, 소수점 1자리) | `5.0` |
| `review` | string | optional | 텍스트 리뷰 | `"다시 읽어도 좋은 책입니다."` |

### Request Sample

```json
PUT /api/reading-logs/1
Content-Type: application/json

{
  "endDate": "2024-02-10",
  "rating": 5.0,
  "review": "다시 읽어도 좋은 책입니다."
}
```

### Response

**Success** `200 OK`

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `data` | object | required | 수정된 독서 기록 | `{...}` |
| `data.id` | number | required | 독서 기록 ID | `1` |
| `data.bookId` | number | required | 연결된 도서 ID | `1` |
| `data.userName` | string \| null | required | 독자 이름 | `"홍길동"` |
| `data.readStatus` | string \| null | required | 읽기 상태 (`READ`, `EXCLUDED`) | `"READ"` |
| `data.startDate` | string \| null | required | 독서 시작일 (ISO 8601) | `"2024-01-10T00:00:00.000Z"` |
| `data.endDate` | string \| null | required | 독서 완료일 (ISO 8601) | `"2024-02-10T00:00:00.000Z"` |
| `data.rating` | number \| null | required | 별점 (0.0 ~ 5.0) | `5.0` |
| `data.review` | string \| null | required | 텍스트 리뷰 | `"다시 읽어도 좋은 책입니다."` |
| `data.createdAt` | string | required | 기록 등록 일시 (ISO 8601) | `"2024-02-05T12:00:00.000Z"` |
| `data.updatedAt` | string | required | 기록 수정 일시 (ISO 8601) | `"2024-03-01T10:00:00.000Z"` |

**Error**

| 상태코드 | 발생 조건 | `message` |
|----------|-----------|-----------|
| `404` | 해당 ID의 독서 기록이 존재하지 않음 | `"독서 기록을 찾을 수 없습니다."` |
| `500` | 서버 내부 오류 | `"독서 기록 수정 실패"` |

### Response Sample

```json
{
  "success": true,
  "data": {
    "id": 1,
    "bookId": 1,
    "userName": "홍길동",
    "readStatus": "READ",
    "startDate": "2024-01-10T00:00:00.000Z",
    "endDate": "2024-02-10T00:00:00.000Z",
    "rating": 5.0,
    "review": "다시 읽어도 좋은 책입니다.",
    "createdAt": "2024-02-05T12:00:00.000Z",
    "updatedAt": "2024-03-01T10:00:00.000Z"
  }
}
```

---

## 4. 독서 기록 삭제

특정 독서 기록을 영구 삭제합니다.

### DELETE /api/reading-logs/:id

**인증 필요 여부:** 세션 불필요

### Request

**Path Parameters**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `id` | number | required | 삭제할 독서 기록의 ID | `1` |

### Request Sample

```
DELETE /api/reading-logs/1
```

### Response

**Success** `200 OK`

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `message` | string | required | 처리 결과 메시지 | `"독서 기록이 삭제되었습니다."` |

**Error**

| 상태코드 | 발생 조건 | `message` |
|----------|-----------|-----------|
| `404` | 해당 ID의 독서 기록이 존재하지 않음 | `"독서 기록을 찾을 수 없습니다."` |
| `500` | 서버 내부 오류 | `"독서 기록 삭제 실패"` |

### Response Sample

```json
{
  "success": true,
  "message": "독서 기록이 삭제되었습니다."
}
```
