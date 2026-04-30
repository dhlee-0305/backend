# 테스트 계획서 - 통계 (Stats) API

## 1. 테스트 범위 정의

### 포함
- `GET /api/stats` - 전체 통계 조회
- 응답 구조 전체 필드 검증 (`totalBooks`, `statusCounts`, `genreCounts`, `monthlyReading`, `avgRating`, `yearlyDoneCount`, `currentYear`)
- `monthlyReading` 1월~12월 12개 항목 항상 반환 검증
- 장르 없는 도서의 `"미분류"` 집계 처리 검증
- 평균 별점 계산 (별점 기록 없을 때 0 반환) 검증
- `yearlyDoneCount` 올해 endDate 기준 완독 수 검증
- `statusCounts` 상태별 도서 수 정합성 검증

### 제외
- 세션 인증 (통계 API는 인증 불필요)
- 연도별 파라미터 필터링 (현재 `currentYear` 고정, 파라미터 없음)
- 개인별 통계 (현재 전체 통합 통계만 제공)
- 연간 독서 목표 설정·달성률 (명세서 언급되나 현재 구현 없음)

---

## 2. 테스트 유형 구분

| 유형 | 설명 |
|------|------|
| **기능 테스트** | 응답 구조 및 모든 필드 존재 여부 검증 |
| **데이터 정합성 테스트** | 실제 DB 데이터와 통계 수치의 일치 여부 |
| **경계값 테스트** | 데이터 없는 상태(빈 DB), 별점 없는 상태 |
| **집계 로직 테스트** | 월별 완독 집계, 미분류 처리, 평균 별점 계산 |

---

## 3. 우선순위 산정 기준

| 우선순위 | 기준 |
|----------|------|
| **P1 - 긴급** | 응답 구조 오류, 핵심 집계 수치 오류 |
| **P2 - 높음** | 특정 집계 항목 누락, 경계 케이스 오동작 |
| **P3 - 보통** | 정렬 순서, 미분류 처리 오류 |
| **P4 - 낮음** | 소수점 표현 형식 등 경미한 사항 |

---

## 4. 테스트 시나리오

### TC-STATS-001: 통계 조회 - 응답 구조 검증
- **우선순위:** P1
- **엔드포인트:** `GET /api/stats`
- **전제조건:** DB에 도서 및 독서 기록 데이터 존재
- **기대 결과:**
  - HTTP 200, `success: true`
  - `data` 객체에 다음 필드 모두 포함:
    - `totalBooks` (number)
    - `statusCounts` (array)
    - `genreCounts` (array)
    - `monthlyReading` (array, 12개 항목)
    - `avgRating` (number)
    - `yearlyDoneCount` (number)
    - `currentYear` (number, 현재 연도)

---

### TC-STATS-002: totalBooks - 전체 도서 수 정합성
- **우선순위:** P1
- **엔드포인트:** `GET /api/stats`
- **전제조건:** DB에 도서 N건 등록
- **기대 결과:** `data.totalBooks` = N (DB `books` 테이블 전체 count와 일치)

---

### TC-STATS-003: statusCounts - 상태별 도서 수 정합성
- **우선순위:** P1
- **엔드포인트:** `GET /api/stats`
- **전제조건:**
  - OWNED 3건, SOLD 2건, DONATED 1건 등록
- **기대 결과:**
  - `statusCounts` 배열에 각 상태별 항목 포함
  - `{ status: "OWNED", count: 3 }`, `{ status: "SOLD", count: 2 }`, `{ status: "DONATED", count: 1 }`
- **비고:** 도서가 없는 상태값은 응답에 포함되지 않을 수 있음 (groupBy 특성)

---

### TC-STATS-004: statusCounts - 한 상태에 도서가 없는 경우
- **우선순위:** P3
- **엔드포인트:** `GET /api/stats`
- **전제조건:** OWNED 도서만 존재, SOLD·DONATED 없음
- **기대 결과:** `statusCounts` 배열에 OWNED 항목만 반환 (SOLD, DONATED 미포함)
- **비고:** Prisma `groupBy`는 해당 상태 도서가 없으면 항목을 반환하지 않음

---

### TC-STATS-005: genreCounts - 장르별 도서 수 및 정렬
- **우선순위:** P2
- **엔드포인트:** `GET /api/stats`
- **전제조건:** 소설 5건, 판타지 3건, 자기계발 1건 등록
- **기대 결과:**
  - `genreCounts[0]: { genre: "소설", count: 5 }`
  - `genreCounts[1]: { genre: "판타지", count: 3 }`
  - `genreCounts[2]: { genre: "자기계발", count: 1 }`
  - 도서 수 내림차순 정렬 확인

---

