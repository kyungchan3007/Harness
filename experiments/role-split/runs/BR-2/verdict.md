# 0030 — 판정서

## 1차 · 2026-10-01

판정: approved

### 근거

모든 규칙과 수용 기준을 구현과 테스트로 확인했습니다. 반려 사항 없음.

### 확인한 것

**테스트 실행 결과:**
- `pnpm check` ALL PASS (134개 테스트 모두 통과)
  - Unit tests: 134 passed
  - Typecheck: PASS
  - Task records: PASS

**규칙별 테스트 커버리지 확인:**
- 정률 쿠폰 계산: `floor(기준금액 × value / 100)` ✓ (coupon.test.ts 15-43줄)
- 정액 쿠폰 계산: `min(value, 기준금액)` ✓ (coupon.test.ts 46-73줄)
- maxDiscount 상한: 할인 ≤ maxDiscount ✓ (coupon.test.ts 76-95줄)
- minOrder 조건: subtotal ≥ minOrder일 때만 적용, 미충족 시 0원 (오류 아님) ✓ (coupon.test.ts 98-148줄)
- 상품 쿠폰 기준금액: unitPrice × quantity (줄 금액) ✓ (coupon.test.ts 151-197줄, 389-406줄)
- 주문 쿠폰 기준금액: subtotal - 상품쿠폰할인합계 ✓ (coupon.test.ts 200-237줄)
- 적용 순서: 상품 쿠폰 먼저, 그다음 주문 쿠폰 ✓ (coupon.test.ts 200-237줄)
- 상품당 최대 1장 쿠폰: 초과 시 CouponError ✓ (coupon.test.ts 240-247줄)
- 주문 최대 1장 쿠폰: 초과 시 CouponError ✓ (coupon.test.ts 250-257줄)
- 장바구니 없는 상품: CouponError ✓ (coupon.test.ts 260-267줄)
- 정률 value 검증: 1~100 정수만 허용 ✓ (coupon.test.ts 280-314줄)
- 정액 value 검증: 1 이상 정수만 허용 ✓ (coupon.test.ts 298-323줄)
- maxDiscount/minOrder 검증: 0 이상 정수만 허용 ✓ (coupon.test.ts 325-341줄)
- 상품 쿠폰 sku 필수: 없으면 CouponError ✓ (coupon.test.ts 271-278줄)
- 빈 장바구니: 모든 금액 0 ✓ (coupon.test.ts 344-353줄)
- 배송비 통합: 할인 후 금액 기준 ✓ (coupon.test.ts 356-387줄)
- 입력 불변성: items/coupons 배열 미변경 ✓ (coupon.test.ts 409-422줄)

**경계값 검증:**
- minOrder = subtotal (등호 포함): 적용됨 ✓ (coupon.test.ts 133-148줄)
- minOrder 미충족: 할인 0원 (오류 아님) ✓ (coupon.test.ts 116-131줄)
- 정액 쿠폰이 기준금액 초과: 기준금액만큼만 할인 ✓ (coupon.test.ts 58-73줄)
- maxDiscount가 기본 할인보다 작음: maxDiscount 적용 ✓ (coupon.test.ts 77-95줄)
- 상품 쿠폰 + 주문 쿠폰: 순서대로 계산 ✓ (coupon.test.ts 200-237줄)
- quantity > 1: 줄 금액(unitPrice × quantity) 기준 ✓ (coupon.test.ts 389-406줄)
- 정률 계산 버림: floor 사용으로 원 미만 버림 ✓ (coupon.test.ts 28-43줄 / 100 * 33 = 33)

### 원문 대조

**request.md 규칙별 구현·테스트 대조:**

1. 정률 쿠폰: `기준금액 × value / 100` (원 미만 버림)
   - 구현: coupon.ts 68줄 `Math.floor((baseAmount * coupon.value) / 100)` ✓
   - 테스트: coupon.test.ts 16-43줄 ✓

2. 정액 쿠폰: `value`원 (기준금액 초과 불가)
   - 구현: coupon.ts 71줄 `Math.min(coupon.value, baseAmount)` ✓
   - 테스트: coupon.test.ts 46-73줄 ✓

3. maxDiscount 상한
   - 구현: coupon.ts 75-76줄 `discount = Math.min(discount, coupon.maxDiscount)` ✓
   - 테스트: coupon.test.ts 76-95줄 ✓

4. minOrder 조건 (미충족 시 0원, 오류 아님)
   - 구현: coupon.ts 140-141줄, 154줄 ✓
   - 테스트: coupon.test.ts 116-148줄 ✓

5. 상품 쿠폰 기준금액: `unitPrice × quantity`
   - 구현: coupon.ts 137줄 `(item.unitPrice * item.quantity) as Won` ✓
   - 테스트: coupon.test.ts 151-197줄, 389-406줄 ✓

6. 주문 쿠폰 기준금액: `subtotal − 상품쿠폰할인합계`
   - 구현: coupon.ts 156줄 `const baseAmount = (subtotal - itemDiscountTotal) as Won` ✓
   - 테스트: coupon.test.ts 200-237줄 ✓

7. 적용 순서: 상품 쿠폰 먼저, 그다음 주문 쿠폰
   - 구현: coupon.ts 104-105줄 scope별 분류, 131-146줄 상품, 149-161줄 주문 ✓
   - 테스트: coupon.test.ts 200-237줄 ✓

8. 상품당 최대 1장, 주문 최대 1장 (초과 시 CouponError, 없는 상품도 오류)
   - 구현: coupon.ts 108-129줄 ✓
   - 테스트: coupon.test.ts 240-267줄 ✓

9. 검증 실패 시 CouponError
   - 정률 value 1~100: coupon.ts 32-35줄, 테스트 coupon.test.ts 280-314줄 ✓
   - 정액 value ≥1: coupon.ts 39-42줄, 테스트 coupon.test.ts 298-323줄 ✓
   - maxDiscount/minOrder ≥0: coupon.ts 46-56줄, 테스트 coupon.test.ts 325-341줄 ✓
   - 상품 쿠폰 sku 필수: coupon.ts 27-29줄, 테스트 coupon.test.ts 271-278줄 ✓

10. 결과 discount = 상품쿠폰 + 주문쿠폰 할인
    - 구현: coupon.ts 165줄 `const totalDiscount = (itemDiscountTotal + orderDiscountTotal) as Won` ✓
    - 테스트: coupon.test.ts 전체 (모든 계산이 이를 검증) ✓

11. 빈 장바구니: 모든 금액 0
    - 구현: coupon.ts 91-92줄 ✓
    - 테스트: coupon.test.ts 344-353줄 ✓

12. 입력 불변성
    - 구현: readonly 키워드 사용, 배열 수정 없음 ✓
    - 테스트: coupon.test.ts 409-422줄 ✓

**인터페이스 정확성:**
- Coupon 인터페이스: scope, sku(?), type, value, maxDiscount(?), minOrder(?) ✓
- CouponError 클래스: export 됨 ✓
- priceWithCoupons 함수: (items, coupons, shippingPolicy?) → PriceBreakdown ✓
- 배송비 규칙: 할인 후 금액 ≥ 50,000 시 무료, 아니면 3,000원 ✓

**complete조건 확인:**
- PRD 21개 수용 기준 모두 충족 ✓
- pnpm check ALL PASS ✓
- request.md 규칙 12개 모두 구현 ✓
