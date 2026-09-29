# harness-lab

AI 코딩 에이전트(Claude Code, Codex)를 감싸는 **하네스**(Loop · Guardrails · Eval · Observability)를 실험하는 샌드박스입니다.

- 실험 대상 도메인은 **쇼핑몰 할인·주문 엔진**입니다. 쿠폰 중복·반올림·배송비 경계처럼 에이전트가 틀리기 쉬운 규칙이 많아서, 하네스가 실수를 막는지 관찰하기 좋습니다.
- 도메인 규칙의 단일 소스: [agents/context/domain.md](agents/context/domain.md)
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

## 실험 로드맵

| 단계 | 도메인 작업 | 하네스 실험 |
| --- | --- | --- |
| 0002 | 장바구니 금액 계산 | 기본 루프·게이트 |
| 0003 | 쿠폰 규칙 | Intent: 모호한 spec에 에이전트가 되묻는가 |
| 0004 | - | Guardrails: hooks로 spec 없는 수정 차단 |
| 0005 | 주문 상태 흐름 | Eval: 속성 기반 테스트 게이트 |
| 0006 | 할인·배송 분리 | Orchestration: 서브에이전트 병렬 작업 |
