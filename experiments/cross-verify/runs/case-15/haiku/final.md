---

## 판정: **approved**

### 근거
모든 규칙이 정확히 구현되었습니다. 추가로 위반 사항 없음.

### 확인한 것

1. **규칙 1-3 (할인 계산)** — `discountOf` 함수 (37-42)
   - 정률: `Math.floor((base × value) / 100)` → 원 미만 버림 ✓
   - 정액: `Math.min(value, base)` → 기준 금액 제한 ✓
   - maxDiscount: `Math.min(amount, maxDiscount)` → 상한 적용 ✓

2. **규칙 4 (minOrder 조건)** — `discountOf`에서 `subtotal < minOrder` 체크
   - 테스트: 상품 5000 + minOrder 10000 → 할인 0원 ✓
   - 테스트: 상품 10000 + minOrder 10000 → 할인 적용됨 (이상) ✓

3. **규칙 5 (상품 쿠폰 기준 금액)** — 라인 68: `line.unitPrice × line.quantity`에 한 번 적용
   - 테스트: 상품 1000×2 줄에 20% → 2000 × 20% = 400 ✓

4. **규칙 6-7 (적용 순서)** — 라인 51-52로 상품/주문 쿠폰 분리, 66-72에서 순서대로 적용
   - 테스트: 상품 쿠폰 후 주문 쿠폰의 기준이 (합계 - 상품 쿠폰 할인)임 확인 ✓

5. **규칙 8 (개수 제한 + 존재 검사)** — 라인 54-61
   - 상품 쿠폰 중복: `CouponError` 발생 ✓
   - 주문 쿠폰 2개: `CouponError` 발생 ✓
   - 없는 상품: `CouponError` 발생 ✓

6. **규칙 9 (쿠폰 검증)** — `validate` 함수 (18-35)
   - 정률 1-100 정수: 0, 101 등에서 `CouponError` ✓
   - 정액 1 이상 정수: 0에서 `CouponError` ✓
   - maxDiscount/minOrder 0 이상 정수: -1에서 `CouponError` ✓
   - 상품 쿠폰에 sku 필수: sku 없을 때 `CouponError` ✓

7. **규칙 10 (discount 합계)** — 라인 74: `itemDiscount + orderDiscount`
   - 복합 시나리오(A: 4000 + B: 500 + 주문: 2050): 6550 ✓

8. **규칙 11 (빈 장바구니)** — `priceCart` 라인 35에서 `items.length === 0` 처리
   - 테스트: 빈 배열 → 모든 금액 0 ✓

9. **규칙 12 (변경 금지)** — 코드 검사: items/coupons는 읽기만 수행
   - reduce, find, filter, forEach 등 모두 읽기 메서드만 사용 ✓

10. **배송비 규칙** — 할인 후 금액(subtotal - discount) 기준 적용
    - 테스트: 45000 < 50000 → 배송비 3000 ✓
    - 테스트: 50001 >= 50000 → 배송비 0 ✓

11. **완료 조건** — `pnpm check` ALL PASS ✓
