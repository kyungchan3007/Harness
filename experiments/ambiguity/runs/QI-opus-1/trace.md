# 0030 — 포인트 적립 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0030`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1, 브랜치 `task/0030-points`가 이미 있어 그대로 사용. TASKS.md에 0030 행 추가 | 사용자가 이슈·브랜치를 지정함 |
| 2 | DEFINE | domain.md·architecture.md·price-cart.ts 확인. 포인트·회원 등급 개념이 없고 쿠폰(0003)도 미구현 | 요청 중 "좀 줄여", "더 많이"는 수치가 없고, 단수 처리·적립 기준 금액·VIP+쿠폰 결합도 정해지지 않음 |
| 3 | DEFINE | prd.md에 열린 질문 Q1~Q8 정리, 답과 무관하게 확정된 Acceptance만 기재 | 사용자 지시: 모호하면 추측하지 말고 질문. 수치를 추측해 넣으면 테스트가 추측을 굳혀 버린다 |
| 4 | PLAN | sdd.md 초안(정수 연산·정책 객체 분리·검증 계획)만 작성 | 질문과 무관한 구조만 먼저 잡아 둠 |
| 5 | 막힘 | 구현 중단, TASKS status=blocked(질문 대기) | 답을 받으면 prd Acceptance·sdd 수치를 확정하고 BUILD 진행 |
| 6 | DEFINE | 요청자 답변 Q1~Q7 반영. domain.md에 "포인트 적립 규칙 (0030)" 추가 → prd 답·Acceptance 확정 | 규칙 단일 소스가 domain.md라서 코드보다 먼저 고침 |
| 7 | DEFINE | Q8(0원 주문)은 위임받음 → 0포인트, 예외 규칙 없음으로 결정 | 내림 규칙에서 자연히 0이 나오므로 분기를 따로 두면 규칙만 늘어남 |
| 8 | PLAN | 적립률을 bp 정수(100)로 두고 ×2, ÷2 후 `floor(base*bp/10000)` | `×0.01` 부동소수는 내림 경계에서 오차 가능(예: 0.29*100). 100은 2로 나누어떨어져 bp가 항상 정수 |
| 9 | PLAN | 정책 객체 분리안 기각, 상수 하나만 | 정책 교체 요구가 없음(YAGNI) |
| 10 | BUILD | `points.ts`(`earnPoints`)·`points.test.ts` 8개 작성. discount>subtotal·알 수 없는 등급은 RangeError | priceCart와 같은 불변식을 지켜 잘못된 PriceBreakdown이 음수 포인트를 만들지 않게 함 |
| 11 | GATE | `pnpm check` ALL PASS (113 tests) | 1회 통과, 되돌림 없음 |
| 12 | REFLECT | 위험: 0003에서 discount가 쿠폰 외 할인에도 쓰이면 "discount>0=쿠폰" 판정이 틀어짐 | 요청자 답(Q6)대로 구현하고 0003 착수 시 재확인 필요 |
