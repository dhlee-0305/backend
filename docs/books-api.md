# 도서 (Books) API

---

## 엔드포인트 목록

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/books` | 도서 목록 조회 |
| GET | `/api/books/:id` | 도서 상세 조회 |
| POST | `/api/books` | 도서 등록 |
| PUT | `/api/books/:id` | 도서 수정 |
| DELETE | `/api/books/:id` | 도서 삭제 |

---

## GET /api/books

필터, 검색, 정렬, 페이지네이션 조건을 적용하여 도서 목록을 조회한다.

### Request

인증 필요 여부: 세션 불필요

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 | 예시 |
|----------|------|------|--------|------|------|
| `status` | string | 선택 | - | 도서 상태 필터. `OWNED` \| `SOLD` \| `DONATED` | `OWNED` |
| `genre` | string | 선택 | - | 장르 필터 (완전 일치) | `소설` |
| `search` | string | 선택 | - | 제목 / 저자 / ISBN 부분 일치 검색 | `해리포터` |
| `readStatus` | string | 선택 | - | 독서 상태 필터. `READ` \| `EXCLUDED` \| `NONE` (`NONE`은 독서 기록이 없는 책) | `READ` |
| `userName` | string | 선택 | - | 독서 기록의 독자 이름 필터. `readStatus`와 함께 적용 가능 | `홍길동` |
| `sortBy` | string | 선택 | `createdAt` | 정렬 기준 컬럼명 | `title` |
| `order` | string | 선택 | `desc` | 정렬 방향. `asc` \| `desc` | `asc` |
| `page` | number | 선택 | `1` | 페이지 번호 (1부터 시작) | `2` |
| `limit` | number | 선택 | `10` | 페이지당 항목 수 | `20` |

> `readStatus=NONE`과 `userName`을 함께 사용하면, 해당 독자의 독서 기록이 없는 책을 필터링한다.

### Request Sample

```
GET /api/books?status=OWNED&genre=소설&search=해리&readStatus=READ&userName=홍길동&sortBy=title&order=asc&page=1&limit=10
```

### Response

**Success (200)**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `data` | array | required | 도서 목록 | `[...]` |
| `total` | number | required | 필터 조건에 맞는 전체 도서 수 | `42` |
| `page` | number | required | 현재 페이지 번호 | `1` |
| `limit` | number | required | 페이지당 항목 수 | `10` |

**data[] 항목 필드**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `id` | number | required | 도서 고유 ID | `1` |
| `title` | string | required | 제목 | `"해리포터와 마법사의 돌"` |
| `author` | string | required | 저자 | `"J.K. 롤링"` |
| `publisher` | string \| null | required | 출판사 | `"문학수첩"` |
| `isbn` | string \| null | required | ISBN | `"9788983920775"` |
| `genre` | string \| null | required | 장르 | `"판타지"` |
| `coverUrl` | string \| null | required | 표지 이미지 URL | `"https://example.com/cover.jpg"` |
| `purchaseDate` | string \| null | required | 구입일 (ISO 8601) | `"2024-01-15T00:00:00.000Z"` |
| `status` | string | required | 도서 상태. `OWNED` \| `SOLD` \| `DONATED` | `"OWNED"` |
| `createdAt` | string | required | 등록일시 (ISO 8601) | `"2024-01-15T12:00:00.000Z"` |
| `updatedAt` | string | required | 수정일시 (ISO 8601) | `"2024-03-10T08:30:00.000Z"` |
| `readingLogs` | array | required | 독서 기록 요약 목록 | `[...]` |
| `_count` | object | required | 연관 데이터 카운트 | `{ "memos": 3 }` |

**data[].readingLogs[] 항목 필드**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `readStatus` | string \| null | required | 읽기 상태. `READ` \| `EXCLUDED` | `"READ"` |
| `rating` | number \| null | required | 별점 (0.0 ~ 5.0) | `4.5` |
| `startDate` | string \| null | required | 독서 시작일 (ISO 8601) | `"2024-02-01T00:00:00.000Z"` |
| `endDate` | string \| null | required | 독서 완료일 (ISO 8601) | `"2024-02-20T00:00:00.000Z"` |
| `userName` | string \| null | required | 독자 이름 | `"홍길동"` |

**data[]._count 필드**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `memos` | number | required | 해당 도서의 메모 수 | `3` |

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `500` | `"도서 목록 조회 실패"` | 서버 내부 오류 |

### Response Sample

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "해리포터와 마법사의 돌",
      "author": "J.K. 롤링",
      "publisher": "문학수첩",
      "isbn": "9788983920775",
      "genre": "판타지",
      "coverUrl": "https://example.com/cover.jpg",
      "purchaseDate": "2024-01-15T00:00:00.000Z",
      "status": "OWNED",
      "createdAt": "2024-01-15T12:00:00.000Z",
      "updatedAt": "2024-03-10T08:30:00.000Z",
      "readingLogs": [
        {
          "readStatus": "READ",
          "rating": 4.5,
          "startDate": "2024-02-01T00:00:00.000Z",
          "endDate": "2024-02-20T00:00:00.000Z",
          "userName": "홍길동"
        }
      ],
      "_count": {
        "memos": 3
      }
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10
}
```

