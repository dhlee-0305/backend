# 테스트 계획서 - 인증 (Auth) API

## 1. 테스트 범위 정의

### 포함
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/login` - 로그인 및 세션 발급
- `POST /api/auth/logout` - 로그아웃 및 세션 파기
- `GET /api/auth/me` - 현재 로그인 사용자 조회
- 세션 쿠키(`connect.sid`) 발급 및 삭제 검증
- 로그인 시도 내역(`login_history`) 기록 검증
- 비밀번호 BCrypt 암호화 저장 검증

### 제외
- 비밀번호 강도 정책 (현재 구현 없음)
- 이메일 형식 유효성 검사 (현재 구현 없음)
- 계정 잠금 / 로그인 횟수 제한 (현재 구현 없음)
- 소셜 로그인 (현재 구현 없음)
- 세션 갱신(refresh token) 로직 (현재 구현 없음)

---

## 2. 테스트 유형 구분

| 유형 | 설명 |
|------|------|
| **기능 테스트** | 각 엔드포인트의 정상 흐름 및 응답 구조 검증 |
| **경계값 테스트** | 필수 필드 누락, 빈 문자열 입력 처리 |
| **비즈니스 규칙 테스트** | 이메일 중복 방지, 로그인 이력 기록 |
| **보안 테스트** | 비밀번호 평문 응답 여부, 세션 인증 강제 여부 |
| **통합 테스트** | 회원가입 → 로그인 → 세션 확인 → 로그아웃 전체 흐름 |

---

## 3. 우선순위 산정 기준

| 우선순위 | 기준 |
|----------|------|
| **P1 - 긴급** | 서비스 진입 자체를 막는 장애, 인증 우회 가능 |
| **P2 - 높음** | 핵심 보안 규칙 위반, 데이터 무결성 훼손 |
| **P3 - 보통** | 에러 응답 포맷 불일치, 선택 필드 처리 오류 |
| **P4 - 낮음** | 메시지 오타, 응답 필드 순서 등 경미한 사항 |

---

## 4. 테스트 시나리오

### TC-AUTH-001: 회원가입 - 정상 등록
- **우선순위:** P1
- **엔드포인트:** `POST /api/auth/signup`
- **전제조건:** 해당 이메일이 DB에 존재하지 않음
- **요청:**
  ```json
  { "email": "user@example.com", "password": "password1234" }
  ```
- **기대 결과:**
  - HTTP 201
  - `success: true`
  - `data.id` 양의 정수
  - `data.email` 입력값과 일치
  - `data.createdAt` ISO 8601 형식
  - 응답에 `password` 필드 미포함
- **추가 검증:** DB에 비밀번호가 BCrypt 해시값(`$2b$...`)으로 저장되었는지 확인

---

### TC-AUTH-002: 회원가입 - 이메일 누락
- **우선순위:** P2
- **엔드포인트:** `POST /api/auth/signup`
- **요청:** `{ "password": "password1234" }`
- **기대 결과:** HTTP 400, `message: "이메일과 비밀번호를 입력해 주세요."`

---

### TC-AUTH-003: 회원가입 - 비밀번호 누락
- **우선순위:** P2
- **엔드포인트:** `POST /api/auth/signup`
- **요청:** `{ "email": "user@example.com" }`
- **기대 결과:** HTTP 400, `message: "이메일과 비밀번호를 입력해 주세요."`

---

### TC-AUTH-004: 회원가입 - 빈 문자열 입력
- **우선순위:** P2
- **엔드포인트:** `POST /api/auth/signup`
- **요청:** `{ "email": "", "password": "" }`
- **기대 결과:** HTTP 400, `success: false`
- **비고:** `""` 은 falsy 값이므로 400 처리 예상 (소스코드 `!email || !password` 조건)

---

### TC-AUTH-005: 회원가입 - 중복 이메일
- **우선순위:** P1
- **엔드포인트:** `POST /api/auth/signup`
- **전제조건:** `user@example.com` 이미 가입 완료
- **요청:** `{ "email": "user@example.com", "password": "newpassword" }`
- **기대 결과:** HTTP 409, `message: "이미 사용 중인 이메일입니다."`

---

### TC-AUTH-006: 로그인 - 정상 로그인
- **우선순위:** P1
- **엔드포인트:** `POST /api/auth/login`
- **전제조건:** `user@example.com` 가입 완료
- **요청:**
  ```json
  { "email": "user@example.com", "password": "password1234" }
  ```
- **기대 결과:**
  - HTTP 200, `success: true`
  - `data.id`, `data.email` 반환
  - 응답 헤더에 `Set-Cookie: connect.sid` 포함
- **추가 검증:** `login_history` 테이블에 `success: true`, `ipAddress` 기록 확인

---

### TC-AUTH-007: 로그인 - 존재하지 않는 이메일
- **우선순위:** P1
- **엔드포인트:** `POST /api/auth/login`
- **요청:** `{ "email": "notexist@example.com", "password": "password1234" }`
- **기대 결과:** HTTP 401, `message: "이메일 또는 비밀번호가 올바르지 않습니다."`
- **추가 검증:** `login_history` 에 `success: false` 기록 확인

---

### TC-AUTH-008: 로그인 - 비밀번호 불일치
- **우선순위:** P1
- **엔드포인트:** `POST /api/auth/login`
- **전제조건:** `user@example.com` 가입 완료
- **요청:** `{ "email": "user@example.com", "password": "wrongpassword" }`
- **기대 결과:** HTTP 401, `message: "이메일 또는 비밀번호가 올바르지 않습니다."`
- **추가 검증:** `login_history` 에 `success: false` 기록 확인

---

### TC-AUTH-009: 로그인 - 필드 누락
- **우선순위:** P2
- **엔드포인트:** `POST /api/auth/login`
- **요청:** `{ "email": "user@example.com" }`
- **기대 결과:** HTTP 400, `message: "이메일과 비밀번호를 입력해 주세요."`

---

### TC-AUTH-010: 로그인 - IP 기록 검증 (x-forwarded-for 헤더)
- **우선순위:** P2
- **엔드포인트:** `POST /api/auth/login`
- **요청 헤더:** `x-forwarded-for: 203.0.113.1`
- **기대 결과:** `login_history.ipAddress` 에 `203.0.113.1` 저장 확인
- **비고:** 프록시 환경에서 실제 클라이언트 IP 추적 검증

---

### TC-AUTH-011: 현재 사용자 조회 - 로그인 상태
- **우선순위:** P1
- **엔드포인트:** `GET /api/auth/me`
- **전제조건:** 로그인 후 세션 쿠키 보유
- **기대 결과:** HTTP 200, `data.id`·`data.email` 세션 저장값과 일치

---

### TC-AUTH-012: 현재 사용자 조회 - 비로그인 상태
- **우선순위:** P1
- **엔드포인트:** `GET /api/auth/me`
- **전제조건:** 세션 쿠키 없음
- **기대 결과:** HTTP 401, `message: "로그인이 필요합니다."`

---

### TC-AUTH-013: 로그아웃 - 정상 처리
- **우선순위:** P1
- **엔드포인트:** `POST /api/auth/logout`
- **전제조건:** 로그인 후 세션 쿠키 보유
- **기대 결과:**
  - HTTP 200, `message: "로그아웃 되었습니다."`
  - 응답 헤더에 `connect.sid` 만료 처리(`Set-Cookie` expires 과거 시각)

---

### TC-AUTH-014: 로그아웃 후 세션 무효화 확인
- **우선순위:** P1
- **순서:**
  1. `POST /api/auth/logout` → HTTP 200
  2. 동일 쿠키로 `GET /api/auth/me` → HTTP 401
- **검증 포인트:** 로그아웃 이후 세션이 완전히 무효화되는지 확인

---

### TC-AUTH-015: 통합 - 전체 인증 흐름
- **우선순위:** P1
- **유형:** 통합 테스트
- **순서:**
  1. `POST /api/auth/signup` → 201
  2. `POST /api/auth/login` → 200, 쿠키 수령
  3. `GET /api/auth/me` → 200, 정보 일치
  4. `POST /api/auth/logout` → 200
  5. `GET /api/auth/me` → 401

---

## 5. 알려진 위험 및 주의사항

| 항목 | 내용 |
|------|------|
| 비밀번호 평문 응답 | 응답 body에 `password` 필드가 절대 포함되지 않아야 함 |
| 로그인 이력 누락 | 실패 케이스에서도 `login_history` 기록이 반드시 삽입되어야 함 |
| 세션 시크릿 기본값 | `SESSION_SECRET=changeme` 사용 시 보안 취약 - 운영 환경 환경변수 필수 |
| 로그아웃 세션 없는 경우 | 세션 없이 logout 호출 시 `session.destroy()` 에러 발생 가능 여부 확인 |
