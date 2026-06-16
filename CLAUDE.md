# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# 개발 서버 (포트 4000, hot-reload)
npm run dev

# 빌드
npm run build

# 전체 테스트 (순차 실행 필수)
npm test

# 도메인별 단위 테스트
npm run test:auth
npm run test:book
npm run test:reading-log
npm run test:memo
npm run test:stats

# Prisma
npm run prisma:generate   # 클라이언트 재생성 (schema 변경 후)
npm run prisma:migrate    # 마이그레이션 적용
npm run prisma:studio     # DB GUI
```

## 테스트 환경 설정

테스트는 실제 DB를 사용하며 `.env.test` 파일이 필요하다. `DATABASE_URL`을 운영 DB와 **반드시 분리된** 테스트용 DB로 설정해야 한다.

```
# .env.test
NODE_ENV="test"
PORT=4001
DATABASE_URL="mysql://user:password@host:3306/bookbackend_test"
SESSION_SECRET="test-secret"
```

`test/helpers.ts`가 테스트 앱 인스턴스를 제공한다.
- `buildApp()` — 테스트용 Express 앱 생성
- `cleanDb()` — 테이블 전체 초기화 (의존 순서: Memo → ReadingLog → Book → LoginHistory → User)
- `closeDb()` — Prisma 연결 해제

## 아키텍처

**요청 흐름:** `index.ts` → `routes/index.ts` → `controllers/*.ts` → `config/prisma.ts` (Prisma Client)

**인증 방식:** 별도 인증 미들웨어 없음. 인증이 필요한 엔드포인트(`statsController`, `authController`의 `me`)는 컨트롤러 내부에서 `req.session.userId` 유무를 직접 확인한다. 도서·독서기록·메모 조회는 비로그인 상태에서도 접근 가능하다.

**세션:** 로그인 성공 시 `req.session.userId`(number)와 `req.session.email`(string)을 저장한다. 타입 확장은 `types/session.d.ts`에 정의되어 있다.

**통계 특이사항:** `statsController`의 `yearlyReading`은 `readingLogs.userName === req.session.email` 조건으로 현재 로그인 사용자의 완독 기록만 집계한다.

**공통 응답 형식:**
```json
{ "success": true, "data": { ... } }          // 단건
{ "success": true, "data": [...], "total": N } // 목록
{ "success": false, "message": "..." }         // 오류
```

## API 명세서
@docs/spec.md

## 커밋 메시지

커밋 메시지 작성 요청을 받으면 `.claude/skills/summarize-changes/SKILL.md`를 기준으로 한다. 상세 규칙은 중복 작성하지 않고 원본 지침을 확인한다.

## 사용 기술
- TypeScript + Express
- 인증/세션: express-session, bcrypt (salt rounds: 10)
- ORM: Prisma + MySQL
- 테스트: Jest + Supertest (ts-jest, `--runInBand` 필수)

## graphify 지식 그래프

코드나 문서에 대한 질문이 들어오면, **먼저** `/graphify query "질문"`으로
그래프를 조회한 다음 답변할 것. 파일을 직접 읽기 전에 그래프에서 관련
노드·엣지를 확인하면 컨텍스트를 훨씬 빠르게 잡을 수 있다.

- 그래프 위치: `graphify-out/graph.json`
- 쿼리: `/graphify query "질문"`
- 경로 추적: `/graphify path "A" "B"`
- 설명: `/graphify explain "노드명"`
- 코드 변경 후: `/graphify . --update`
