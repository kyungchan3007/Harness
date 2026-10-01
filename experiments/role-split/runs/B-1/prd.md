# 0030 — 쿠폰 적용 — PRD

- **이슈:** #30
- **문제:** 쇼핑몰 할인 엔진에서 쿠폰 기능이 없다. 단순 정액/정률 할인부터 시작해 기능을 확장하려면 쿠폰 도메인을 먼저 확립해야 한다.
- **목표:** 쿠폰을 정의하고, 상품별·주문별 쿠폰을 올바른 순서대로 적용하여 최종 할인 금액과 배송비를 계산하는 `priceWithCoupons()` 함수를 구현한다. 규칙은 [domain.md](../../context/domain.md)에 추가된다.
- **비목표:** 쿠폰 조회, 저장, 유효 기간 검증, 사용 횟수 제한. 이는 0031 이후.
- **역할 분리:** on

## Acceptance

- [ ] `agents/context/domain.md`에 쿠폰 규칙 1~12번이 추가되었다
- [ ] `src/pricing/coupon.ts`에 `Coupon`, `CouponError`, `priceWithCoupons()` 구현되었다
- [ ] 정률 할인(percentage) 및 정액 할인(fixed) 모두 작동한다
- [ ] 상품별(sku)과 주문별(order) 쿠폰이 올바른 순서로 적용된다
- [ ] 할인 상한(maxDiscount)과 최소 주문 금액(minOrder) 조건이 강제된다
- [ ] 쿠폰 입력 검증이 CouponError를 던진다
- [ ] 최종 할인 금액이 배송비 계산에 반영된다
- [ ] `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
