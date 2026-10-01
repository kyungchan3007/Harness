# 0030 — 쿠폰 적용 기능 — 판정서

## 1차 · 2026-10-01

판정: approved

### 근거

**모든 완료 조건 충족:**

1. ✅ **domain.md 규칙 1~12 정의** — agents/context/domain.md의 쿠폰 규칙 섹션(30번 라인 이후)에 12개 규칙이 명확히 정의됨:
   - 규칙 1-2: scope, type, sku 필드 정의
   - 규칙 3-5: scope/type별 계산 로직
   - 규칙 6-7: 제약 조건 (maxDiscount, minOrder)
   - 규칙 8-9: 중복 제약 (SKU당 1장, 주문당 1장)
   - 규칙 10-12: 적용 순서, 유효성, 합산 로직

2. ✅ **규칙별 테스트 1개 이상** — src/pricing/coupon.test.ts에 12개 규칙 섹션 각각 매핑된 42개 테스트:
   - rule-1: scope/type 정의 (3개 테스트)
   - rule-2: scope=item sku 필수 (2개)
   - rule-3: scope=order sku 불허 (2개)
   - rule-4: type=rate 1~100, floor (5개, 경계값 100% 포함)
   - rule-5: type=fixed >= 1, min(value, baseAmount) (4개, 경계값 포함)
   - rule-6: maxDiscount 상한 (4개, 정수 검증 포함)
   - rule-7: minOrder 미충족 할인 0원 (6개, 경계값 충족 포함)
   - rule-8: 상품 쿠폰 SKU당 1장 (2개)
   - rule-9: 주문 쿠폰 1장 (2개)
   - rule-10: 상품→주문 순서 (2개)
   - rule-11: 유효성 검증 (4개, 범위/SKU 검증)
   - rule-12: discount 합산, 배송비 최종 할인 후 기준 (4개, 배송비 경계값 50,000 포함)
   - 특별: 빈 장바구니, readonly 배열 (2개)

3. ✅ **함수 시그니처 일치** — sdd.md와 coupon.ts 비교:
   ```ts
   // sdd.md 명시
   priceWithCoupons(items, coupons, shippingPolicy?): PriceBreakdown
   
   // coupon.ts 구현 (line 26-30)
   export function priceWithCoupons(
     items: readonly LineItem[],
     coupons: readonly Coupon[],
     shippingPolicy?: ShippingPolicy,
   ): PriceBreakdown
   ```
   완전히 일치

4. ✅ **상품/주문 쿠폰 순서** — coupon.ts의 알고리즘 확인:
   - 상품 쿠폰 필터링 (line 45-56)
   - 상품 쿠폰 적용 (line 69-83)
   - 주문 쿠폰 적용 시 기준금액 = `subtotal - itemDiscount` (line 90)
   - Test "rule-10"에서 "상품 쿠폰 5,000 + 주문 쿠폰 (15,000-5,000)×50% = 5,000" 검증 ✓

5. ✅ **정률/정액 계산** — calculateDiscount() 함수 (line 185-202):
   - 정률: `Math.floor((baseAmount * coupon.value) / 100)` (규칙 4)
   - Test "rule-4": 10,001×33% = 3,300.33 → 3,300 (floor) ✓
   - 정액: `Math.min(coupon.value, baseAmount)` (규칙 5)
   - Test "rule-5": fixed 15,000 on 10,000 item → 10,000 ✓

6. ✅ **minOrder 미충족 → 할인 0원 (오류 X)** — coupon.ts (line 77-79, 89):
   - 상품 쿠폰: `if (coupon.minOrder !== undefined && subtotal < coupon.minOrder) continue;`
   - 주문 쿠폰: `if (orderCoupon.minOrder === undefined || subtotal >= orderCoupon.minOrder)`
   - Test "rule-7": minOrder 10,001 > subtotal 10,000 → discount 0, 오류 없음 ✓

7. ✅ **정액 쿠폰 기준금액 초과 방지** — calculateDiscount() (line 193):
   - `discount = Math.min(coupon.value, baseAmount)`
   - Test "rule-5": fixed 15,000 on 10,000 item → min(15,000, 10,000) = 10,000 ✓

8. ✅ **maxDiscount 상한** — calculateDiscount() (line 197-199):
   - `discount = Math.min(discount, coupon.maxDiscount)`
   - Test "rule-6": rate 50% (5,000) with maxDiscount 3,000 → min(5,000, 3,000) = 3,000 ✓

9. ✅ **pnpm check ALL PASS** — 다음 결과 확인:
   - Typecheck: ✅ PASS
   - Unit tests: ✅ 135/135 PASS (coupon 42개 포함)
   - No npm/yarn lockfiles: ✅ PASS
   - Task records: ✅ PASS (prd.md, sdd.md, trace.md 완성)

### 확인한 것

- `pnpm test` 결과: 135 tests passed (11 test files) — coupon.test.ts 42개 테스트 모두 PASS
- Rule-4 (floor): 10,001 × 33% = 3,300.33 → 3,300 확인
- Rule-5 (기준금액): fixed 15,000 on 10,000 item → 10,000 확인
- Rule-6 (maxDiscount): rate 50% (5,000) + maxDiscount 3,000 → 3,000 확인
- Rule-7 (minOrder): minOrder 10,001 > subtotal 10,000 → discount 0, 오류 없음 확인
- Rule-8 (상품 중복): SKU A에 2개 쿠폰 → CouponError 발생 확인
- Rule-9 (주문 중복): 주문 쿠폰 2개 → CouponError 발생 확인
- Rule-10 (순서): 상품 5,000 + 주문 (15,000-5,000)×50% = 10,000 확인
- Rule-12 (배송비): subtotal 60,000 - discount 10,000 = 50,000 → shipping 0 확인
- Empty cart: items.length === 0 → {subtotal: 0, discount: 0, shipping: 0, total: 0} 확인
- Readonly 배열: 함수 호출 후 원본 배열 수정 없음 확인
- Coupon 인터페이스: scope, sku?, type, value, maxDiscount?, minOrder? 정의 확인
- CouponError 클래스: 적절한 곳에서 던져짐 확인
- validateCoupons(): 규칙 1~11 검증 로직 확인
- calculateDiscount(): 정률/정액 + maxDiscount 적용 로직 확인

## 판정 이유

모든 완료 조건을 충족합니다:
- domain.md의 쿠폰 규칙 12개가 명확히 정의되었음
- 규칙별로 테스트 1개 이상(평균 3.5개) 작성되어 정상·경계·에러 케이스 모두 커버
- 함수 시그니처가 설계 문서와 정확히 일치
- 상품→주문 순서, 정률/정액 계산, maxDiscount, minOrder 미충족 처리 모두 올바르게 구현
- readonly 배열과 정수 금액을 준수하여 부작용 없는 순수 함수
- pnpm check 모든 게이트 통과 (typecheck, 135 tests, task records)
