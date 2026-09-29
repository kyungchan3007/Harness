# Harness — "어떻게 안전하게 돌리는가"

| 요소 | 문서 | 한 줄 |
| --- | --- | --- |
| Loop | [loop.md](loop.md) | 계획→구현→검증 반복 절차 |
| Guardrails | [guardrails.md](guardrails.md) | 해도 되는 것 / 안 되는 것 |
| Eval | [evals/checks.sh](evals/checks.sh) | 완료 판정 게이트 |
| Observability | [observability.md](observability.md) | 무슨 일이 있었는지 남김 |

```
        ┌─ Guardrails: 하지 말아야 할 일을 막는다 (사전)
Loop ───┼─ Eval:       끝났는지 판정한다 (사후 게이트)
        └─ Observability: 무슨 일이 있었는지 남긴다 (사후 기록)
```

## 실험 후보 (백로그)

- Claude Code hooks로 가드레일 강제 (예: spec 없이 `src/` 수정 시 차단)
- LLM-as-judge eval: spec의 Acceptance와 diff가 일치하는지 판정
- 서브에이전트 병렬 작업 + TASKS.md 충돌 방지
- 게이트 실패 원인 자동 요약 (Observability)
