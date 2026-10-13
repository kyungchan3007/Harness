판정: **rejected**

### 근거
- **규칙 4 위반**: minOrder 조건 미충족 시 처리. 
  - 입력: 상품 합계 10,000원, minOrder 20,000원인 주문 쿠폰
  - 기대: 오류 없이 해당 쿠폰만 적용 안 함 (할인 0원) → 결과 discount 0
  - 실제: `CouponError: 최소 주문 금액 미달` throw
  - 규칙: "조건에 못 미치면 오류가 아니라 그 쿠폰만 적용하지 않습니다(할인 0원)"
  - 위치: `src/pricing/coupon.ts:38` — `discountOf` 함수에서 조건 미충족 시 throw하고 있음

### 확인한 것
- ✅ 규칙 1: 정률 쿠폰 원 미만 버림 — Math.floor 사용, 10001 * 13 / 100 = 1300 정확
- ✅ 규칙 2: 정액 쿠폰 기준 금액 제한 — Math.min 사용, 10000 value > 5000 base = 5000 적용
- ✅ 규칙 3: maxDiscount 상한 — 4000 > 2500 maxDiscount = 2500 적용
- ⚠️ 규칙 4: minOrder 조건 미충족 — throw 발생, 기대는 skip with 0 discount
- ✅ 규칙 5: 상품 쿠폰 줄 금액 — 30000 * 10 / 100 = 3000 정확
- ✅ 규칙 6: 주문 쿠폰 기준 금액 — (25000 - 2000) * 10 / 100 = 2300 정확
- ✅ 규칙 7: 적용 순서 — 상품 쿠폰 먼저 (1000) → 주문 쿠폰 (1800) = 2800 total
- ✅ 규칙 8: 중복 검증 — 상품당 1장·주문 1장·없는 상품 모두 error
- ✅ 규칙 9: 유효성 검사 — rate 1-100, fixed ≥1, maxDiscount/minOrder ≥0, item sku required
- ✅ 규칙 10: discount 합계·배송비 — 할인 후 금액 기준 (48600 < 50000 = shipping 3000)
- ✅ 규칙 11: 빈 장바구니 — 모든 값 0
- ✅ 규칙 12: 불변성 — 코드에서 items/coupons 읽기만 수행
- ✅ pnpm check: ALL PASS
