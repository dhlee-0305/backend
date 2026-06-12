# Graph Report - bookbackend  (2026-06-08)

## Corpus Check
- 51 files · ~24,718 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 572 nodes · 622 edges · 30 communities (24 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `df5bac09`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Domain Models & Documentation|Domain Models & Documentation]]
- [[_COMMUNITY_Core App Infrastructure|Core App Infrastructure]]
- [[_COMMUNITY_Controllers & Business Logic|Controllers & Business Logic]]
- [[_COMMUNITY_Dev Dependencies & Testing|Dev Dependencies & Testing]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_NPM Scripts|NPM Scripts]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Claude Code Settings|Claude Code Settings]]
- [[_COMMUNITY_Database Constraints|Database Constraints]]
- [[_COMMUNITY_Jest Config|Jest Config]]
- [[_COMMUNITY_Session Types|Session Types]]
- [[_COMMUNITY_Dev Skills|Dev Skills]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]

## God Nodes (most connected - your core abstractions)
1. `4. 테스트 시나리오` - 25 edges
2. `4. 테스트 시나리오` - 21 edges
3. `4. 테스트 시나리오` - 17 edges
4. `4. 테스트 시나리오` - 17 edges
5. `4. 테스트 시나리오` - 16 edges
6. `Service Development Specification` - 15 edges
7. `scripts` - 13 edges
8. `compilerOptions` - 11 edges
9. `테스트 작성 규칙` - 9 edges
10. `테스트 계획 개요 - 개인 도서관리 서비스` - 9 edges

## Surprising Connections (you probably didn't know these)
- `buildApp()` --calls--> `cors`  [INFERRED]
  test/helpers.ts → package.json
- `buildApp()` --calls--> `express`  [INFERRED]
  test/helpers.ts → package.json
- `CLAUDE.md - Project Guide` --references--> `Service Development Specification`  [EXTRACTED]
  CLAUDE.md → docs/spec.md
- `README - Project Overview` --references--> `Service Development Specification`  [EXTRACTED]
  README.md → docs/spec.md
- `README - Project Overview` --references--> `Test Plan Overview`  [EXTRACTED]
  README.md → test/testplan-overview.md

## Hyperedges (group relationships)
- **Cascade Delete affects Book, ReadingLog, and Memo together** — concept_book_domain_model, concept_reading_log_domain_model, concept_memo_domain_model [EXTRACTED 1.00]
- **Unit Test Agent, Integration Test Agent, and Test Plans form Test Automation System** — agents_unit_test_agent_unit_test_agent, agents_integration_test_agent_integration_test_agent, test_testplan_overview_test_overview [INFERRED 0.85]
- **Session-Based Auth, Login History, and User Domain implement Authentication** — concept_session_based_auth, concept_login_history, concept_user_domain_model [EXTRACTED 0.95]

## Communities (30 total, 6 thin omitted)

### Community 0 - "Domain Models & Documentation"
Cohesion: 0.11
Nodes (34): Docs Agent, Integration Test Agent, Unit Test Agent, CLAUDE.md - Project Guide, BCrypt Password Hashing (salt rounds 10), Book Domain Model, BookStatus Enum (OWNED, SOLD, DONATED), Cascade Delete (Book → ReadingLog, Memo) (+26 more)

### Community 1 - "Core App Infrastructure"
Cohesion: 0.08
Nodes (27): app, dependencies, bcrypt, cors, dotenv, express, express-session, morgan (+19 more)

### Community 2 - "Controllers & Business Logic"
Cohesion: 0.14
Nodes (19): login(), logout(), me(), signup(), createBook(), deleteBook(), getBookById(), getBooks() (+11 more)

### Community 3 - "Dev Dependencies & Testing"
Cohesion: 0.06
Nodes (32): description, devDependencies, jest, prisma, supertest, ts-jest, ts-node-dev, @types/bcrypt (+24 more)

### Community 4 - "TypeScript Configuration"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir, resolveJsonModule, rootDir (+5 more)

