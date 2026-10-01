# 0030 — 판정서

## 1차 · 2026-10-01

판정: approved

### 근거

모든 완료 조건 충족:
1. ✅ **인터페이스 구현:** `src/pricing/coupon.ts`에서 Coupon, CouponError, priceWithCoupons 요구사항 정확히 구현
2. ✅ **규칙 준수:** 12개 규칙(R.1~R.12) 모두 코드에 반영되고 테스트로 검증됨
3. ✅ **오류 처리:** CouponError 발생 케이스 9개(중복, 검증 오류 등) 정확히 구현
4. ✅ **입력 불변성:** items, coupons을 readonly로 처리하여 수정 방지
5. ✅ **게이트 통과:** `pnpm check` ALL PASS (146/146 테스트, typecheck OK)

### 확인한 것

**실행 테스트:**
- 전체 146개 테스트 통과 (모든 규칙별 테스트 포함)
- Typecheck: 타입 안정성 검증 완료
- Task records: prd·sdd·trace·TASKS 기록 완전성 확인

**규칙별 경계값 검증:**

**R.1 (정률 쿠폰):** floor 동작 확인
- 기본: `floor(10,000 × 10 / 100) = 1,000` ✓ (test line 9-20)
- 소수점: `floor(333 × 10 / 100) = 33` ✓ (test line 22-33)
- 100% 할인: `floor(10,000 × 100 / 100) = 10,000` ✓ (test line 35-46)

**R.2 (정액 쿠폰):** min(value, baseAmount) 적용 확인
- 정상: `min(2,000, 10,000) = 2,000` ✓ (test line 50-61)
- 기준금액 초과: `min(15,000, 10,000) = 10,000` ✓ (test line 63-74)

**R.3 (maxDiscount):** 상한 적용 확인
- Rate 쿠폰: `min(50,000, 30,000) = 30,000` ✓ (test line 78-89)
- Fixed 쿠폰: `min(50,000, 30,000) = 30,000` ✓ (test line 91-102)

**R.4 (minOrder):** 조건 검사 및 경계값
- 미충족: subtotal 10,000 < minOrder 50,000 → 할인 0원 ✓ (test line 106-117)
- 충족: subtotal 60,000 ≥ minOrder 50,000 → 할인 적용 ✓ (test line 119-130)
- 정확히 만족: subtotal 50,000 == minOrder 50,000 → 할인 적용 ✓ (test line 132-143)

**R.5 (상품쿠폰 기준금액):** 줄 단위 계산 확인
- 라인 금액: 10,000 × 2 = 20,000 기준 → floor(20,000 × 10 / 100) = 2,000 ✓ (test line 147-158)
- 1회 적용: 1,000 × 5개 = 5,000 기준, 2,000 정액 적용 (개당 아님) → 2,000 ✓ (test line 160-171)

**R.6 (주문쿠폰 기준금액):** 상품쿠폰 할인 반영 확인
- 기준금액 = subtotal - itemDiscountSum = 35,000 - 2,000 = 33,000
- 주문쿠폰 할인: min(5,000, 33,000) = 5,000 ✓ (test line 175-191)

**R.7 (적용 순서):** 목록 순서 무관, 상품→주문 고정
- 목록: [order, item], 계산 순서: item 먼저, 그 후 order ✓ (test line 195-210)
- 코드 구현: itemCoupons 필터(line 131) → orderCoupons 필터(line 132) → 각각 순차 적용 ✓

**R.8 (중복 제한):**
- 같은 sku 상품쿠폰 2장: CouponError ✓ (test line 214-224)
- 주문쿠폰 2장: CouponError ✓ (test line 226-236)
- 없는 상품 쿠폰: CouponError ✓ (test line 238-247)
- 서로 다른 sku 상품쿠폰: 허용 ✓ (test line 249-264)

**R.9 (입력 검증):**
- Rate value < 1: CouponError ✓ (test line 268-277)
- Rate value > 100: CouponError ✓ (test line 279-288)
- Rate non-integer: CouponError ✓ (test line 290-299)
- Fixed value < 1: CouponError ✓ (test line 301-310)
- Fixed non-integer: CouponError ✓ (test line 312-321)
- maxDiscount < 0: CouponError ✓ (test line 323-332)
- minOrder < 0: CouponError ✓ (test line 334-343)
- Item scope without sku: CouponError ✓ (test line 345-354)

**R.10 (결과 조립):**
- Discount 합계: itemDiscount + orderDiscount ✓ (test line 358-371)
- 배송비 계산 기준: 할인 후 금액(subtotal - discount) ✓ (test line 373-385)
- 배송비 50,000원 이상 무료: 70,000 - 30,000 = 40,000? 아니, 100,000 - 30,000 = 70,000 >= 50,000 → 0원 ✓ (test line 387-399)
- Total 계산: subtotal - discount + shipping ✓ (test line 401-418)

