---

## 판정

**판정: approved**

### 근거

모든 규칙이 올바르게 구현되었습니다. 검사 과정에서 위반 사항을 발견하지 못했습니다.

### 확인한 것

- **규칙 1-3 (정률/정액/maxDiscount)**: `discountOf` 함수에서 정률은 `Math.floor((base * value) / 100)`, 정액은 `Math.min(value, base)`, maxDiscount 제한은 `Math.min(amount, maxDiscount)`로 올바르게 구현됨
  
- **규칙 4 (minOrder 조건)**: `subtotal < minOrder` 조건 만족 시 할인 0원 반환, 오류 발생 없음 확인 (`node try-coupon.mjs '[...] [{"minOrder":10000,...}]'` 결과: 할인 0원)

- **규칙 5 (상품 쿠폰 줄 금액)**: 예제 `unitPrice=1, quantity=3, rate=50%` 실행 시 할인 1원 (줄 금액 3×50÷100=1.5→1), 개당 적용(0×3=0)과 다름 확인

- **규칙 6-7 (주문 쿠폰 기준 금액, 적용 순서)**: 상품 쿠폰 할인 후 금액을 주문 쿠폰의 기준으로 사용하는 계산 순서 확인 (복합 테스트: 상품 할인 5000 후 주문 기준 30000으로 할인 1500 계산)

- **규칙 8 (중복 체크)**: 상품 쿠폰 중복/주문 쿠폰 2장/없는 상품 쿠폰 모두 `CouponError` 발생 확인

- **규칙 9 (유효성 검사)**: 정률 0/101/소수, 정액 0/음수, maxDiscount/minOrder 음수, 상품 쿠폰 sku 없음 모두 `CouponError` 발생 확인

- **규칙 10-11**: 배송비는 할인 후 금액(`subtotal - discount >= 50000`)으로 결정 확인, 빈 장바구니 시 모든 금액 0 확인

- **규칙 12 (불변성)**: 코드에서 `items`·`coupons` 배열 수정 없음 확인

- **타입 검사 및 테스트**: `pnpm check` ALL PASS (Typecheck ✅, Unit tests 128/128 ✅)
