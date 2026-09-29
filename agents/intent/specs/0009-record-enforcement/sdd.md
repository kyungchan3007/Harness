# 0009 — 기록 강제 장치 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** observability.md, loop.md, 0008 sdd(hooks 입력 형식), Claude Code hooks 문서(exit 2 = 차단)
- **접근:**
  - 판정 로직을 `agents/harness/hooks/lib/records.mjs` 한 곳에 둔다(브랜치 → 태스크 ID → 폴더 → 기록 검사). hook 3개와 게이트가 모두 이 모듈을 쓴다. 기준이 한 곳이라 hook과 게이트의 판정이 어긋나지 않는다.
  - "채워졌다"의 기준(템플릿 탐지):
    - prd: 제목에 `NNNN`·`제목` 자리표시가 없고, Acceptance에 내용 있는 체크박스가 1개 이상
    - sdd: `접근`·`대안·트레이드오프`·`검증 계획` 항목이 비어 있지 않음 (같은 줄 또는 다음 줄 하위 불릿)
    - trace: 표에 "한 일" 칸이 채워진 행이 1개 이상
  - 기록 경로(항상 수정 허용): `agents/intent/`, `agents/orchestration/`, `agents/JOURNAL.md`, `LEARNINGS.md`. 그 밖은 모두 "코드"로 본다. 하네스 파일(hooks, 게이트) 수정도 기록이 있어야 한다.
  - Stop: `git merge-base HEAD main` 이후 변경(커밋 + 작업 트리 + 미추적)에 코드가 있으면, 기록이 채워져 있고 trace.md도 변경 목록에 있어야 한다. 아니면 `{"decision":"block","reason":…}`. `stop_hook_active`가 true면 다시 막지 않는다.
- **대안·트레이드오프:**
  - 게이트만 강화: 가장 단순하지만 에이전트가 `pnpm check`를 안 돌리면 끝까지 모른다. → hooks와 병행.
  - PreToolUse로 Bash까지 차단: 명령 문자열로 파일 쓰기를 판별하기 어렵고 오탐이 많다. → Edit·Write만 사전 차단, Bash는 Stop·게이트가 사후에 잡는다.
  - trace.md 갱신을 PreToolUse에서 강제: 코드 한 줄 고칠 때마다 trace를 먼저 쓰게 되어 과하다. → trace는 Stop에서 확인.
  - Stop에서 무조건 block: 에이전트가 기록을 못 채우면 무한 반복된다. → `stop_hook_active`로 1회만 돌려보낸다.
  - 내용 품질(LLM 판정): 비용·비결정성. → 이번엔 형식 검사만, 품질 판정은 후속 실험.
- **파일 계획:** `hooks/lib/records.mjs`(+test), `hooks/{guard,stop-check,session-context}.mjs`, `evals/check-task-records.mjs`(기존 `check-spec-folders.sh` 대체), `.claude/settings.json`, observability·guardrails·loop 문서
- **위험:** 오탐으로 정상 작업이 막힘 → 차단 메시지에 "무엇을 하면 풀리는지"를 구체적으로 쓴다. 차단 조건은 exit 2 한 경로뿐이고 나머지 오류는 exit 0.
- **검증 계획:** 판정 함수 단위 테스트(임시 git repo), `claude -p` e2e(복사본 repo, 원격 제거): main에서 src 수정 시도 → 차단, 기록 채운 뒤 → 허용, trace 없이 종료 → Stop block

## 계획과 달라진 점
- **차단 기록 추가:** e2e A에서 guard가 막은 수정이 자동 기록에 남지 않았다(차단된 호출에는 PostToolUse가 오지 않음). guard와 stop-check가 직접 `trace.auto.jsonl`에 `blocked: true` 항목을 남기도록 추가했다. 가장 중요한 "막힘" 순간이 기록에서 빠지는 빈틈이었다.
- **브랜치 읽기 보강:** 커밋이 없는 repo에서 `rev-parse`가 브랜치를 못 읽어 `symbolic-ref`를 먼저 쓰도록 바꿨다. 스테이징된 변경도 따로 수집한다.
- **Stop 판정 범위:** 계획대로 merge-base 이후 변경 전체를 본다. 커밋한 뒤 Stop해도 통과·차단이 일관된다(단위 테스트로 확인).

## 검증 결과
- `pnpm check`: ALL PASS (Typecheck, 단위 테스트 33개, lockfile, Task records)
- 단위 테스트 (임시 git repo): 실제 템플릿 3종은 미완 판정, 채운 문서는 통과, main·폴더 없음·템플릿·TASKS 행 없음 → 차단, 기록 경로·프로젝트 밖 → 허용, Stop은 trace 미갱신 시 문제·커밋 후 갱신 시 통과
- hook 직접 실행: 차단 exit 2, 허용 exit 0, 깨진 입력 exit 0, `stop_hook_active`면 block 안 함
- e2e (`claude -p`, Haiku 4.5, 원격 제거한 복사본, 허용 도구 Read·Edit·Write). 원본 기록: [e2e/](e2e/)
  - **A. 태스크 브랜치 아님 → 코드 수정:** 차단, 파일 변경 없음, 에이전트가 해야 할 일 3단계를 그대로 전달받음, 자동 기록에 `blocked` 남음
  - **B. prd·sdd·TASKS는 있고 trace 없음 → 코드 수정:** 수정 허용 → 첫 Stop에서 `StopBlocked` → 에이전트가 템플릿을 읽고 trace.md 작성 → 두 번째 Stop 통과
- 한계:
  - Bash로 파일을 쓰면 사전 차단은 안 된다. Stop과 게이트가 사후에 잡는다.
  - 형식만 검사한다. 한 줄짜리 형식적 기록도 통과한다(내용 품질 판정은 후속 실험).
  - Stop은 한 번만 돌려보낸다. 에이전트가 그래도 안 채우면 경고만 남고 게이트에서 잡힌다.
