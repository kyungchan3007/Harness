# 0001 — 뼈대 구성 — Trace

> hooks 자동 기록(0008) 도입 전 태스크라 **사후 재구성한 에이전트 자체 기록**입니다. 자동 기록(`trace.auto.jsonl`)은 없습니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CONTEXT | ClauseLens `agents/harness/`, `checks.sh`, loop·guardrails 문서 읽음 | 축소 복제할 원본 파악 |
| 2 | CONTEXT | 원격 repo 확인: 비어 있지 않음(README), **public** | 사용자는 private을 원했음 → push 전에 확인하기로 결정 |
| 3 | BUILD | repo를 `harness-lab`으로 클론, pnpm·TS·Vitest 설치 | 새로 init하지 않고 기존 Initial commit 위에 쌓음 |
| 4 | BUILD | 메모 도메인·게이트·4계층 문서 작성 | 도메인은 일부러 작게 |
| 5 | GATE | `pnpm check` ALL PASS | - |
| 6 | RECORD | 로컬 커밋, push 보류 | 공개 범위 확인 전이라 |
| 7 | - | 사용자가 public 유지 결정 → `main`에 push | - |
