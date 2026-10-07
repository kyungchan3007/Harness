# 0030 — 포인트 적립 — PRD

- **이슈:** #1
- **문제:** 주문할 때 적립할 포인트를 정하는 규칙과 코드가 없다.
- **목표:** 주문 1건의 금액 계산 결과(`PriceBreakdown`)와 회원 등급으로 적립 포인트(정수)를 계산하는 순수 함수를 `src/pricing/points.ts`에 만든다. 규칙은 [domain.md — 포인트 적립 규칙](../../../context/domain.md#포인트-적립-규칙-0030)이 단일 소스다.
- **비목표:** 포인트 잔액 저장, 적립 이력, 포인트 사용, 주문 취소 시 회수, 적립 시점(결제 시·구매 확정 시), 쿠폰 계산 자체(0003), VIP/NORMAL 외 등급.

## 요구사항 확정 내역

| # | 질문 | 답 | 출처 |
| --- | --- | --- | --- |
| Q1 | 결제 금액에 배송비가 들어가나? | 아니오. 기준은 `subtotal − discount` | 요청자 |
| Q2 | 쿠폰을 쓰면 얼마나 줄이나? | 적립률 절반 (1% → 0.5%) | 요청자 |
| Q3 | 쿠폰 사용은 어떻게 판단하나? | `PriceBreakdown.discount > 0` | 요청자 |
| Q4 | VIP는 얼마나 더 주나? | 적립률 2배 (1% → 2%). 회원 정보는 `{ grade: "VIP" \| "NORMAL" }`로 따로 받는다 | 요청자 |
| Q5 | VIP가 쿠폰을 쓰면? | VIP 2배 먼저, 그다음 쿠폰 절반 (2% → 1%) | 요청자 |
| Q6 | 정수로 만들 때 소수점은? | 내림 | 요청자 |
| Q7 | 범위 | **적립 포인트 계산 함수만.** 잔액·이력·회수는 비목표 | 요청자가 위임 → 에이전트 결정. 이유: 저장소에 회원·주문 저장 계층이 없고, 요청 문장도 "적립 포인트 정하기"만 다룸 |
| Q8 | 0원·상한·최소 금액 | **기준 금액 0이면 0포인트, 상한과 최소 금액 없음.** 입력이 잘못되면 오류를 던진다(아래 A7~A9) | 요청자가 위임 → 에이전트 결정. 이유: 요청에 근거가 없는 제한을 만들지 않음. 잘못된 입력 처리는 `priceCart`와 맞춤 |

## Acceptance

함수 이름은 `calculatePoints(breakdown: PriceBreakdown, member: Member): number`로 정한다(sdd 참고). 아래 기대값은 구현하는 사람이 그대로 단위 테스트로 옮긴다.

- [ ] A1 기본: NORMAL, subtotal 10,000 / discount 0 / shipping 3,000 / total 13,000 → **100** (배송비 제외, 130이 아님)
- [ ] A2 쿠폰: NORMAL, subtotal 20,000 / discount 2,000 / shipping 3,000 / total 21,000 → 기준 18,000 × 0.5% = **90**
- [ ] A3 VIP: VIP, subtotal 10,000 / discount 0 / shipping 3,000 / total 13,000 → **200**
- [ ] A4 VIP+쿠폰: VIP, subtotal 20,000 / discount 2,000 / shipping 3,000 / total 21,000 → 기준 18,000 × 1% = **180**
- [ ] A5 내림: NORMAL·쿠폰 없음 기준 199 → **1**, 99 → **0** / NORMAL·쿠폰 기준 199(subtotal 200, discount 1) → **0** / VIP·쿠폰 기준 150(subtotal 151, discount 1) → **1** / VIP·쿠폰 없음 기준 50 → **1**
- [ ] A6 0원: 빈 장바구니(모두 0) → **0**, discount = subtotal(예: 5,000/5,000) → **0**
- [ ] A7 상한 없음: NORMAL, subtotal 10,000,000 / discount 0 → **100,000**
- [ ] A8 잘못된 금액: subtotal 또는 discount가 음수·소수·안전 정수 초과면 `RangeError` (`assertWon` 재사용)
- [ ] A9 discount > subtotal이면 `RangeError`
- [ ] A10 정해진 등급이 아니면(런타임에 `"GOLD"` 등) 오류를 던진다
- [ ] A11 `shipping`, `total` 값은 결과에 영향을 주지 않는다(A1과 같은 입력에서 shipping 0 / total 10,000이어도 100)
- [ ] A12 domain.md에 포인트 적립 규칙 절이 있고 위 내용과 일치
- [ ] A13 `pnpm check` PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
