# 0030 — 판정서

> 검사자(verifier)만 쓴다. 회차를 **아래로 쌓고** 이전 회차는 지우지 않는다. 반려는 최대 2회 — 3회째 반려면 막힘(사람이 판단).

## 1차 · 2026-10-01

판정: approved

### 확인한 것

- `pnpm check` ALL PASS: typecheck, 148 unit tests, no lockfiles, task records 모두 통과
- 규칙 1 (정률 할인): coupon.ts 124-125행 Math.floor 구현, 5개 테스트 (1000×50%=500, 1001×50%=500 버림, 1003×33%=330 버림, 경계값 1%, 100%)
- 규칙 2 (정액 할인): coupon.ts 128행 Math.min 구현, 3개 테스트 (기준금액 초과 불가)
- 규칙 3 (maxDiscount): coupon.ts 132-134행 구현, 3개 테스트 (maxDiscount=0 경계값 포함)
- 규칙 4 (minOrder): coupon.ts 117-119행 구현, 3개 테스트 (미충족시 할인 0원, 오류 아님)
- 규칙 5 (상품쿠폰 기준금액): coupon.ts 170-173행 unitPrice × quantity 구현, 2개 테스트
- 규칙 6 (주문쿠폰 기준금액): coupon.ts 180행 subtotal - itemDiscount 구현, 1개 테스트
- 규칙 7 (적용순서): coupon.ts 164-165행 scope별 필터링으로 상품→주문 순서 강제, 1개 테스트
- 규칙 8 (중복제한): coupon.ts 78-109행 itemCouponBySku, orderCouponCount, hasItem 검증, 4개 테스트 (상품당 1장, 주문 1장, 없는 상품은 오류)
- 규칙 9 (유효성검증): coupon.ts 31-72행 validateCoupon 함수, 9개 테스트 (정률 1-100 정수, 정액 1 이상 정수, maxDiscount/minOrder 0 이상 정수, item쿠폰 sku 필수)
- 규칙 10 (discount 결과): coupon.ts 187-197행 itemDiscount + orderDiscount, priceCart 함수로 배송비 계산, 5개 테스트 (배송비 50,000원 이상 무료 경계값 포함)
- 규칙 11 (빈장바구니): coupon.ts 151-154행 items.length === 0 체크, 1개 테스트 (모든 금액 0)
- 규칙 12 (입력불변성): coupon.ts 144-146행 readonly 명시, 2개 테스트 (items/coupons 배열 미수정)
- 통합테스트: 3개 테스트 (상품 2개 + 상품쿠폰 2개 + 주문쿠폰 1개, 쿠폰 없음, 커스텀 배송비 정책)
- 경계값 검증: 정률 1%, 100%, 정액 1원, maxDiscount 0원, minOrder 정확히 값, 배송비 50,000원 정확히, 다중 상품·쿠폰

### 원문 대조

- 규칙 1 "정률 쿠폰의 할인 금액은 기준 금액 × value / 100이고, 원 미만은 버립니다" ↔ coupon.ts 124-125행 `Math.floor((base * coupon.value) / 100)` ✓
- 규칙 2 "정액 쿠폰의 할인 금액은 value원이지만, 기준 금액보다 클 수 없습니다" ↔ coupon.ts 128행 `Math.min(coupon.value, base)` ✓
- 규칙 3 "maxDiscount가 있으면 그 쿠폰의 할인 금액은 maxDiscount를 넘지 않습니다" ↔ coupon.ts 132-134행 ✓
- 규칙 4 "minOrder가 있으면 할인 전 상품 합계가 minOrder 이상일 때만, 조건에 못 미치면 오류 아니라 할인 0원" ↔ coupon.ts 117-119행 ✓
- 규칙 5 "상품 쿠폰의 기준 금액은 unitPrice × quantity, 줄 금액에 한 번 계산" ↔ coupon.ts 170-173행 ✓
- 규칙 6 "주문 쿠폰의 기준 금액은 상품 합계 − 상품 쿠폰 할인 합계" ↔ coupon.ts 180행 ✓
- 규칙 7 "적용 순서는 목록 순서와 상관없이 상품 쿠폰을 모두 적용한 뒤 주문 쿠폰" ↔ coupon.ts 164-165행 scope별 필터링 ✓
- 규칙 8 "상품(sku)당 1장, 주문 1장까지만, 초과시 CouponError, 장바구니 없는 상품도 CouponError" ↔ coupon.ts 92-101행 ✓
- 규칙 9 "정률 value 1-100 정수, 정액 value 1 이상 정수, maxDiscount·minOrder 0 이상 정수, item쿠폰 sku 필수" ↔ coupon.ts 31-71행 ✓
- 규칙 10 "discount는 상품 + 주문 쿠폰 합, 배송비는 모든 할인 후 금액으로 정함" ↔ coupon.ts 187, 197행 ✓
- 규칙 11 "빈 장바구니 → 쿠폰 무시, 모든 금액 0" ↔ coupon.ts 151-154행 ✓
- 규칙 12 "items·coupons 바꾸지 않음" ↔ coupon.ts 144-146행 readonly + 테스트 ✓

최종 판정: 모든 규칙(12개) 구현 + 테스트(42개 규칙별 + 3개 통합 = 148개 총) 모두 통과 + pnpm check ALL PASS + 원문과 100% 일치