### Community 5 - "NPM Scripts"
Cohesion: 0.05
Nodes (37): code:block1 (GET /api/books?status=OWNED&genre=소설&search=해리&readStatus=RE), code:json ({), code:json ({), code:block3 (GET /api/books/1), code:json ({), code:json ({), code:json ({), code:json ({) (+29 more)

### Community 6 - "Runtime Dependencies"
Cohesion: 0.06
Nodes (35): 1. 독서 기록 목록 조회, 2. 독서 기록 등록, 3. 독서 기록 수정, 4. 독서 기록 삭제, code:block1 (GET /api/books/1/reading-logs), code:json ({), code:json (POST /api/books/1/reading-logs), code:json ({) (+27 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (34): 1. 테스트 범위 정의, 2. 테스트 유형 구분, 3. 우선순위 산정 기준, 4. 테스트 시나리오, 5. 알려진 위험 및 주의사항, code:json ({ "title": "채식주의자", "author": "한강" }), code:json ({), TC-BOOK-001: 도서 등록 - 필수 필드만 입력 (+26 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (30): code:json ({), code:json ({), code:json ({), code:json ({), code:block5 (POST /api/auth/logout), code:json ({), code:block7 (GET /api/auth/me), code:json ({) (+22 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (30): code:block1 (GET /api/books/1/memos?type=HIGHLIGHT), code:json ({), code:json ({), code:json ({), code:json ({), code:json ({), code:block7 (DELETE /api/memos/5), code:json ({) (+22 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (30): 1. 테스트 범위 정의, 2. 테스트 유형 구분, 3. 우선순위 산정 기준, 4. 테스트 시나리오, 5. 알려진 위험 및 주의사항, code:json ({ "page": 42, "content": "이 장면에서 복선이 드러난다.", "type": "HIGHLI), code:json ({ "page": 50, "content": "수정된 메모 내용", "type": "MEMO" }), TC-MEMO-001: 메모 등록 - HIGHLIGHT 타입, 전체 필드 (+22 more)

### Community 17 - "Community 17"
Cohesion: 0.07
Nodes (26): 1. 테스트 범위 정의, 2. 테스트 유형 구분, 3. 우선순위 산정 기준, 4. 테스트 시나리오, 5. 알려진 위험 및 주의사항, code:json ({), code:json ({ "endDate": "2024-02-10", "rating": 5.0, "review": "다시 읽어도 ), TC-LOG-001: 독서 기록 등록 - 전체 필드 입력 (+18 more)

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (25): 1. MySQL 데이터베이스 생성, 2. 환경변수 설정 (`.env`), 3. 패키지 설치, 4. Prisma 마이그레이션 (DB 테이블 생성), 5. 서버 실행, API 엔드포인트 요약, code:block1 (bookbackend/), code:bash (npm test                    # 전체 실행) (+17 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (25): 1. 테스트 범위 정의, 2. 테스트 유형 구분, 3. 우선순위 산정 기준, 4. 테스트 시나리오, 5. 알려진 위험 및 주의사항, code:json ({ "email": "user@example.com", "password": "password1234" }), code:json ({ "email": "user@example.com", "password": "password1234" }), TC-AUTH-001: 회원가입 - 정상 등록 (+17 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (24): 1. 테스트 범위 정의, 2. 테스트 유형 구분, 3. 우선순위 산정 기준, 4. 테스트 시나리오, 5. 알려진 위험 및 주의사항, TC-STATS-001: 통계 조회 - 응답 구조 검증, TC-STATS-002-A: 통계 조회 - 비로그인 차단, TC-STATS-002: totalBooks - 전체 도서 수 정합성 (+16 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (22): 1. 테스트 범위 정의, 2-1. 기능 테스트 (Functional Test), 2-2. 경계값 테스트 (Boundary Test), 2-3. 비즈니스 규칙 테스트 (Business Rule Test), 2-4. 통합 테스트 (Integration Test), 2-5. 연계 테스트 (Cross-Domain Test), 2-6. 보안 테스트 (Security Test), 2. 테스트 유형 구분 (+14 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (17): 1. 도서 관리, 2. 독서 기록, 3. 인증, 4. 통계 대시보드, API 문서, code:block1 (Book ─── 1:N ── ReadingLog   (책 한 권에 독서 기록 여러 개)), code:json (// 성공), 개인 도서관리 서비스 - 개발 명세서 (+9 more)

### Community 23 - "Community 23"
Cohesion: 0.12
Nodes (16): code:typescript (import request from 'supertest';), code:typescript (const agent = request.agent(app);), code:block3 ([파일명] 총 N개), describe / it 명명 규칙, ISBN 등 고유값 생성, 검증 포인트, 경계, 공통 구조 (+8 more)

### Community 24 - "Community 24"
Cohesion: 0.13
Nodes (14): 1단계: 사전 확인, 2단계: 도메인별 순차 실행, 3단계: 리포트 작성, code:bash (npm run test:auth), code:markdown (# 통합 테스트 리포트), 경계, 리포트 형식, 분석 기준 (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (9): API 명세서, code:bash (# 개발 서버 (포트 4000, hot-reload)), code:block2 (# .env.test), code:json ({ "success": true, "data": { ... } }          // 단건), Commands, graphify 지식 그래프, 사용 기술, 아키텍처 (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.20
Nodes (9): code:block1 (GET /api/stats), code:json ({), GET /api/stats, Request, Request Sample, Response, Response Sample, 엔드포인트 목록 (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.29
Nodes (6): Current changes, Instructions, Output Example, 변경 사항 요약, 위험 요소 및 확인 필요 사항, 커밋 메시지 규칙

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (5): code:block1 ([API Name]), 경계, 문서 작성 지침, 페르소나, 프로젝트 지식

## Knowledge Gaps
- **345 isolated node(s):** `app`, `config`, `name`, `version`, `description` (+340 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Core App Infrastructure` to `Dev Dependencies & Testing`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `app`, `config`, `name` to the rest of the system?**
  _350 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Domain Models & Documentation` be split into smaller, more focused modules?**
  _Cohesion score 0.11051693404634581 - nodes in this community are weakly interconnected._
- **Should `Core App Infrastructure` be split into smaller, more focused modules?**
  _Cohesion score 0.08205128205128205 - nodes in this community are weakly interconnected._
- **Should `Controllers & Business Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Dev Dependencies & Testing` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `TypeScript Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._