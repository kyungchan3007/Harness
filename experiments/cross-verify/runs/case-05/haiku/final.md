문제가 명확합니다. 이제 최종 판정서를 작성하겠습니다.

---

**판정: rejected**

### 근거
- **규칙 3 위반**: maxDiscount 로직이 잘못됨
  - 입력: 1% 정률 쿠폰, base=100, maxDiscount=100 → 할인 계산 = Math.floor(100×1/100) = 1
  - 기대: min(1, 100) = 1
  - 실제: 100 (코드가 `amount = coupon.maxDiscount ?? amount`로 amount를 maxDiscount로 교체함)

- **Typecheck FAIL**: `src/pricing/coupon.ts:40:79` 타입 에러
  - 코드: `if (false) amount = Math.min(amount, coupon.maxDiscount);`
  - 문제: `coupon.maxDiscount`가 undefined일 수 있는데 Math.min 인자로 전달하려고 함
  - 결과: TS2345 에러로 `pnpm check` 실패

### 확인한 것
- **규칙 1** (정률 원 미만 버림): ✓ 333×3/100=9 정확
- **규칙 2** (정액 상한): ✓ fixed=2000, base=1000 → discount=1000 정확
- **규칙 3** (maxDiscount 상한): ❌ 1% of 100=1인데 maxDiscount=100 → discount=100 (버그)
- **규칙 4** (minOrder 조건): ✓ subtotal=10000 < minOrder=50000 → discount=0 정확
- **규칙 5** (상품 쿠폰 줄 금액): ✓ 1000×5 줄의 10% → discount=500 정확
- **규칙 6** (주문 쿠폰 기준): ✓ subtotal-itemDiscount → discount=3700 정확
- **규칙 8** (1장 제한): ✓ 중복 쿠폰 → CouponError 정확
- **규칙 9** (쿠폰 검증): ✓ invalid value → CouponError 정확
- **규칙 11** (빈 장바구니): ✓ [] → {subtotal:0, discount:0, shipping:0, total:0} 정확
- **Typecheck**: ❌ Line 40 타입 에러로 pnpm check FAIL
