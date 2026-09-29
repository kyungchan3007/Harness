# harness-lab

AI 코딩 에이전트(Claude Code, Codex)를 감싸는 **하네스**(Loop · Guardrails · Eval · Observability)를 실험하는 샌드박스입니다.

- 도메인은 일부러 작게 잡았습니다(`src/memo.ts`, 메모 저장소). 주인공은 하네스입니다.
- 여기서 효과가 확인된 패턴만 실제 프로젝트(ClauseLens)로 옮깁니다. 목록은 [LEARNINGS.md](LEARNINGS.md)에 있습니다.

## 빠른 시작

```bash
pnpm install
pnpm check      # 완료 게이트 (typecheck + test + 문서 규칙)
```

## 구조

| 계층 | 위치 | 역할 |
| --- | --- | --- |
| Intent | `agents/intent/` | 무엇을 만드는가 (spec = PRD + SDD) |
| Context | `agents/context/` | 무엇이 참인가 |
| Harness | `agents/harness/` | 어떻게 안전하게 돌리는가 |
| Orchestration | `agents/orchestration/` | 여러 에이전트를 어떻게 엮는가 |

에이전트 진입점: [AGENTS.md](AGENTS.md)
