---

description: 커밋되지 않은 변경 사항을 분석하여 변경 요약, 위험 요소, 커밋 메시지를 생성합니다.
name: summarize-changes

---

## Current changes

!`git diff HEAD`

## Instructions

다음 순서로 결과를 작성하세요.
1. 변경 사항 요약
2. 위험 요소 및 확인 필요 사항
3. 추천 커밋 메시지

### 변경 사항 요약

- 변경 내용을 2~3개의 bullet point로 요약
- 핵심 기능 변경 사항 위주로 작성
- 변경 목적이 드러나도록 설명

### 위험 요소 및 확인 필요 사항

다음 항목이 있는지 검토:
- 오류 처리 누락
- 하드코딩된 값
- 테스트 코드 미반영
- API 스펙 변경 여부
- 호환성 문제 가능성
- 성능 영향 가능성

위험 요소가 없으면:
- `특이 위험 요소 없음` 출력

### 커밋 메시지 규칙

- Conventional Commits 형식 사용
- 제목은 한글로 작성
- 제목은 50자 이내
- 필요 시 본문은 bullet point로 작성
- 변경 목적이 드러나도록 작성
- 불필요한 수식어 제거

사용 가능한 타입 예시:
- feat
- fix
- refactor
- chore
- docs
- test

## Output Example

feat: 게시판 목록 페이징 기능 추가

- 페이지 번호 및 size 파라미터 처리
- 전체 게시글 수 반환 추가
- 프런트 페이지 이동 UI 연동