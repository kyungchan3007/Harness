# 0030 — 쿠폰 적용 — PRD

- **이슈:** #1
- **문제:** 장바구니 가격 계산에 쿠폰 할인이 없어서 실제 결제 금액을 정확히 계산할 수 없음
- **목표:** 상품 쿠폰과 주문 쿠폰을 적용해 할인된 최종 가격을 계산하는 기능 구현
- **비목표:** 쿠폰 발급·관리, 쿠폰 조합 최적화, 사용 이력 기록

## Acceptance

- [ ] `src/pricing/coupon.ts` 파일이 정확한 시그니처로 생성됨 (`Coupon` 인터페이스, `CouponError` 클래스, `priceWithCoupons` 함수)
- [ ] **정률 쿠폰:** 할인액 = ⌊기준금액 × value / 100⌋ (원 미만 버림)
- [ ] **정액 쿠폰:** 할인액 = min(value, 기준금액) (기준금액을 초과 불가)
- [ ] **maxDiscount:** 쿠폰의 할인액이 maxDiscount를 초과하지 않음
- [ ] **minOrder 미충족:** subtotal이 minOrder 미만이면 오류 없이 그 쿠폰만 할인 0 적용
- [ ] **상품 쿠폰 기준금액:** 대상 sku의 unitPrice × quantity (줄당 1회)
- [ ] **주문 쿠폰 기준금액:** subtotal - (모든 상품 쿠폰 할인 합계)
- [ ] **적용 순서:** 상품 쿠폰을 모두 먼저 적용한 후 주문 쿠폰 적용
- [ ] **상품 쿠폰 제한:** sku당 1장 초과 시 CouponError
- [ ] **주문 쿠폰 제한:** 1장 초과 시 CouponError
- [ ] **장바구니에 없는 상품의 상품 쿠폰:** CouponError
- [ ] **정률 value 검증:** 1~100의 정수가 아니면 CouponError
- [ ] **정액 value 검증:** 1 이상의 정수가 아니면 CouponError
- [ ] **maxDiscount 검증:** 0 이상의 정수가 아니면 CouponError
- [ ] **minOrder 검증:** 0 이상의 정수가 아니면 CouponError
- [ ] **상품 쿠폰 필수 필드:** scope가 "item"인데 sku가 없으면 CouponError
- [ ] **결과의 discount:** 상품 쿠폰 할인 + 주문 쿠폰 할인
- [ ] **배송비 계산:** 할인 후 금액(subtotal - discount)이 50,000원 이상이면 무료, 아니면 3,000원
- [ ] **결제 금액:** subtotal - discount + shipping
- [ ] **빈 장바구니:** 쿠폰 적용 무시, 모든 금액 0 반환
- [ ] **입력 보호:** items와 coupons 배열 수정 안 함
- [ ] `pnpm check` ALL PASS (타입·린트·테스트)

- **역할 분리:** on

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
