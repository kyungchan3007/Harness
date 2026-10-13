---

## 판정: **rejected**

### 근거

- **규칙 3 위반** (maxDiscount 상한 미적용)
  - 입력: `[{"sku":"A","name":"상품A","unitPrice":10000,"quantity":1}]` + `[{"scope":"order","type":"fixed","value":1000,"maxDiscount":500}]`
  - 기대: `discount: 500` (maxDiscount 제한)
  - 실제: `discount: 1000` (제한 미적용)
  - 원인: 40번 줄 `if (coupon.maxDiscount !== undefined) amount = amount;` — 아무것도 하지 않음. 정상 코드는 `amount = Math.min(amount, coupon.maxDiscount);`

- **규칙 3 위반** (정률 쿠폰의 maxDiscount도 미적용)
  - 입력: `[{"sku":"A","name":"상품A","unitPrice":100000,"quantity":1}]` + `[{"scope":"order","type":"rate","value":50,"maxDiscount":30000}]`
  - 기대: `discount: 30000` (할인 계산값 50000원이 maxDiscount 30000원으로 제한)
  - 실제: `discount: 50000` (제한 미적용)

### 확인한 것

- ✅ 규칙 1: 정률 쿠폰 원 버림 — `Math.floor()` 정상
- ✅ 규칙 2: 정액 쿠폰 기준 금액 초과 방지 — `Math.min(value, base)` 정상  
- ✅ 규칙 4: minOrder 미충족 시 쿠폰 미적용 — 오류 없이 할인 0원 정상
- ✅ 규칙 5: 상품 쿠폰 줄 단위 계산 — `unitPrice × quantity` 정상
- ✅ 규칙 6-7: 상품 쿠폰 → 주문 쿠폰 순서 — 기준 금액 재계산 정상
- ✅ 규칙 8: 중복 제한 (상품쿠폰/SKU당 1장, 주문쿠폰 1장) — CouponError 발생 정상
- ✅ 규칙 8: 장바구니에 없는 상품 쿠폰 — CouponError 발생 정상
- ✅ 규칙 9: 쿠폰 검증 (rate 1~100, fixed ≥1, maxDiscount/minOrder ≥0, item sku 필수) — 모두 정상
- ✅ 규칙 11: 빈 장바구니 (모든 금액 0) — 정상
- ✅ 타입체크 — pnpm check 통과
- ✅ 단위 테스트 — 128/128 통과
