# 인증 (Auth) API

---

## 엔드포인트 목록

| Method | URL | 설명 |
|--------|-----|------|
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 현재 로그인 사용자 조회 |

---

## POST /api/auth/signup

이메일과 비밀번호를 입력받아 신규 사용자를 등록한다.

### Request

인증 필요 여부: 세션 불필요

**Body** (application/json)

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `email` | string | required | 사용자 이메일. 서비스 전체에서 유일해야 함 | `"user@example.com"` |
| `password` | string | required | 사용자 비밀번호. BCrypt(salt rounds: 10)로 암호화 저장 | `"password1234"` |

### Request Sample

```json
{
  "email": "user@example.com",
  "password": "password1234"
}
```

### Response

**Success (201)**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `data` | object | required | 등록된 사용자 정보 | `{...}` |

**data 필드**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `id` | number | required | 사용자 고유 ID | `1` |
| `email` | string | required | 사용자 이메일 | `"user@example.com"` |
| `createdAt` | string | required | 가입 일시 (ISO 8601) | `"2024-01-15T12:00:00.000Z"` |

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `400` | `"이메일과 비밀번호를 입력해 주세요."` | `email` 또는 `password` 누락 |
| `409` | `"이미 사용 중인 이메일입니다."` | 동일한 이메일로 가입된 사용자가 이미 존재함 |
| `500` | `"회원가입 실패"` | 서버 내부 오류 |

### Response Sample

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "createdAt": "2024-01-15T12:00:00.000Z"
  }
}
```

---

## POST /api/auth/login

이메일과 비밀번호로 인증 후 세션을 발급한다. 로그인 시도 결과(성공·실패)와 클라이언트 IP는 무조건 login_history에 기록된다.

### Request

인증 필요 여부: 세션 불필요

**Body** (application/json)

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `email` | string | required | 사용자 이메일 | `"user@example.com"` |
| `password` | string | required | 사용자 비밀번호 | `"password1234"` |

### Request Sample

```json
{
  "email": "user@example.com",
  "password": "password1234"
}
```

### Response

**Success (200)**

로그인 성공 시 서버에서 세션 쿠키(`connect.sid`)를 발급한다. 세션 유효 시간은 24시간이다.

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `data` | object | required | 로그인된 사용자 정보 | `{...}` |

**data 필드**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `id` | number | required | 사용자 고유 ID | `1` |
| `email` | string | required | 사용자 이메일 | `"user@example.com"` |

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `400` | `"이메일과 비밀번호를 입력해 주세요."` | `email` 또는 `password` 누락 |
| `401` | `"이메일 또는 비밀번호가 올바르지 않습니다."` | 이메일이 존재하지 않거나 비밀번호 불일치 |
| `500` | `"로그인 실패"` | 서버 내부 오류 |

### Response Sample

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

---

## POST /api/auth/logout

현재 세션을 파기하고 세션 쿠키를 삭제하여 로그아웃 처리한다.

### Request

인증 필요 여부: 세션 불필요 (세션이 없어도 요청 가능)

> 세션이 없는 상태에서 호출하면 서버는 파기할 세션이 없으므로 오류가 발생할 수 있다.

### Request Sample

```
POST /api/auth/logout
```

### Response

**Success (200)**

응답 시 `Set-Cookie` 헤더로 `connect.sid` 쿠키가 삭제된다.

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `message` | string | required | 처리 결과 메시지 | `"로그아웃 되었습니다."` |

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `500` | `"로그아웃 실패"` | 세션 파기 중 서버 내부 오류 |

### Response Sample

```json
{
  "success": true,
  "message": "로그아웃 되었습니다."
}
```

---

## GET /api/auth/me

현재 유효한 세션에 저장된 로그인 사용자 정보를 반환한다.

### Request

인증 필요 여부: 세션 필요

### Request Sample

```
GET /api/auth/me
```

### Response

**Success (200)**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `data` | object | required | 현재 로그인 사용자 정보 | `{...}` |

**data 필드**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `id` | number | required | 사용자 고유 ID | `1` |
| `email` | string | required | 사용자 이메일 | `"user@example.com"` |

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `401` | `"로그인이 필요합니다."` | 세션이 없거나 만료됨 |

### Response Sample

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com"
  }
}
```
