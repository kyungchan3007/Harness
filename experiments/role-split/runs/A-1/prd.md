# 0030 — 쿠폰 적용 — PRD

- **이슈:** #1
- **문제:** 0002에서 장바구니 금액을 계산하지만 할인이 없다. 실제 쇼핑몰은 쿠폰으로 할인을 해야 한다.
- **목표:** 상품별·주문 전체 쿠폰을 지원하고, 정률·정액 할인, 조건부 적용을 구현한다. 규칙은 [domain.md](../../context/domain.md) 그 외 아래 규칙 12가지다.
- **비목표:** 쿠폰 검증 API, 쿠폰 조합 최적화, 특정 상품 제외.

## Acceptance
- [x] `Coupon` 인터페이스와 `priceWithCoupons()` 함수가 domain.md 기반 규칙 12가지를 모두 지킨다 (규칙마다 테스트 1개 이상)
- [x] 상품 쿠폰과 주문 쿠폰을 순서대로 적용한다 (상품 먼저, 1장씩 제한)
- [x] 정률 할인은 원 미만을 버리고, 정액·상한 조건을 처리한다 (경계값: 0원 할인, maxDiscount 초과)
- [x] `minOrder` 미충족은 오류가 아니라 쿠폰 무효 처리한다
- [x] 입력(`items`, `coupons`)을 수정하지 않는다
- [x] `pnpm check` ALL PASS

## 규칙 12가지
1. 정률 할인: `floor(기준금액 × value / 100)`
2. 정액 할인: `min(value, 기준금액)`
3. 상한 제한: `maxDiscount` 있으면 적용
4. 최소주문: `minOrder` 미충족 시 쿠폰 미적용 (오류 아님)
5. 상품 쿠폰 기준: 줄 금액(`unitPrice × quantity`)
6. 주문 쿠폰 기준: `subtotal - 상품쿠폰할인합계`
7. 적용 순서: 상품 쿠폰 모두 → 주문 쿠폰
8. 중복 제한: 상품당 1장, 주문 1장 (위반·없는 sku는 `CouponError`)
9. 검증: rate(1-100%), fixed(≥1), maxDiscount·minOrder(≥0), item 쿠폰은 sku 필수
10. `discount`: 상품+주문 쿠폰 할인 합계
11. 빈 장바구니: 모든 금액 0
12. 불변성: `items`, `coupons` 수정 금지

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
