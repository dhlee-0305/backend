# Graph Report - .  (2026-05-21)

## Corpus Check
- Corpus is ~24,641 words - fits in a single context window. You may not need a graph.

## Summary
- 157 nodes · 226 edges · 13 communities (8 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.82)
- Token cost: 18,500 input · 3,800 output

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

## God Nodes (most connected - your core abstractions)
1. `Service Development Specification` - 15 edges
2. `scripts` - 13 edges
3. `compilerOptions` - 11 edges
4. `buildApp()` - 8 edges
5. `Unit Test Agent` - 7 edges
6. `Auth API Test Plan` - 7 edges
7. `Cascade Delete (Book → ReadingLog, Memo)` - 7 edges
8. `closeDb()` - 6 edges
9. `cleanDb()` - 6 edges
10. `Test Plan Overview` - 6 edges

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

## Communities (13 total, 5 thin omitted)

### Community 0 - "Domain Models & Documentation"
Cohesion: 0.11
Nodes (34): Docs Agent, Integration Test Agent, Unit Test Agent, CLAUDE.md - Project Guide, BCrypt Password Hashing (salt rounds 10), Book Domain Model, BookStatus Enum (OWNED, SOLD, DONATED), Cascade Delete (Book → ReadingLog, Memo) (+26 more)

### Community 1 - "Core App Infrastructure"
Cohesion: 0.10
Nodes (21): app, cors, express, prisma, errorHandler(), notFound(), buildApp(), cleanDb() (+13 more)

### Community 2 - "Controllers & Business Logic"
Cohesion: 0.14
Nodes (19): login(), logout(), me(), signup(), createBook(), deleteBook(), getBookById(), getBooks() (+11 more)

### Community 3 - "Dev Dependencies & Testing"
Cohesion: 0.13
Nodes (15): devDependencies, jest, prisma, supertest, ts-jest, ts-node-dev, @types/bcrypt, @types/cors (+7 more)

### Community 4 - "TypeScript Configuration"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir, resolveJsonModule, rootDir (+5 more)

### Community 5 - "NPM Scripts"
Cohesion: 0.15
Nodes (13): scripts, build, dev, prisma:generate, prisma:migrate, prisma:studio, start, test (+5 more)

### Community 6 - "Runtime Dependencies"
Cohesion: 0.18
Nodes (10): dependencies, bcrypt, dotenv, express-session, morgan, @prisma/client, description, main (+2 more)

## Knowledge Gaps
- **70 isolated node(s):** `app`, `config`, `name`, `version`, `description` (+65 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Runtime Dependencies` to `Core App Infrastructure`?**
  _High betweenness centrality (0.200) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Dev Dependencies & Testing` to `Runtime Dependencies`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **What connects `app`, `config`, `name` to the rest of the system?**
  _75 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Domain Models & Documentation` be split into smaller, more focused modules?**
  _Cohesion score 0.11051693404634581 - nodes in this community are weakly interconnected._
- **Should `Core App Infrastructure` be split into smaller, more focused modules?**
  _Cohesion score 0.10160427807486631 - nodes in this community are weakly interconnected._
- **Should `Controllers & Business Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Dev Dependencies & Testing` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._