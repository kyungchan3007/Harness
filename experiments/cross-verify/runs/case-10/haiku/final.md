---

## 판정: **rejected**

### 근거

1. **규칙 7 위반 (적용 순서 목록 순서 무관):**
   - 입력: `[{scope:"order",type:"rate",value:10},{scope:"item",sku:"A",type:"fixed",value:2000}]`
   - 기대: discount = 2,800 (상품 쿠폰 2,000 + 주문 쿠폰 800)
   - 실제: discount = 3,000 (상품 쿠폰 2,000 + 주문 쿠폰 1,000)
   - 원인: Line 72 `const orderBase = coupons.findIndex((c) => c.scope === "order") < firstItemAt ? subtotal : subtotal - itemDiscount;` 
   - 주문 쿠폰이 목록에서 먼저 나올 때 orderBase = subtotal (규칙 위반)

2. **규칙 6 위반 (주문 쿠폰 기준금액):**
   - 규칙 6: "주문 쿠폰의 기준 금액은 `상품 합계 − 상품 쿠폰 할인 합계`입니다"
   - 코드는 목록 순서에 따라 기준금액이 달라짐
   - 올바른 구현: `const orderBase = subtotal - itemDiscount;` (항상 고정)

### 확인한 것

- **규칙 1 (정률 원 미만 버림):** ✓ `Math.floor()` 사용, 333 × 10% = 33 확인
- **규칙 2 (정액 기준금액 이상 불가):** ✓ `Math.min(value, base)` 확인
- **규칙 3 (maxDiscount):** ✓ `Math.min(amount, maxDiscount)` 확인
- **규칙 4 (minOrder 조건 미충족 시 0):** ✓ subtotal < minOrder일 때 반환 0
- **규칙 5 (상품 쿠폰 줄 1회):** ✓ `line.unitPrice * line.quantity` 계산
- **규칙 7 (적용 순서 무관):** ✗ 테스트 1(주문먼저)와 테스트 2(상품먼저) 결과 불일치
- **규칙 8 (개수 제한):** ✓ CouponError 정상 발생, 없는 상품도 CouponError
- **규칙 9 (쿠폰 검증):** ✓ 정률 1~100, 정액 1+, maxDiscount/minOrder ≥0 검증
- **규칙 10 (할인 합산):** ✓ discount = itemDiscount + orderDiscount
- **규칙 11 (빈 장바구니):** ✓ 모든 금액 0 반환
- **타입/인터페이스:** ✓ 규칙서 형식 정확히 준수
- **pnpm check:** ✓ ALL PASS (타입 체크, 테스트, 기록)
