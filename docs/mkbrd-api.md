# 문서 게시판 (Mkbrd) API

---

## 엔드포인트 목록

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/mkbrd` | 문서 목록 조회 (페이징) |
| GET | `/api/mkbrd/:id` | 문서 상세 조회 (Markdown 본문 포함) |
| GET | `/api/mkbrd/:id/image/*` | 문서 이미지 조회 |
| POST | `/api/mkbrd` | 문서 등록 |
| PUT | `/api/mkbrd/:id` | 문서 수정 |
| DELETE | `/api/mkbrd/:id` | 문서 삭제 |

조회는 공개이며 등록·수정·삭제는 로그인 세션 쿠키가 필요하다. 로그인은 `POST /api/auth/login`을 사용한다. 로그인한 사용자는 모든 문서를 수정·삭제할 수 있다.

## 저장 규칙

- 파일: 서버를 프로젝트 루트에서 실행했을 때 `<프로젝트>/mkbrd/<카테고리>/<확장자를 제외한 문서명>/<제목>`에 UTF-8 Markdown으로 저장한다.
- 예: `안내.md`는 `mkbrd/AI/안내/안내.md`에 저장하며 이미지는 `mkbrd/AI/안내/image/`에 압축 해제한다. ZIP 원본은 저장하지 않는다.
- 기존 버전의 `mkbrd/<카테고리>/<파일명>` 문서는 계속 조회·삭제할 수 있으며 수정 시 새 폴더 구조로 전환된다.
- 카테고리: `AI`, `관리`, `설계`, `기타`.
- 제목은 `.md` 확장자를 포함하는 파일명이다. 최대 240 UTF-8 바이트이며 경로 문자, 제어 문자, 선행 마침표, 문서명의 끝 공백·마침표 및 Windows 예약 파일명은 허용하지 않는다.
- 같은 카테고리의 파일명은 유일하다. DB의 기존 MySQL collation에 따라 대소문자도 중복으로 취급될 수 있다.
- 문서 메타데이터는 `mkbrd`, 변경 이력은 `mkbrd_hist`에 저장한다. 제목은 업로드한 원본 파일명이며 크기는 업로드한 파일의 실제 바이트 수이다. 본문을 DB에 저장하지 않으므로 기존 테이블 컬럼과 데이터는 그대로 사용한다.
- 이력 필드: `id`, `documentId`, `userId`, `action` (`등록`, `수정`, `삭제`), `createdAt`. `userId`는 요청 본문 대신 로그인 세션에서 가져온다. 문서를 삭제해도 이력은 유지된다.
- 등록·수정은 `multipart/form-data`를 사용한다. `file` 필드로 UTF-8 `.md` 파일 한 개, 선택 사항인 `images` 필드로 이미지 ZIP 한 개를 업로드한다. 각 파일 크기는 최대 10MB (10,485,760바이트)이다. 빈 Markdown 파일도 허용한다.
- 파일은 UTF-8 유효성을 확인한 뒤 BOM·줄바꿈을 포함한 원본 바이트 그대로 저장한다. 확장자로 Markdown 형식을 검증하며 MIME type은 제한하지 않는다. 잘못된 UTF-8 및 NUL 문자를 포함한 파일은 거부한다.
- 이미지 ZIP의 내부 상대 경로를 유지해 문서 폴더의 `image/` 아래에 압축 해제한다. 예: ZIP 내부 `도표/구성.png` → `<문서 폴더>/image/도표/구성.png`. Markdown에서는 `![구성](image/도표/구성.png)`로 참조할 수 있다.
- 이미지 ZIP은 `png`, `jpg`, `jpeg`, `gif`, `webp`, `avif`, `bmp`, `ico`, `svg` 확장자만 허용한다. 비이미지 파일, 경로 탈출, 심볼릭 링크·특수 파일, 암호화 항목, 중복 경로, 손상된 ZIP은 400으로 거부한다. 이미지 확장자로 파일 형식을 검증한다.
- 압축 해제 후 전체 크기는 최대 100MB, ZIP 파일·디렉터리 항목은 최대 1000개이다. ZIP 내부에 `image/` 폴더를 포함하면 `image/image/`에 저장되므로 이미지 파일과 하위 디렉터리를 ZIP 루트에 배치한다.
- ZIP을 포함한 수정은 기존 이미지를 전체 교체한다. ZIP 생략 시 이미지를 유지하며, 빈 ZIP 첨부 시 이미지를 모두 비운다. 문서 삭제는 이미지와 문서 폴더도 함께 삭제한다.
- JSON `content`와 별도 `title` 입력은 지원하지 않는다. 업로드 파일명이 제목이 된다. multipart의 텍스트 필드는 `category` 한 개만 허용한다.
- 브라우저에서는 `FormData`를 사용하고 Content-Type을 직접 지정하지 않는다. 클라이언트가 multipart boundary를 생성하도록 한다.

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
| `title` | string | required | 업로드 원본 파일명 (제목) | `안내.md` |
| `size` | number | required | 업로드 파일의 실제 크기 (바이트) | `8` |
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
| `imageBaseUrl` | string | required | 이미지 조회 기본 URL | `/api/mkbrd/1/image/` |

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
    "content": "# 안내",
    "imageBaseUrl": "/api/mkbrd/1/image/"
  }
}
```

---

## GET /api/mkbrd/:id/image/*

문서에 첨부된 이미지 파일을 바이너리로 반환한다.

### Request

인증 필요 여부: 세션 불필요

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|----------|------|------|------|------|
| `id` | number | required | 문서 ID | `1` |
| `*` | string | required | `image/` 아래 상대 이미지 경로, 하위 디렉터리 지원 | `도표/구성.png` |

### Request Sample

```http
GET /api/mkbrd/1/image/도표/구성.png
```

URL의 한글·공백 등은 클라이언트에서 인코딩한다. Markdown의 `image/도표/구성.png`는 상세 응답의 `imageBaseUrl`에 `도표/구성.png`를 붙인 API URL로 표시한다. 프런트엔드 Markdown 렌더러에서 이 상대 경로를 변환해야 한다.

### Response

**Success (200)**: 이미지 바이너리와 확장자에 따른 `Content-Type`. `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox; default-src 'none'; style-src 'unsafe-inline'`, `Cache-Control: no-cache` 헤더를 포함한다.

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `400` | 입력 검증 메시지 | 잘못된 ID 또는 안전하지 않은 이미지 경로 |
| `404` | `문서를 찾을 수 없습니다.` / `이미지를 찾을 수 없습니다.` | 문서 또는 이미지가 없음 |
| `500` | `문서 처리 실패` | DB 또는 파일 읽기 오류 |

---

## POST /api/mkbrd

문서 파일과 메타데이터를 생성하고 `등록` 이력을 기록한다.

### Request

인증 필요 여부: 로그인 세션 필요

**Body** (multipart/form-data)

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `category` | string | required | 허용된 카테고리 | `AI` |
| `file` | file | required | UTF-8 Markdown 파일 한 개 (최대 10MB) | `안내.md` |
| `images` | file | 선택 | 이미지 ZIP 한 개 (최대 10MB) | `images.zip` |

`title`, `id`, `size`, 날짜, `userId`는 클라이언트에서 지정하지 않는다. 업로드 파일명이 `title`에 저장된다.

### Request Sample

```bash
curl -X POST http://localhost:4000/api/mkbrd \
  -b cookies.txt \
  -F 'category=AI' \
  -F 'file=@./안내.md;type=text/markdown' \
  -F 'images=@./images.zip;type=application/zip'
```

### Response

**Success (201)**: `{ "success": true, "data": { ... } }`. `data`는 목록의 공통 메타데이터 필드와 동일하며 `content`는 포함하지 않는다.

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `400` | 입력 검증 메시지 | 필수 필드 누락, 파일명/UTF-8/ZIP 오류, 비허용 추가 필드/파일 또는 잘못된 multipart |
| `401` | `로그인이 필요합니다.` | 로그인하지 않음 |
| `409` | `같은 카테고리에 동일한 파일명이 존재합니다.` | DB 중복 또는 기존 파일 존재 |
| `413` | `파일 크기는 10MB 이하여야 합니다.` | 문서 파일 또는 이미지 ZIP이 각각 10MB 초과 |
| `415` | `multipart/form-data 형식으로 파일을 업로드해 주세요.` | JSON 등 다른 요청 형식 |
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

새 문서 파일·이미지 ZIP으로 교체하거나 카테고리를 변경하고 `수정` 이력을 기록한다. 파일 업로드 시 새 원본 파일명으로 제목이 변경되며 크기도 다시 계산한다. 카테고리만 전송하면 기존 파일명과 원본 바이트를 유지하면서 이미지가 포함된 폴더를 이동한다. 이미지 ZIP만 전송하면 Markdown은 유지하고 이미지만 전체 교체한다. 문서명 변경 시 폴더명도 함께 변경되며 ZIP을 생략하면 기존 이미지를 유지한다.

### Request

인증 필요 여부: 로그인 세션 필요

**Path Parameters**: `id` (필수), 상세 조회와 동일.

**Body** (multipart/form-data)

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `category` | string | 선택 | 새 카테고리 | `설계` |
| `file` | file | 선택 | 교체할 UTF-8 `.md` 파일 한 개 (최대 10MB) | `설계.md` |
| `images` | file | 선택 | 기존 이미지 전체를 교체할 ZIP 한 개 (최대 10MB) | `images.zip` |

세 필드 중 하나 이상 필요하다. 파일만 전송하면 기존 카테고리를 유지한다. 카테고리만 변경할 때도 multipart/form-data를 사용한다. 파일명만 바꾸려면 변경된 이름의 파일을 다시 업로드한다.

### Request Sample

```bash
curl -X PUT http://localhost:4000/api/mkbrd/1 \
  -b cookies.txt \
  -F 'category=설계' \
  -F 'file=@./설계.md;type=text/markdown' \
  -F 'images=@./images.zip;type=application/zip'
```

이미지만 교체:

```bash
curl -X PUT http://localhost:4000/api/mkbrd/1 -b cookies.txt -F 'images=@./new-images.zip'
```

카테고리만 변경:

```bash
curl -X PUT http://localhost:4000/api/mkbrd/1 -b cookies.txt -F 'category=관리'
```

### Response

**Success (200)**: `{ "success": true, "data": { ... } }`. `data`는 변경 후 공통 메타데이터이다. 등록 응답 예시와 동일한 형식이다.

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `400` | 입력 검증 메시지 | 잘못된 ID/파일명/UTF-8/ZIP, 비허용 추가 필드/파일, 잘못된 multipart 또는 변경 항목 없음 |
| `401` | `로그인이 필요합니다.` | 로그인하지 않음 |
| `404` | `문서를 찾을 수 없습니다.` | 해당 문서 없음 |
| `409` | `같은 카테고리에 동일한 파일명이 존재합니다.` | 변경할 파일명 중복 |
| `413` | `파일 크기는 10MB 이하여야 합니다.` | 문서 파일 또는 이미지 ZIP이 각각 10MB 초과 |
| `415` | `multipart/form-data 형식으로 파일을 업로드해 주세요.` | JSON 등 다른 요청 형식 |
| `500` | `문서 처리 실패` | DB, 이력 또는 파일 처리 오류 |

---

## DELETE /api/mkbrd/:id

문서 파일·이미지가 포함된 문서 폴더와 메타데이터를 삭제하고 `삭제` 이력을 기록한다. 삭제 요청에는 첨부 파일을 보내지 않는다. 기존 이력은 삭제하지 않는다.

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

메타데이터와 이력은 하나의 DB 트랜잭션으로 처리한다. 문서와 이미지는 임시 폴더에서 준비하고 문서 폴더 전체의 백업·교체를 사용하며 요청 처리 중 오류 발생 시 원상복구한다. 프로세스 내 큐가 조회·변경 요청을 순서대로 처리하므로 이 기능은 단일 서버 프로세스로 운영한다. 강제 종료나 서버 장애 시 DB와 파일 간 완전한 원자성은 보장되지 않으므로 남은 `.mkbrd-*.bak`/`.mkbrd-*.tmp` 폴더와 DB를 확인하여 복구해야 한다.
