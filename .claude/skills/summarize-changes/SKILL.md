---

description: 커밋되지 않은 변경 사항을 분석하여 변경 요약, 위험 요소, 커밋 메시지를 생성합니다.
name: summarize-changes

---

# 목적

문서 저장 레포지토리에서 변경 사항을 분석하여:

- 의미 있는 커밋 메시지 작성
- 변경 목적 요약
- 문서 구조 변경 여부 확인
- 위험 요소 및 누락 가능성 점검

을 수행합니다.

# 분석 절차

## 1. 변경 파일 확인

실행:

`git status --short`

## 줄 끝 문자 변경 제외 규칙

- LF ↔ CRLF처럼 줄 끝 문자만 변경된 파일은 커밋 메시지 판단 대상에서 제외합니다.
- diff 분석 시 기본적으로 `--ignore-cr-at-eol` 옵션을 사용합니다.
- 전체 변경 파일 목록은 `git status --short`로 확인하되, 실제 의미 있는 변경 여부는 `git diff --ignore-cr-at-eol` 결과를 기준으로 판단합니다.
- `--ignore-cr-at-eol` 적용 후 diff가 비어 있는 파일은 포맷 변경으로 간주하고 변경 내용에 포함하지 않습니다.
- 줄 끝 문자 변경이 커밋의 의도인 경우에만 `style:` 또는 `chore:` 타입으로 별도 커밋 메시지를 제안합니다.

## 2. diff 분석

## staged 변경 우선 규칙

- staged 변경이 있으면 다음 명령을 기준으로 분석합니다.
  - `git diff --cached --ignore-cr-at-eol`
  - `git diff --cached --ignore-cr-at-eol --shortstat`
  - `git diff --cached --ignore-cr-at-eol --name-only`
- staged 변경이 없으면 다음 명령을 기준으로 분석합니다.
  - `git diff HEAD --ignore-cr-at-eol`
  - `git diff HEAD --ignore-cr-at-eol --shortstat`
  - `git diff HEAD --ignore-cr-at-eol --name-only`

- 변경 규모 확인은 다음 명령을 사용합니다.

`git diff --ignore-cr-at-eol --shortstat HEAD`

- 의미 있는 변경 파일 목록은 다음 명령을 우선 사용합니다.

`git diff --ignore-cr-at-eol --name-only HEAD`

- untracked 파일은 `git status --short`에서 확인하고, 필요한 경우 파일 내용을 직접 확인합니다.


# 출력 형식

Conventional Commits 형식을 사용합니다.

```text
<type>(<scope>): <subject>
- 변경 내용 1
- 변경 내용 2
- 변경 내용 3
```

- type: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `build`, `ci` 중 변경 성격에 맞게 선택하세요.
- scope: 불명확하면 생략하세요.
- subject는 1줄로 작성하고, 변경 목적을 과장하지 마세요.
- 변경 내용은 주요 변경 사항을 간결하게 요약하세요. 
- 애플리케이션인 경우 사용자 영향 여부와 문서 구조 영향 여부를 포함하는 것이 좋습니다.

## Suggested Commit Messages

우선순위 순으로 3개 제안:

1.docs: 사용자 로그인 API 응답 예제 추가
2.docs: OAuth 인증 흐름 문서 보완
3.refactor: 인증 문서 구조 재정리

# 작성 규칙

- 명령형 대신 변경 결과 중심 작성
- 불필요한 접두어 금지
- "update", "modify" 같은 모호한 표현 최소화
- 한글 사용
- 여러 성격의 변경이 혼합되면 가장 중요한 변경 기준으로 작성
- 줄 끝 문자만 변경된 파일이 많으면 변경 내용에 “대량 줄바꿈 변경은 검토 대상에서 제외함”이라고 짧게 언급합니다.
- Suggested Commit Messages는 `--ignore-cr-at-eol` 적용 후 남은 의미 있는 변경을 기준으로 작성합니다.

예시:

- `feat(auth): 세션 초기화 flow 추가`
- `fix(api): 중복 승인 요청 처리`
- `docs(prompts): 커밋 메시지 형식 명확하게 수정`