# Observability — 블랙박스를 여는 기록

| 기록 | 위치 | 누가 | 시점 | 담는 것 |
| --- | --- | --- | --- | --- |
| PRD | `specs/NNNN-*/prd.md` | 에이전트 | DEFINE | 왜·무엇·Acceptance |
| SDD | `specs/NNNN-*/sdd.md` | 에이전트 | PLAN, RECORD | 설계·대안·계획과 달라진 점·검증 결과 |
| Trace (직접) | `specs/NNNN-*/trace.md` | 에이전트 | 작업 내내 | 판단과 이유, 막힘, 되돌림 |
| Trace (자동) | `specs/NNNN-*/trace.auto.jsonl` | hooks | 도구 호출마다 | 프롬프트, 도구 이름·대상, 성공/실패 |
| JOURNAL | `agents/JOURNAL.md` | 에이전트 | RECORD | 태스크당 한 줄 목차 |
| 실험 결론 | `LEARNINGS.md` | 에이전트 | REFLECT | 가설·결과·ClauseLens 적용 여부 |

## 자동 기록 (hooks)

- 설정: [.claude/settings.json](../../.claude/settings.json) → [hooks/trace.mjs](hooks/trace.mjs)
- 이벤트: SessionStart · UserPromptSubmit · PostToolUse · PostToolUseFailure · Stop
- 위치: 브랜치 `task/NNNN-*` → 해당 태스크 폴더. 그 외 브랜치 → `hooks/.unassigned.jsonl`(커밋 안 됨)
- 보기: `pnpm trace NNNN`
- **public repo 주의:** 도구 결과는 남기지 않고, 비밀값 패턴은 `[REDACTED]`, 경로는 상대 경로로 바꾸고 200자로 자른다. 패턴에 없는 비밀값은 못 막으니 프롬프트에 비밀값을 넣지 않는다.
- 한계: Claude Code에서만 동작한다(Codex는 직접 기록만).

## 직접 기록과 자동 기록 비교하기

`trace.md`의 단계와 `pnpm trace NNNN`의 도구 호출을 나란히 놓고 본다. 자동 기록에는 있는데 직접 기록에 없는 헤맴이 있다면, 에이전트의 자체 보고가 빠뜨린 지점이다.