### TC-STATS-006: genreCounts - 장르 없는 도서 "미분류" 집계
- **우선순위:** P2
- **엔드포인트:** `GET /api/stats`
- **전제조건:** `genre: null` 도서 3건, `genre: "소설"` 도서 2건 등록
- **기대 결과:**
  - `genreCounts` 에 `{ genre: "미분류", count: 3 }` 포함
  - `{ genre: "소설", count: 2 }` 포함

---

### TC-STATS-007: monthlyReading - 12개 항목 항상 반환
- **우선순위:** P1
- **엔드포인트:** `GET /api/stats`
- **기대 결과:**
  - `data.monthlyReading.length === 12`
  - `month` 필드가 1~12 순서로 존재
  - 완독 기록 없는 월의 `count: 0`

---

### TC-STATS-008: monthlyReading - 올해 완독 월별 집계 정합성
- **우선순위:** P1
- **엔드포인트:** `GET /api/stats`
- **전제조건:** 올해 3월에 endDate가 설정된 독서 기록 2건, 5월에 1건 등록
- **기대 결과:**
  - `monthlyReading[2]: { month: 3, count: 2 }` (0-indexed: 배열 인덱스 2 = 3월)
  - `monthlyReading[4]: { month: 5, count: 1 }`
  - 나머지 월 `count: 0`

---

### TC-STATS-009: monthlyReading - 작년 완독 기록은 집계 제외
- **우선순위:** P2
- **엔드포인트:** `GET /api/stats`
- **전제조건:** 작년 12월에 endDate가 설정된 독서 기록 존재
- **기대 결과:** 해당 기록이 올해 `monthlyReading` 집계에 포함되지 않음
- **비고:** `yearlyDone` 쿼리가 `currentYear-01-01` ~ `currentYear-12-31` 범위로 필터

---

### TC-STATS-010: yearlyDoneCount - 올해 완독 건수 정합성
- **우선순위:** P1
- **엔드포인트:** `GET /api/stats`
- **전제조건:** 올해 endDate 기록 5건, 작년 endDate 기록 3건 존재
- **기대 결과:** `data.yearlyDoneCount: 5` (올해 기록만 집계)

---

### TC-STATS-011: avgRating - 평균 별점 계산
- **우선순위:** P2
- **엔드포인트:** `GET /api/stats`
- **전제조건:** 별점 4.0, 5.0, 3.0 독서 기록 3건 존재
- **기대 결과:** `data.avgRating: 4` (= (4+5+3)/3 = 4.0)

---

### TC-STATS-012: avgRating - 별점 기록 없는 경우
- **우선순위:** P2
- **엔드포인트:** `GET /api/stats`
- **전제조건:** 모든 독서 기록의 `rating: null`
- **기대 결과:** `data.avgRating: 0`

---

### TC-STATS-013: avgRating - null 포함 혼재 시 null 제외 평균
- **우선순위:** P2
- **엔드포인트:** `GET /api/stats`
- **전제조건:** 별점 5.0 기록 1건, `rating: null` 기록 2건
- **기대 결과:** `data.avgRating: 5` (null 기록 제외하고 평균 계산)
- **비고:** 소스코드에 `where: { rating: { not: null } }` 조건 확인

---

### TC-STATS-014: 빈 DB - 데이터 없는 초기 상태
- **우선순위:** P2
- **엔드포인트:** `GET /api/stats`
- **전제조건:** 도서·독서 기록 없음
- **기대 결과:**
  - HTTP 200
  - `data.totalBooks: 0`
  - `data.statusCounts: []`
  - `data.genreCounts: []`
  - `data.monthlyReading` 12개 모두 `count: 0`
  - `data.avgRating: 0`
  - `data.yearlyDoneCount: 0`
  - `data.currentYear` 현재 연도

---

### TC-STATS-015: currentYear - 현재 연도 반환
- **우선순위:** P3
- **엔드포인트:** `GET /api/stats`
- **기대 결과:** `data.currentYear === new Date().getFullYear()` (서버 실행 연도)
- **비고:** 연말 테스트 시 연도 경계 처리 확인 (12월 31일 23:59 기록이 익년 집계에 포함되지 않아야 함)

---

## 5. 알려진 위험 및 주의사항

| 항목 | 내용 |
|------|------|
| statusCounts 누락 상태 | 도서가 없는 상태값은 groupBy 결과에서 제외됨 - 프론트엔드 방어 코드 필요 |
| 연말 경계 처리 | `new Date("${year}-12-31")` 은 UTC 기준이므로 서버 시간대에 따라 12월 31일 레코드 누락 가능 |
| 대용량 데이터 | readingLog 전체를 메모리에 로드(`findMany`)하므로 데이터 증가 시 성능 이슈 가능 |
| 목표 달성률 미구현 | 명세서에 연간 독서 목표 기능이 명시되어 있으나 현재 API에서 미제공 |
