# 0009 — 기록 강제 장치 — PRD

- **문제:** PRD·SDD·trace·TASKS 기록이 문서 규칙으로만 요구된다. 점검 결과 빈틈이 있다.
  - 게이트는 **있는 폴더만** 검사한다. 태스크 폴더를 아예 안 만들면 통과한다.
  - 템플릿을 그대로 두어도 통과한다.
  - PRD·SDD를 코드보다 먼저 쓰는지, TASKS.md를 갱신하는지는 아무것도 확인하지 않는다.
- **목표:** 에이전트가 작업할 때마다 기록이 남도록 **네 지점에서** 강제한다.
  1. 시작(SessionStart): 현재 태스크와 기록 상태를 에이전트에게 알려준다.
  2. 코드 수정 직전(PreToolUse): 태스크 브랜치·TASKS 행·PRD·SDD가 없으면 수정을 막는다.
  3. 응답 종료(Stop): 코드를 바꿨는데 trace·기록이 비어 있으면 끝내지 못하게 돌려보낸다.
  4. 게이트(`pnpm check`): 태스크 브랜치면 해당 폴더가 있어야 하고, 모든 폴더는 템플릿이 아닌 실제 내용과 TASKS 행이 있어야 한다.
- **비목표:** Bash로 파일을 쓰는 경우의 사전 차단(Stop·게이트가 사후에 잡는다), Codex 쪽 hooks, 기록 내용의 품질 판정.

## Acceptance
- [x] 게이트: 태스크 브랜치인데 폴더가 없으면 FAIL
- [x] 게이트: 템플릿 그대로인 prd(제목·Acceptance)·sdd(접근·대안·검증 계획)·trace(행 없음)는 FAIL
- [x] 게이트: TASKS.md에 행이 없는 태스크 폴더는 FAIL
- [x] PreToolUse: 기록 경로(agents/intent·orchestration, JOURNAL, LEARNINGS) 밖의 파일 수정은 태스크 브랜치 + TASKS 행 + 채워진 prd·sdd가 있어야 허용, 아니면 exit 2로 차단하고 해야 할 일을 알려준다
- [x] Stop: 태스크 브랜치에서 코드가 바뀌었는데 trace.md가 이번 태스크에서 갱신되지 않았거나 기록이 비었으면 block. 무한 반복 방지(`stop_hook_active`)
- [x] SessionStart: 현재 브랜치·태스크·기록 상태를 컨텍스트로 주입
- [x] hook이 스스로 오류가 나면 작업을 막지 않는다 (차단은 의도된 exit 2뿐)
- [x] 판정 로직 단위 테스트 + 실제 `claude -p`로 hooks 동작 e2e 확인
- [x] `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
