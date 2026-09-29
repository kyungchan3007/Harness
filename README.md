# harness-lab

AI 코딩 에이전트(Claude Code, Codex)를 감싸는 **하네스**(Loop · Guardrails · Eval · Observability)를 실험하는 샌드박스입니다.

- 실험 대상 도메인은 **쇼핑몰 할인·주문 엔진**입니다. 쿠폰 중복·반올림·배송비 경계처럼 에이전트가 틀리기 쉬운 규칙이 많아서, 하네스가 실수를 막는지 관찰하기 좋습니다.
- 도메인 규칙의 단일 소스: [agents/context/domain.md](agents/context/domain.md)
- 여기서 효과가 확인된 패턴만 실제 프로젝트(ClauseLens)로 옮깁니다. 목록은 [LEARNINGS.md](LEARNINGS.md)에 있습니다.

## 빠른 시작

```bash
pnpm install
pnpm check      # 완료 게이트 (typecheck + test + 문서 규칙)
pnpm trace 0008 # 태스크의 hooks 자동 기록 요약
```

## 구조

| 계층 | 위치 | 역할 |
| --- | --- | --- |
| Intent | `agents/intent/specs/NNNN-*/` | 태스크마다 `prd.md`(왜·무엇) · `sdd.md`(어떻게) · `trace.md`(과정) |
| Context | `agents/context/` | 무엇이 참인가 |
| Harness | `agents/harness/` | 어떻게 안전하게 돌리는가 |
| Orchestration | `agents/orchestration/` | 여러 에이전트를 어떻게 엮는가 |

에이전트 진입점: [AGENTS.md](AGENTS.md)

## 에이전트 과정 기록 (블랙박스 열기)

에이전트가 무엇을 읽고 어디서 헤맸는지 남기기 위해 두 가지 기록을 병행합니다. 자세한 내용은 [observability.md](agents/harness/observability.md)를 보세요.

- **직접 기록** `trace.md`: 에이전트가 판단과 이유를 쓴다
- **자동 기록** `trace.auto.jsonl`: Claude Code hooks가 도구 호출을 빠짐없이 남긴다
- **강제:** 태스크 브랜치·TASKS 행·PRD·SDD 없이 코드를 고치면 hook이 막고, trace 없이 끝내려 하면 돌려보낸다 ([guardrails.md](agents/harness/guardrails.md))

## 실험 로드맵

| 단계 | 도메인 작업 | 하네스 실험 |
| --- | --- | --- |
| 0002 | 장바구니 금액 계산 | 기본 루프·게이트 |
| 0003 | 쿠폰 규칙 | Intent: 모호한 spec에 에이전트가 되묻는가 |
| 0004 | - | Guardrails: hooks로 spec 없는 수정 차단 |
| 0005 | 주문 상태 흐름 | Eval: 속성 기반 테스트 게이트 |
| 0006 | 할인·배송 분리 | Orchestration: 서브에이전트 병렬 작업 |