**R.11 (빈 장바구니):**
- 모든 금액 0: { subtotal: 0, discount: 0, shipping: 0, total: 0 } ✓ (test line 422-431)
- 쿠폰 검증 스킵: 유효하지 않은 쿠폰도 오류 없음 ✓ (test line 433-443)

**R.12 (입력 불변성):**
- Items 수정 안 됨 ✓ (test line 447-459)
- Coupons 수정 안 됨 ✓ (test line 461-473)

**SDD 예제 검증:**
- 예제 1 (상품+주문 쿠폰): subtotal 35,000 → discount 7,000 → shipping 3,000 → total 31,000 ✓ (test line 543-560)
- 예제 2 (maxDiscount 상한): subtotal 100,000 → discount 30,000 → shipping 0 → total 70,000 ✓ (test line 562-576)
- 예제 3 (minOrder 미충족): subtotal 20,000 → discount 0 → shipping 3,000 → total 23,000 ✓ (test line 578-592)

**배송비 규칙 협력 (domain.md):**
- 기본 배송비 3,000원 ✓ (DEFAULT_SHIPPING_POLICY 사용)
- 할인 후 금액 >= 50,000원 무료 ✓ (priceCart에서 계산)
- 계산 기준: subtotal - discount ✓ (coupon.ts line 177에서 totalDiscount 전달)

### 원문 대조

| 원문 규칙 | 구현 | 테스트 |
|---------|------|--------|
| 규칙 1: 정률 = floor(기준 × value/100) | coupon.ts:64 `Math.floor((baseAmount * coupon.value) / 100)` | line 9-46 (기본, 소수점, 100%) |
| 규칙 2: 정액 = min(value, 기준) | coupon.ts:66 `Math.min(coupon.value, baseAmount)` | line 50-74 (정상, 초과) |
| 규칙 3: maxDiscount 상한 | coupon.ts:70 `Math.min(discount, coupon.maxDiscount)` | line 78-102 (rate, fixed) |
| 규칙 4: minOrder 미충족 시 할인 0 | coupon.ts:148, 165 (조건 검사 후 skip) | line 106-143 (미충족, 충족, 경계) |
| 규칙 5: 상품쿠폰 기준금액 = 줄 단위 | coupon.ts:145 `item.unitPrice * item.quantity` | line 147-171 (라인, 개당 아님) |
| 규칙 6: 주문쿠폰 기준금액 = subtotal - 상품할인 | coupon.ts:162 `subtotal - itemDiscountSum` | line 175-191 |
| 규칙 7: 순서 = 상품 → 주문 | coupon.ts:131-132 (필터 분리) + 138-171 (순차 적용) | line 195-210 (목록 순서 무관) |
| 규칙 8: 중복 제한 (상품당 1, 주문 1) | coupon.ts:106-128 (itemCouponMap, orderCouponCount) | line 214-264 (중복, 없는 상품) |
| 규칙 9: 입력 검증 | coupon.ts:19-55 (validateCoupon 함수) | line 268-354 (모든 검증) |
| 규칙 10: discount 합계 + 배송비 기준 | coupon.ts:174 (합계) + 177 (priceCart 위임) | line 358-418 (배송비, total) |
| 규칙 11: 빈 장바구니 = 0 | coupon.ts:87-89 (early return) | line 422-443 (검증 스킵) |
| 규칙 12: 입력 불변 | 함수 시그니처: readonly 인자 (line 80-81) | line 447-473 |

**타입·인터페이스 정확성:**
- Coupon 인터페이스: scope(item\|order), sku?(string), type(rate\|fixed), value(number), maxDiscount?(Won), minOrder?(Won) ✓ (request.md와 정확히 일치)
- CouponError: Error 상속 ✓
- priceWithCoupons: (items: readonly LineItem[], coupons: readonly Coupon[], shippingPolicy?: ShippingPolicy) → PriceBreakdown ✓
- DEFAULT_SHIPPING_POLICY 사용 (shippingPolicy 없을 때) ✓

**원문 문장별 대조:**
- "원 미만은 버립니다" → Math.floor ✓
- "기준 금액보다 클 수 없습니다" → Math.min(value, baseAmount) ✓
- "오류가 아니라 그 쿠폰만 적용하지 않습니다(할인 0원)" → continue 후 할인 0 ✓
- "줄 금액에 한 번" → unitPrice × quantity (한 번만) ✓
- "적용 순서는 목록 순서와 상관없이 상품 쿠폰을 모두 적용한 뒤 주문 쿠폰" → 필터 분리 + 순차 적용 ✓
- "상품(sku)당 1장, 주문 쿠폰은 1장" → itemCouponMap, orderCouponCount ✓
- "넘겨받은 items·coupons를 바꾸지 않습니다" → readonly 인자 ✓

**종합 평가:**
- 모든 12개 규칙 정확히 구현 ✅
- 모든 규칙에 대한 단위 테스트 존재 ✅
- SDD 예제 5개 포함 검증 ✅
- 복합 시나리오 테스트 ✅
- 배송비 규칙과의 협력 정확 ✅
- 타입 안전성 확보 ✅
- 입력 불변성 유지 ✅

