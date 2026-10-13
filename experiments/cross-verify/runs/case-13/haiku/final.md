---

## 판정: **rejected**

### 근거

1. **규칙 10 위반** — `src/pricing/coupon.ts:75`에서 `shippingPolicy`를 `priceCart`에 전달하지 않음.
   - 입력: items=[100원짜리 40,000원], coupons=[주문 할인 10,000원], custom shippingPolicy={fee:2000, freeThreshold:60000}
   - 기대: shipping=2000, total=32000 (할인 후 30,000원 < 60,000원이므로 배송비 2,000원 적용)
   - 실제: shipping=3000, total=33000 (기본 배송비 정책의 3,000원이 적용됨)

### 확인한 것

- **규칙 1** (정률 쿠폰 소수점 버림): 10000×15%=1500 ✓
- **규칙 2** (정액이 기준 초과 시 제한): 15000→10000 ✓  
- **규칙 3** (maxDiscount 제한): 50000→30000 ✓
- **규칙 4** (minOrder 미충족 시 미적용): 10000 < 20000 → discount=0 ✓
- **규칙 5,6** (상품·주문 쿠폰 기준 금액 계산): 상품10000+주문(90000-10000)=30000 ✓
- **규칙 7** (순서 보장): 상품 먼저 → 주문 ✓
- **규칙 8** (제한):
  - 상품 sku당 1장: 중복 시 CouponError ✓
  - 주문 1장: 2장 시 CouponError ✓
  - 없는 상품: CouponError ✓
- **규칙 9** (검증):
  - 정률 1~100: 101 시 CouponError ✓
  - 정액 ≥1: 0 시 CouponError ✓
  - maxDiscount ≥0: -1 시 CouponError ✓
  - 상품 쿠폰 sku 필수: 누락 시 CouponError ✓
- **규칙 11** (빈 장바구니): 모든 금액 0 ✓
- **Type check**: `pnpm check` PASS ✓
- **Unit tests**: `pnpm check` 128/128 PASS ✓
