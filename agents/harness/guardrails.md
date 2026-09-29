# Guardrails

## 해도 됨
- `src/`, `agents/` 안에서의 읽기·수정, `pnpm check` 실행
- 태스크 브랜치 생성·커밋

## 사용자 확인 필요
- `main`에 직접 push, force push, 히스토리 재작성
- 의존성 추가·메이저 업그레이드
- 게이트(`checks.sh`) 검사 삭제 또는 완화

## 금지
- spec 없이 코드 작성
- 테스트를 skip/삭제해서 게이트 통과
- 비밀값(.env, 토큰) 커밋

## 자동 강제 (hooks·게이트, 0009)

| 지점 | 장치 | 무엇을 | 위반 시 |
| --- | --- | --- | --- |
| 세션 시작 | `hooks/session-context.mjs` | 현재 브랜치·태스크·기록 상태를 에이전트에게 알림 | - |
| 코드 수정 직전 | `hooks/guard.mjs` (PreToolUse: Edit·Write·MultiEdit·NotebookEdit) | 태스크 브랜치 + TASKS 행 + 채워진 prd·sdd | **exit 2 차단**, 해야 할 일 안내 |
| 응답 종료 | `hooks/stop-check.mjs` (Stop) | 코드를 바꿨으면 trace.md 갱신 + 기록 채움 | 1회 돌려보냄 (`stop_hook_active`면 경고만) |
| 완료 선언 | `evals/check-task-records.mjs` (게이트) | 모든 태스크 폴더의 prd·sdd·trace·TASKS 행, 태스크 브랜치의 폴더 존재 | `pnpm check` FAIL |

- 기록 경로(`agents/intent/`, `agents/orchestration/`, `agents/JOURNAL.md`, `LEARNINGS.md`)는 항상 수정할 수 있다. 그 밖은 모두 코드로 본다(하네스 파일 포함).
- 판정 기준은 `hooks/lib/records.mjs` 한 곳에 있다.
- 한계: Bash로 쓰는 파일은 사전 차단하지 못한다(Stop·게이트가 사후에 잡음). 형식만 검사하고 내용 품질은 보지 않는다.
