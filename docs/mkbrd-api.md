# 문서 게시판 (Mkbrd) API

---

## 엔드포인트 목록

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/mkbrd` | 문서 목록 조회 (페이징) |
| GET | `/api/mkbrd/:id` | 문서 상세 조회 (Markdown 본문 포함) |
| POST | `/api/mkbrd` | 문서 등록 |
| PUT | `/api/mkbrd/:id` | 문서 수정 |
| DELETE | `/api/mkbrd/:id` | 문서 삭제 |

조회는 공개이며 등록·수정·삭제는 로그인 세션 쿠키가 필요하다. 로그인은 `POST /api/auth/login`을 사용한다. 로그인한 사용자는 모든 문서를 수정·삭제할 수 있다.

## 저장 규칙

- 파일: 서버를 프로젝트 루트에서 실행했을 때 `<프로젝트>/mkbrd/<카테고리>/<제목>`에 UTF-8 Markdown으로 저장한다.
- 카테고리: `AI`, `관리`, `설계`, `기타`.
- 제목은 `.md` 확장자를 포함하는 파일명이다. 최대 240 UTF-8 바이트이며 경로 문자, 제어 문자, 선행 마침표 및 Windows 예약 파일명은 허용하지 않는다.
- 같은 카테고리의 파일명은 유일하다. DB의 기존 MySQL collation에 따라 대소문자도 중복으로 취급될 수 있다.
- 문서 메타데이터는 `mkbrd`, 변경 이력은 `mkbrd_hist`에 저장한다. 크기는 서버에서 계산한 UTF-8 바이트 수이다.
- 이력 필드: `id`, `documentId`, `userId`, `action` (`등록`, `수정`, `삭제`), `createdAt`. `userId`는 요청 본문 대신 로그인 세션에서 가져온다. 문서를 삭제해도 이력은 유지된다.
- 본문은 JSON의 `content` 문자열로 전송한다. multipart 파일 업로드는 지원하지 않는다. 기존 Express JSON 요청 크기 제한(기본 100KB)이 적용된다.

---

## GET /api/mkbrd

문서 메타데이터를 ID 내림차순으로 조회한다. 본문은 포함하지 않는다.

### Request

인증 필요 여부: 세션 불필요

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 | 예시 |
|----------|------|------|--------|------|------|
| `page` | number | 선택 | `1` | 1부터 시작하는 정수 | `2` |
| `limit` | number | 선택 | `10` | 페이지당 항목 수, 1~100 | `20` |
| `category` | string | 선택 | - | 카테고리 완전 일치 필터 | `AI` |

### Request Sample

```http
GET /api/mkbrd?category=AI&page=1&limit=10
```

### Response

**Success (200)**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `data` | array | required | 문서 메타데이터 목록 | `[...]` |
| `total` | number | required | 필터에 맞는 전체 개수 | `1` |
| `page` | number | required | 현재 페이지 | `1` |
| `limit` | number | required | 페이지당 항목 수 | `10` |

**data[] 항목 필드 (등록·수정 응답에도 동일하게 적용)**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `id` | number | required | 문서 ID (자동 증가) | `1` |
| `category` | string | required | 카테고리 | `AI` |
| `title` | string | required | 제목 및 파일명 | `안내.md` |
| `size` | number | required | UTF-8 파일 크기 (바이트) | `8` |
| `createdAt` | string | required | 등록일시 (ISO 8601) | `2026-11-11T00:00:00.000Z` |
| `updatedAt` | string | required | 수정일시 (ISO 8601) | `2026-11-11T00:00:00.000Z` |

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `400` | 입력 검증 메시지 | 잘못된 카테고리, page 또는 limit (페이징 offset 최대 2,147,483,647) |
| `500` | `문서 처리 실패` | DB 오류 |

### Response Sample

```json
{
  "success": true,
  "data": [{
    "id": 1,
    "category": "AI",
    "title": "안내.md",
    "size": 8,
    "createdAt": "2026-11-11T00:00:00.000Z",
    "updatedAt": "2026-11-11T00:00:00.000Z"
  }],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

---

## GET /api/mkbrd/:id

### Request

인증 필요 여부: 세션 불필요

**Path Parameters**

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|----------|------|------|------|------|
| `id` | number | required | 문서 ID, 1~2,147,483,647 정수 | `1` |

### Request Sample

```http
GET /api/mkbrd/1
```

### Response

**Success (200)**: `{ "success": true, "data": { ... } }`. `data`는 공통 문서 메타데이터와 다음 필드를 포함한다.

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `content` | string | required | Markdown 본문 | `# 안내` |

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `400` | 입력 검증 메시지 | 잘못된 ID |
| `404` | `문서를 찾을 수 없습니다.` | 해당 문서 없음 |
| `500` | `문서 처리 실패` | DB 또는 파일 읽기 오류 (메타데이터만 있고 파일이 없는 경우 포함) |

### Response Sample

```json
{
  "success": true,
  "data": {
    "id": 1,
    "category": "AI",
    "title": "안내.md",
    "size": 8,
    "createdAt": "2026-11-11T00:00:00.000Z",
    "updatedAt": "2026-11-11T00:00:00.000Z",
    "content": "# 안내"
  }
}
```

---

## POST /api/mkbrd

문서 파일과 메타데이터를 생성하고 `등록` 이력을 기록한다.

### Request

인증 필요 여부: 로그인 세션 필요

**Body** (application/json)

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `category` | string | required | 허용된 카테고리 | `AI` |
| `title` | string | required | `.md` 파일명 | `안내.md` |
| `content` | string | required | Markdown 본문, 빈 문자열 허용 | `# 안내` |

`id`, `size`, 날짜, `userId`는 클라이언트에서 지정하지 않는다.

### Request Sample

```json
{ "category": "AI", "title": "안내.md", "content": "# 안내" }
```

### Response

**Success (201)**: `{ "success": true, "data": { ... } }`. `data`는 목록의 공통 메타데이터 필드와 동일하며 `content`는 포함하지 않는다.

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `400` | 입력 검증 메시지 | 필수 필드 누락 또는 잘못된 형식 |
| `401` | `로그인이 필요합니다.` | 로그인하지 않음 |
| `409` | `같은 카테고리에 동일한 파일명이 존재합니다.` | DB 중복 또는 기존 파일 존재 |
| `500` | `문서 처리 실패` | DB, 이력 저장 또는 파일 쓰기 오류 |

### Response Sample

```json
{
  "success": true,
  "data": {
    "id": 1, "category": "AI", "title": "안내.md", "size": 8,
    "createdAt": "2026-11-11T00:00:00.000Z",
    "updatedAt": "2026-11-11T00:00:00.000Z"
  }
}
```

---

## PUT /api/mkbrd/:id

지정한 필드만 변경하고 `수정` 이력을 기록한다. 제목 또는 카테고리가 바뀌면 파일도 이동한다. `content` 생략 시 기존 본문을 유지한다.

### Request

인증 필요 여부: 로그인 세션 필요

**Path Parameters**: `id` (필수), 상세 조회와 동일.

**Body** (application/json)

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `category` | string | 선택 | 새 카테고리 | `설계` |
| `title` | string | 선택 | 새 `.md` 파일명 | `설계.md` |
| `content` | string | 선택 | 새 Markdown 본문, 빈 문자열은 본문 비우기 | `# 설계` |

세 필드 중 하나 이상 필요하며 `null`은 허용하지 않는다.

### Request Sample

```http
PUT /api/mkbrd/1
Content-Type: application/json

{ "category": "설계", "title": "설계.md" }
```

### Response

**Success (200)**: `{ "success": true, "data": { ... } }`. `data`는 변경 후 공통 메타데이터이다. 등록 응답 예시와 동일한 형식이다.

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `400` | 입력 검증 메시지 | 잘못된 ID/필드 또는 변경 항목 없음 |
| `401` | `로그인이 필요합니다.` | 로그인하지 않음 |
| `404` | `문서를 찾을 수 없습니다.` | 해당 문서 없음 |
| `409` | `같은 카테고리에 동일한 파일명이 존재합니다.` | 변경할 파일명 중복 |
| `500` | `문서 처리 실패` | DB, 이력 또는 파일 처리 오류 |

---

## DELETE /api/mkbrd/:id

파일과 메타데이터를 삭제하고 `삭제` 이력을 기록한다. 기존 이력은 삭제하지 않는다.

### Request

인증 필요 여부: 로그인 세션 필요

**Path Parameters**: `id` (필수), 상세 조회와 동일.

### Request Sample

```http
DELETE /api/mkbrd/1
```

### Response

**Success (200)**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `message` | string | required | 처리 결과 메시지 | `문서가 삭제되었습니다.` |

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `400` | 입력 검증 메시지 | 잘못된 ID |
| `401` | `로그인이 필요합니다.` | 로그인하지 않음 |
| `404` | `문서를 찾을 수 없습니다.` | 해당 문서 없음 |
| `500` | `문서 처리 실패` | DB, 이력 또는 파일 처리 오류 |

### Response Sample

```json
{ "success": true, "message": "문서가 삭제되었습니다." }
```

## 적용 및 운영

프로젝트 루트에서 `npx prisma generate`, `npx prisma migrate deploy` 실행 후 서버를 시작한다. 서버 실행 계정은 프로젝트 아래 `mkbrd/`에 쓰기 권한이 있어야 한다. 해당 디렉터리는 Git에서 제외되며 DB와 함께 별도로 백업한다.

메타데이터와 이력은 하나의 DB 트랜잭션으로 처리한다. 파일은 임시 파일과 백업을 사용하며 요청 처리 중 오류 발생 시 원상복구한다. 프로세스 내 큐가 조회·변경 요청을 순서대로 처리하므로 이 기능은 단일 서버 프로세스로 운영한다. 강제 종료나 서버 장애 시 DB와 파일 간 완전한 원자성은 보장되지 않으므로 남은 `.bak`/`.tmp` 파일과 DB를 확인하여 복구해야 한다.
