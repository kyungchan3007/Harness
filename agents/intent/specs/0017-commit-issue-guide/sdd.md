# 0017 — 커밋·이슈 지침서 (허점·보완점·컨텍스트·토큰) — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** 0009 sdd(강제 원칙), observability.md, Claude Code transcript 실물(`~/.claude/projects/<프로젝트>/<세션>.jsonl`)
- **접근:**
  - **토큰 출처 = transcript.** 확인 결과 assistant 줄마다 `message.usage`(input · cache_creation · cache_read · output), `timestamp`, `sessionId`, **`gitBranch`**가 있다. 같은 응답이 스트리밍으로 여러 줄 기록되며(예: 292줄 → 고유 111개) usage가 동일하므로 `message.id`로 중복 제거한다.
  - **태스크 귀속:** 프로젝트 폴더(`~/.claude/projects/<cwd의 / . 를 - 로>`) 아래 모든 jsonl(서브에이전트 포함)에서 `gitBranch == 현재 태스크 브랜치`인 요청만 합산.
  - **컨텍스트:** 요청마다 `input + cache_read + cache_creation`이 그 순간 모델이 본 컨텍스트 크기 → 최대값·마지막 값을 보고. 읽은 파일 수는 `trace.auto.jsonl`의 Read 성공 건수(고유 경로).
  - **git hooks (`.githooks/`, `core.hooksPath`):**
    - `prepare-commit-msg`: 태스크 브랜치이고 `[컨텍스트·토큰]`이 없으면 `pnpm usage --commit` 결과를 메시지 끝(Co-Authored-By 앞)에 붙인다.
    - `commit-msg`: 태스크 브랜치 커밋에 세 섹션이 있고 각각 내용이 있는지 검사. 머지 커밋·`fixup!` 제외. 급할 땐 `--no-verify`(사용 사실은 trace에 남긴다).
  - **섹션 표기는 `[허점]` 형식.** `#`으로 시작하는 줄은 편집기 커밋에서 git이 주석으로 지워버리므로 쓰지 않는다.
- **대안·트레이드오프:**
  - 토큰을 에이전트가 직접 적기: 추정이라 틀리고 실험 비교에 못 쓴다. → transcript 자동 집계.
  - 세션 단위 합산: 한 세션에서 여러 태스크를 하면 섞인다. → `gitBranch` 단위(요청마다 기록되는 브랜치). 브랜치 밖에서 한 세션은 `--transcript --since`로 시간 구간 집계.
  - 커밋마다 토큰 누적 vs 증분: 누적(브랜치 전체)이 단순하고, 마지막 커밋이 태스크 총량이 된다. → 누적, "브랜치 누적"임을 표기.
  - husky 등 의존성: 설치가 편하지만 의존성이 는다. → `core.hooksPath` + `prepare` 스크립트, 의존성 0.
  - 섹션 검사를 게이트(`pnpm check`)로: 커밋 전 메시지는 게이트가 볼 수 없다. → commit-msg hook.
- **파일 계획:** `agents/harness/usage/{usage,usage.test}.mjs`, `.githooks/{commit-msg,prepare-commit-msg}`, `agents/harness/commit/{message,message.test}.mjs`(검사·삽입 로직), `agents/harness/commit-and-issue.md`(지침서), `.github/ISSUE_TEMPLATE/task.md`, `.github/pull_request_template.md`, `package.json`(`prepare`·`usage`), AGENTS.md
- **위험:**
  - transcript 형식은 Claude Code 내부 형식이라 버전이 바뀌면 깨질 수 있다 → 필드가 없으면 0이 아니라 "집계 불가"로 표시하고 커밋은 막지 않는다.
  - transcript 경로에 홈 경로가 들어감 → 출력에는 수치만, 경로는 남기지 않는다(public repo).
  - hook이 오류로 커밋을 막는 것 → 검사 실패(exit 1)는 섹션 누락일 때만, 내부 오류는 통과.
- **검증 계획:** 집계·중복 제거·검사·삽입 순수 함수 단위 테스트, 임시 repo에서 실제 `git commit`으로 거부·자동 채움·통과 e2e, 실제 transcript(e2e-guard 세션)로 집계 결과 확인, 이 태스크 커밋에 실측 수치 기재

## 계획과 달라진 점
- **사용자 요청으로 README 문구 정리를 함께 했다:** "검증된 것만 ClauseLens로 옮긴다" 문구 4곳을 지우고 "연구·공부용 실험실"로 소개. 이 repo의 목적 서술이라 별도 태스크 대신 여기서 처리.
- `insertSection`이 커밋 제목 `feat: x`를 트레일러(`Co-Authored-By:` 형식)로 오인해 잘라냈다 → 첫 줄은 트레일러로 보지 않도록 수정(단위 테스트가 잡음).
- `pnpm install`은 설치할 것이 없으면 `prepare`를 건너뛴다 → 새 클론에서는 설정됨을 확인, 기존 폴더는 `pnpm run prepare` 한 번 필요(지침서·README에 반영).

## 검증 결과
- 단위 테스트: 커밋 규칙 5개 + 토큰 집계 5개 추가, 전체 45개 PASS
- 실제 transcript 집계: e2e-guard 복사본 기록에서 `task/0042-e2e-stop` 세션 2개·요청 20회, `exp-not-a-task` 요청 6회로 브랜치별 분리 확인
- git commit e2e (원격 없는 복사본):

| 시나리오 | 결과 |
| --- | --- |
| 섹션 없는 태스크 커밋 | 거부 + 작성 안내 |
| `[허점]`·`[보완]`만 작성 | `[컨텍스트·토큰]` 자동 삽입(트레일러 앞) 후 통과 |
| 비태스크 브랜치 | 검사 안 함 |
| 머지 커밋 | 제외 |
| 태스크 브랜치에서 실제 Claude 세션 후 커밋 | 실측값 자동 기입 (세션 1 · 요청 2 · 캐시 쓰기 43.0k · 읽은 파일 1) |

- 새 클론 `pnpm install` → `core.hooksPath=.githooks` 설정 확인
- `pnpm check`: ALL PASS