---

## GET /api/books/:id

특정 도서의 상세 정보를 독서 기록 및 메모 전체와 함께 조회한다.

### Request

인증 필요 여부: 세션 불필요

**Path Parameters**

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|----------|------|------|------|------|
| `id` | number | required | 도서 고유 ID | `1` |

### Request Sample

```
GET /api/books/1
```

### Response

**Success (200)**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `data` | object | required | 도서 상세 정보 | `{...}` |

**data 필드**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `id` | number | required | 도서 고유 ID | `1` |
| `title` | string | required | 제목 | `"해리포터와 마법사의 돌"` |
| `author` | string | required | 저자 | `"J.K. 롤링"` |
| `publisher` | string \| null | required | 출판사 | `"문학수첩"` |
| `isbn` | string \| null | required | ISBN | `"9788983920775"` |
| `genre` | string \| null | required | 장르 | `"판타지"` |
| `coverUrl` | string \| null | required | 표지 이미지 URL | `"https://example.com/cover.jpg"` |
| `purchaseDate` | string \| null | required | 구입일 (ISO 8601) | `"2024-01-15T00:00:00.000Z"` |
| `status` | string | required | 도서 상태. `OWNED` \| `SOLD` \| `DONATED` | `"OWNED"` |
| `createdAt` | string | required | 등록일시 (ISO 8601) | `"2024-01-15T12:00:00.000Z"` |
| `updatedAt` | string | required | 수정일시 (ISO 8601) | `"2024-03-10T08:30:00.000Z"` |
| `readingLogs` | array | required | 독서 기록 전체 목록 | `[...]` |
| `memos` | array | required | 메모 전체 목록 (등록일 내림차순 정렬) | `[...]` |

**data.readingLogs[] 항목 필드**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `id` | number | required | 독서 기록 고유 ID | `10` |
| `bookId` | number | required | 도서 ID | `1` |
| `userName` | string \| null | required | 독자 이름 | `"홍길동"` |
| `readStatus` | string \| null | required | 읽기 상태. `READ` \| `EXCLUDED` | `"READ"` |
| `startDate` | string \| null | required | 독서 시작일 (ISO 8601) | `"2024-02-01T00:00:00.000Z"` |
| `endDate` | string \| null | required | 독서 완료일 (ISO 8601) | `"2024-02-20T00:00:00.000Z"` |
| `rating` | number \| null | required | 별점 (0.0 ~ 5.0) | `4.5` |
| `review` | string \| null | required | 텍스트 리뷰 | `"정말 재미있는 책입니다."` |
| `createdAt` | string | required | 등록일시 (ISO 8601) | `"2024-02-20T21:00:00.000Z"` |
| `updatedAt` | string | required | 수정일시 (ISO 8601) | `"2024-02-20T21:00:00.000Z"` |

**data.memos[] 항목 필드**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `id` | number | required | 메모 고유 ID | `5` |
| `bookId` | number | required | 도서 ID | `1` |
| `page` | number \| null | required | 페이지 번호 | `42` |
| `content` | string | required | 메모 내용 | `"복선이 인상적인 장면"` |
| `type` | string | required | 메모 유형. `MEMO` \| `HIGHLIGHT` | `"HIGHLIGHT"` |
| `createdAt` | string | required | 등록일시 (ISO 8601) | `"2024-02-10T15:00:00.000Z"` |
| `updatedAt` | string | required | 수정일시 (ISO 8601) | `"2024-02-10T15:00:00.000Z"` |

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `404` | `"도서를 찾을 수 없습니다."` | 해당 ID의 도서가 존재하지 않음 |
| `500` | `"도서 조회 실패"` | 서버 내부 오류 |

