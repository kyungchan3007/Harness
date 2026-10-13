---

## 판정: **rejected**

### 근거

- **규칙 4 위반** · minOrder 조건 경계값 · subtotal = 10000, minOrder = 10000일 때 기대: discount = 1000 · 실제: discount = 0

### 확인한 것

- 규칙 1 (정률 원 미만 버림): ✓ 333 × 33% = 109.89 → 109
- 규칙 2 (정액 기준 금액 상한): ✓ 5000원 쿠폰이 1000원 기준 금액에서 1000만 할인
- 규칙 3 (maxDiscount): ✓ 10000 × 50% = 5000이 maxDiscount 3000으로 제한
- 규칙 5 (상품 쿠폰 줄 금액): ✓ 1000 × 5 = 5000에 10% 할인 = 500
- 규칙 6 (주문 쿠폰 기준 금액): ✓ (30000 - 2000) = 28000 기준으로 계산
- 규칙 7 (적용 순서): ✓ [order, item] 순서여도 item을 먼저 적용
- 규칙 8 (상품·주문 쿠폰 개수 제한): ✓ 상품 중복·주문 2장·없는 상품 모두 CouponError 발생
- 규칙 9 (쿠폰 validation): ✓ rate 0, fixed 0, item without sku 모두 거부
- 규칙 10 (discount 합계): ✓ 3000 + 4000 = 7000
- 규칙 11 (빈 장바구니): ✓ 모든 금액 0
- 규칙 12 (immutability): ✓ items·coupons 직접 수정 없음
- **규칙 4 (minOrder)**: ✗ 코드는 `subtotal <= coupon.minOrder`으로 조건을 처리하나, 규칙은 "subtotal >= minOrder일 때만 적용"이므로 `subtotal < minOrder`일 때만 0을 반환해야 함. 테스트 결과: minOrder와 같은 값에서 할인이 적용되지 않음
