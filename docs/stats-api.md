# 통계 (Stats) API

---

## 엔드포인트 목록

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/stats` | 전체 통계 조회 |

---

## GET /api/stats

전체 도서 수, 상태별·장르별 도서 분포, 로그인 사용자의 연도별 완독량, 평균 별점, 로그인 사용자의 올해 완독 수를 한 번에 조회한다.

### Request

인증 필요 여부: 세션 필요

Query Parameters, Path Parameters, Body 없음

### Request Sample

```
GET /api/stats
```

### Response

**Success (200)**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `success` | boolean | required | 요청 성공 여부 | `true` |
| `data` | object | required | 통계 데이터 | `{...}` |

**data 필드**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `totalBooks` | number | required | 전체 등록 도서 수 | `42` |
| `statusCounts` | array | required | 도서 상태별 집계 목록 | `[...]` |
| `genreCounts` | array | required | 장르별 집계 목록 (도서 수 내림차순 정렬) | `[...]` |
| `yearlyReading` | array | required | 로그인 사용자 이메일과 `userName`이 일치하는 독서 기록의 `createdAt` 기준 연도별 완독 건수 목록 | `[...]` |
| `avgRating` | number | required | 전체 독서 기록의 평균 별점 (0.0 ~ 5.0). 별점이 기록된 항목이 없으면 `0` | `4.2` |
| `yearlyDoneCount` | number | required | 로그인 사용자의 올해 완독 건수 (`userName`이 로그인 이메일과 같고, `readStatus`가 `READ`이며, `createdAt`이 올해인 독서 기록 수) | `15` |
| `currentYear` | number | required | 현재 연도 | `2026` |

**data.statusCounts[] 항목 필드**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `status` | string | required | 도서 상태. `OWNED` \| `SOLD` \| `DONATED` | `"OWNED"` |
| `count` | number | required | 해당 상태의 도서 수 | `30` |

**data.genreCounts[] 항목 필드**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `genre` | string | required | 장르명. 장르가 없는 도서는 `"미분류"` 로 집계 | `"판타지"` |
| `count` | number | required | 해당 장르의 도서 수 | `12` |

**data.yearlyReading[] 항목 필드**

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `year` | number | required | 연도 | `2026` |
| `count` | number | required | 해당 연도의 완독 건수 | `15` |

**Error**

| 상태 코드 | 메시지 | 발생 조건 |
|-----------|--------|-----------|
| `401` | `"로그인이 필요합니다."` | 세션이 없거나 로그인하지 않은 상태 |
| `500` | `"통계 조회 실패"` | 서버 내부 오류 |

### Response Sample

```json
{
  "success": true,
  "data": {
    "totalBooks": 42,
    "statusCounts": [
      { "status": "OWNED", "count": 30 },
      { "status": "SOLD", "count": 8 },
      { "status": "DONATED", "count": 4 }
    ],
    "genreCounts": [
      { "genre": "판타지", "count": 12 },
      { "genre": "소설", "count": 10 },
      { "genre": "미분류", "count": 3 }
    ],
    "yearlyReading": [
      { "year": 2024, "count": 7 },
      { "year": 2025, "count": 13 },
      { "year": 2026, "count": 11 }
    ],
    "avgRating": 4.2,
    "yearlyDoneCount": 11,
    "currentYear": 2026
  }
}
```