### Response Sample

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "해리포터와 마법사의 돌",
    "author": "J.K. 롤링",
    "publisher": "문학수첩",
    "isbn": "9788983920775",
    "genre": "판타지",
    "coverUrl": "https://example.com/cover.jpg",
    "purchaseDate": "2024-01-15T00:00:00.000Z",
    "status": "OWNED",
    "createdAt": "2024-01-15T12:00:00.000Z",
    "updatedAt": "2024-03-10T08:30:00.000Z",
    "readingLogs": [
      {
        "id": 10,
        "bookId": 1,
        "userName": "홍길동",
        "readStatus": "READ",
        "startDate": "2024-02-01T00:00:00.000Z",
        "endDate": "2024-02-20T00:00:00.000Z",
        "rating": 4.5,
        "review": "정말 재미있는 책입니다.",
        "createdAt": "2024-02-20T21:00:00.000Z",
        "updatedAt": "2024-02-20T21:00:00.000Z"
      }
    ],
    "memos": [
      {
        "id": 5,
        "bookId": 1,
        "page": 42,
        "content": "복선이 인상적인 장면",
        "type": "HIGHLIGHT",
        "createdAt": "2024-02-10T15:00:00.000Z",
        "updatedAt": "2024-02-10T15:00:00.000Z"
      }
    ]
  }
}
```

---

## POST /api/books

새 도서를 등록한다.

### Request

인증 필요 여부: 세션 불필요

**Body** (application/json)

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `title` | string | required | 제목 | `"해리포터와 마법사의 돌"` |
| `author` | string | required | 저자 | `"J.K. 롤링"` |
| `publisher` | string | 선택 | 출판사 | `"문학수첩"` |
| `isbn` | string | 선택 | ISBN. 전체 서비스 내 유일해야 함 (최대 30자) | `"9788983920775"` |
| `genre` | string | 선택 | 장르 | `"판타지"` |
| `coverUrl` | string | 선택 | 표지 이미지 URL | `"https://example.com/cover.jpg"` |
| `purchaseDate` | string | 선택 | 구입일 (ISO 8601 또는 날짜 문자열) | `"2024-01-15"` |
| `status` | string | 선택 | 도서 상태. `OWNED` \| `SOLD` \| `DONATED`. 미입력 시 `OWNED` | `"OWNED"` |

### Request Sample

```json
{
  "title": "해리포터와 마법사의 돌",
  "author": "J.K. 롤링",
  "publisher": "문학수첩",
  "isbn": "9788983920775",
  "genre": "판타지",
  "coverUrl": "https://example.com/cover.jpg",
  "purchaseDate": "2024-01-15",
  "status": "OWNED"
}
```

### Response

**Success (201)**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `data` | object | required | 등록된 도서 정보 | `{...}` |

**data 필드**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `id` | number | required | 도서 고유 ID | `1` |
| `title` | string | required | 제목 | `"해리포터와 마법사의 돌"` |
| `author` | string | required | 저자 | `"J.K. 롤링"` |
| `publisher` | string \| null | required | 출판사 | `"문학수첩"` |
| `isbn` | string \| null | required | ISBN | `"9788983920775"` |
| `genre` | string \| null | required | 장르 | `"판타지"` |
| `coverUrl` | string \| null | required | 표지 이미지 URL | `"https://example.com/cover.jpg"` |
| `purchaseDate` | string \| null | required | 구입일 (ISO 8601) | `"2024-01-15T00:00:00.000Z"` |
| `status` | string | required | 도서 상태 | `"OWNED"` |
| `createdAt` | string | required | 등록일시 (ISO 8601) | `"2024-01-15T12:00:00.000Z"` |
| `updatedAt` | string | required | 수정일시 (ISO 8601) | `"2024-01-15T12:00:00.000Z"` |

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `409` | `"이미 등록된 ISBN입니다."` | 동일한 ISBN이 이미 존재함 (Prisma P2002) |
| `500` | `"도서 등록 실패"` | 서버 내부 오류 |

### Response Sample

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "해리포터와 마법사의 돌",
    "author": "J.K. 롤링",
    "publisher": "문학수첩",
    "isbn": "9788983920775",
    "genre": "판타지",
    "coverUrl": "https://example.com/cover.jpg",
    "purchaseDate": "2024-01-15T00:00:00.000Z",
    "status": "OWNED",
    "createdAt": "2024-01-15T12:00:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

---

## PUT /api/books/:id

특정 도서의 정보를 수정한다.

### Request

인증 필요 여부: 세션 불필요

**Path Parameters**

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|----------|------|------|------|------|
| `id` | number | required | 도서 고유 ID | `1` |

**Body** (application/json)

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `title` | string | 선택 | 제목 | `"해리포터와 비밀의 방"` |
| `author` | string | 선택 | 저자 | `"J.K. 롤링"` |
| `publisher` | string | 선택 | 출판사 | `"문학수첩"` |
| `isbn` | string | 선택 | ISBN. 전체 서비스 내 유일해야 함 (최대 30자) | `"9788983920782"` |
| `genre` | string | 선택 | 장르 | `"판타지"` |
| `coverUrl` | string | 선택 | 표지 이미지 URL | `"https://example.com/cover2.jpg"` |
| `purchaseDate` | string | 선택 | 구입일 (ISO 8601 또는 날짜 문자열). 빈 값 전달 시 변경되지 않음 | `"2024-03-01"` |
| `status` | string | 선택 | 도서 상태. `OWNED` \| `SOLD` \| `DONATED` | `"SOLD"` |

### Request Sample

```json
{
  "title": "해리포터와 비밀의 방",
  "status": "SOLD"
}
```

### Response

**Success (200)**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `data` | object | required | 수정된 도서 정보 | `{...}` |

**data 필드**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `id` | number | required | 도서 고유 ID | `1` |
| `title` | string | required | 제목 | `"해리포터와 비밀의 방"` |
| `author` | string | required | 저자 | `"J.K. 롤링"` |
| `publisher` | string \| null | required | 출판사 | `"문학수첩"` |
| `isbn` | string \| null | required | ISBN | `"9788983920775"` |
| `genre` | string \| null | required | 장르 | `"판타지"` |
| `coverUrl` | string \| null | required | 표지 이미지 URL | `"https://example.com/cover.jpg"` |
| `purchaseDate` | string \| null | required | 구입일 (ISO 8601) | `"2024-01-15T00:00:00.000Z"` |
| `status` | string | required | 도서 상태 | `"SOLD"` |
| `createdAt` | string | required | 등록일시 (ISO 8601) | `"2024-01-15T12:00:00.000Z"` |
| `updatedAt` | string | required | 수정일시 (ISO 8601) | `"2024-03-10T08:30:00.000Z"` |

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `404` | `"도서를 찾을 수 없습니다."` | 해당 ID의 도서가 존재하지 않음 (Prisma P2025) |
| `500` | `"도서 수정 실패"` | 서버 내부 오류 |

### Response Sample

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "해리포터와 비밀의 방",
    "author": "J.K. 롤링",
    "publisher": "문학수첩",
    "isbn": "9788983920775",
    "genre": "판타지",
    "coverUrl": "https://example.com/cover.jpg",
    "purchaseDate": "2024-01-15T00:00:00.000Z",
    "status": "SOLD",
    "createdAt": "2024-01-15T12:00:00.000Z",
    "updatedAt": "2024-03-10T08:30:00.000Z"
  }
}
```

---

## DELETE /api/books/:id

특정 도서를 삭제한다. 연결된 독서 기록(ReadingLog)과 메모(Memo)도 함께 삭제된다 (Cascade).

### Request

인증 필요 여부: 세션 불필요

**Path Parameters**

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|----------|------|------|------|------|
| `id` | number | required | 도서 고유 ID | `1` |

### Request Sample

```
DELETE /api/books/1
```

### Response

**Success (200)**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `message` | string | required | 처리 결과 메시지 | `"도서가 삭제되었습니다."` |

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `404` | `"도서를 찾을 수 없습니다."` | 해당 ID의 도서가 존재하지 않음 (Prisma P2025) |
| `500` | `"도서 삭제 실패"` | 서버 내부 오류 |

### Response Sample

```json
{
  "success": true,
  "message": "도서가 삭제되었습니다."
}
```
