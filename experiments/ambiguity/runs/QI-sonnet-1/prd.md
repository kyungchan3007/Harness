# 0030 — 포인트 적립 — PRD

- **이슈:** #1
- **문제:** 주문 시 결제 금액에 따라 포인트를 적립하는 기능이 없다.
- **목표:** `src/pricing/points.ts`에 `priceCart` 결과와 회원 등급으로 적립 포인트(정수)를 계산하는 순수 함수를 만든다.
- **입력:** `PriceBreakdown`(subtotal·discount·shipping·total)과 회원 정보 `{ grade: "VIP" | "NORMAL" }`
- **비목표:** 포인트 사용·차감·만료, 포인트 영속화, 쿠폰 할인액 계산(0003), 회원 관리.

## 확정된 규칙 (요청자 답변, [domain.md](../../../context/domain.md) "포인트 적립 규칙 (0030)")

| 질문 | 결정 |
| --- | --- |
| 쿠폰 사용 판별 | `PriceBreakdown.discount > 0` |
| 쿠폰 사용 시 | 적립률 절반 (1% → 0.5%) |
| VIP | 적립률 2배 (1% → 2%), 회원 정보로 따로 받음 |
| VIP + 쿠폰 | VIP 2배 먼저, 쿠폰 절반 나중 (2% → 1%) |
| 적립 기준 | `subtotal − discount` (배송비 제외) |
| 소수점 | 내림 |
| 0포인트 | 요청자가 정하지 않음 → 에이전트 결정: 그대로 0 반환(거부하지 않음). 필요하면 번복 가능 |

## Acceptance
- [x] 요청자 답변으로 모호한 점 해소, `domain.md`에 포인트 규칙을 먼저 반영
- [x] `src/pricing/points.ts` 구현 (정수 연산, 내림, 등급·쿠폰 4가지 조합)
- [x] 단위 테스트: 규칙 1~7, 경계(0원·내림 경계·배송비 제외·쿠폰 판별 `discount` 0/1)
- [x] 잘못된 입력(비정수·음수·할인 > 상품 합계) 거부
- [x] `pnpm check` ALL PASS

설계: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
