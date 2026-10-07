# 0030 — 포인트 적립 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0030`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1·브랜치 `task/0030-points`는 이미 있음 → TASKS.md에 0030 in-progress 등록 | 요청자가 이슈·브랜치를 미리 만들어 둠 |
| 2 | DEFINE | domain.md·price-cart.ts를 읽고 요청과 대조 → 모호한 점 8개(Q1~Q8)를 prd에 정리 | "좀 줄여"·"더 많이"는 수치가 없고, 결제 금액에 배송비가 포함되며, 쿠폰(0003)은 아직 없음. 지시대로 추측 구현하지 않고 질문 |
| 3 | DEFINE | **BLOCKED — 사람의 답 대기.** 코드는 손대지 않음 | 답을 받으면 domain.md 규칙 → Acceptance 확정 → BUILD |
| 4 | DEFINE | 요청자 답 Q1~Q6 반영. Q7·Q8은 위임받아 결정: 계산 함수만 / 0원이면 0, 상한·최소 금액 없음, 잘못된 입력은 오류 | 저장 계층이 없고 요청에 근거 없는 제한은 만들지 않음. 입력 검증은 `priceCart`와 맞춤 |
| 5 | DEFINE | prd Acceptance를 구체 숫자 예시(A1~A13)로 고정 | 다른 개발자가 문서만 보고 구현·테스트하므로 기대값을 모호함 없이 |
| 6 | PLAN | sdd에 인터페이스·계산 순서 고정, 적립률은 bp 정수 | 0.005 같은 소수 곱셈은 내림 경계에서 부동소수 오차 위험 |
| 7 | DEFINE | domain.md 수정이 guard hook에 막힘("sdd 접근을 채우세요") → sdd를 먼저 확정 후 다시 수정 | 첫 답 전 sdd의 "**접근 (초안, …):**" 표기를 hook이 "접근" 항목으로 인식하지 못함. 표기를 "**접근:**"으로 맞춤 |
| 8 | HANDOFF | 요청자 지시로 문서까지만 작성, 코드는 다른 개발자가 구현 | BUILD·GATE는 구현자 몫. `pnpm check`는 문서 변경만 있는 상태에서 확인 |
| 9 | DEFINE | 추가 답 "1. 알아서 정해 주세요"를 받음 → 문서 변경 없음 | Q1(적립 기준)은 이미 요청자가 `subtotal − discount`로 명시해 답함. 위임 답으로 명시 답을 덮지 않음. 남은 열린 질문은 "문서만 커밋할지"뿐이었고, 요청 범위가 "문서까지만"이라 커밋은 하지 않음 |
| 10 | BUILD | `src/pricing/points.ts` 구현 (MemberGrade·Member·PointsPolicy 타입, DEFAULT_POINTS_POLICY 상수, calculatePoints 함수) | sdd 인터페이스·계산 순서를 그대로 따름. bp 정수 사용으로 부동소수 오차 제거. 5단계 검증(금액 범위·discount ≤ subtotal·등급·기준 금액·내림) 순서 준수 |
| 11 | BUILD | `src/pricing/points.test.ts` 테스트 (prd A1~A11을 단위 테스트로 옮김) | A1~A11의 기대값과 입력을 그대로 테스트 케이스로. 부수 케이스(custom policy 등)도 추가 |
| 12 | GATE | `pnpm check` 실행 → Typecheck ✅, Unit tests 126 pass ✅, Task records ✅ | 모든 테스트 PASS. prd A1~A11 확인됨, prd A12(domain.md 규칙) 이미 존재, A13(pnpm check PASS) 완료 |
