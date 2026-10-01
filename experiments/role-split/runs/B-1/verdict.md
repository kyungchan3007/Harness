# 0030 — 쿠폰 적용 — 판정서

> 검사자(verifier)만 쓴다. 회차를 **아래로 쌓고** 이전 회차는 지우지 않는다. 반려는 최대 2회 — 3회째 반려면 막힘(사람이 판단).

## 1차 · 2026-10-01

판정: approved

### 근거

모든 12가지 도메인 규칙과 완료 조건을 만족함.

### 확인한 것

#### 1. 게이트 검증
- ✅ `pnpm check` ALL PASS
  - Typecheck: 0 error
  - Unit tests: 40 passed (133 total in full suite)
  - No lockfiles: PASS
  - Task records: PASS

#### 2. 인터페이스·타입 검증
- ✅ `Coupon` 인터페이스 정확: `scope`, `sku?`, `type`, `value`, `maxDiscount`, `minOrder`
- ✅ `CouponError` 클래스 정의 (name: "CouponError")
- ✅ `priceWithCoupons()` 함수 시그니처 정확
  - 파라미터: `items: readonly LineItem[]`, `coupons: readonly Coupon[] = []`, `shippingPolicy?: ShippingPolicy`
  - 반환: `PriceBreakdown`

#### 3. 규칙별 구현 검증 (domain.md 12가지)

**규칙 1-2: 쿠폰 타입·Scope**
- ✅ `type: "percentage" | "fixed"` 구현 (라인 81-85에서 두 가지 처리)
- ✅ `scope: "sku" | "order"` 구현 (라인 59, 100에서 필터링)

**규칙 3-4: Scope별 적용 조건**
- ✅ SKU 쿠폰: `coupon.sku !== item.sku` 체크로 지정 SKU만 적용 (라인 70)
- ✅ ORDER 쿠폰: 모든 상품 합계 기준, `sku` 필드 무시

**규칙 5-6: 할인액 계산**
- ✅ 정률: `Math.floor(currentAmount * coupon.value / 100)` 정확히 구현 (라인 82)
- ✅ 정액: `Math.min(coupon.value, currentAmount)` 대상금액 초과 불가 (라인 84)

**규칙 7: 할인 상한**
- ✅ `Math.min(discount, coupon.maxDiscount)` 모든 쿠폰에 적용 (라인 88, 121)

**규칙 8: 최소 주문 금액**
- ✅ `subtotal < coupon.minOrder` 체크로 미충족 시 미적용 (라인 64, 108)
- ✅ 에러 발생 안 함 (조용히 skip)

**규칙 9: 적용 순서·중첩 할인**
- ✅ SKU 쿠폰 먼저 (라인 59-94) → ORDER 쿠폰 (라인 100-126)
- ✅ SKU: 직전 단계 할인 후 금액 기준
  - `currentAmount = itemTotal - alreadyDiscounted` (라인 77)
  - `alreadyDiscounted` = 같은 SKU에 이미 적용된 누적 할인
- ✅ ORDER: SKU 할인 후 금액 기준
  - `currentSubtotal = subtotal - totalSkuDiscount` (라인 104)
  - 각 ORDER 쿠폰은 이전 쿠폰의 할인 후 금액 기준 (라인 125)

**규칙 10: 중복 적용**
- ✅ `Map<sku, totalDiscount>`로 SKU별 누적 할인 추적
- ✅ `newTotal = alreadyDiscounted + discount` (라인 91)로 할인 누적

**규칙 11: 입력 검증**
- ✅ `validateCoupons()` 함수로 모든 필드 검증 (라인 141-178)
- ✅ CouponError 발생:
  - type 검증 (라인 150-152)
  - scope 검증 (라인 155-157)
  - value 검증 (라인 160-166): 음수, percentage > 100
  - maxDiscount 검증 (라인 169-171): 음수
  - minOrder 검증 (라인 174-176): 음수

**규칙 12: 배송비 계산**
- ✅ `priceCart(items, { discount: totalDiscount, shippingPolicy })` 호출 (라인 132)
- ✅ `totalDiscount = totalSkuDiscount + totalOrderDiscount` (라인 129)

#### 4. 테스트 범위 검증
- ✅ 입력 검증 (7개): type, scope, value, maxDiscount, minOrder 모두 테스트
- ✅ 정률 할인 (4개): 기본, 0%, 100%, floor 확인 ("1500원 33% → 495원")
- ✅ 정액 할인 (3개): 기본, 상한, 0원
- ✅ 할인 상한 (3개): 정률+maxDiscount, 정액+maxDiscount
- ✅ 최소 주문 금액 (3개): 경계값 (29,999 < 30,000, 30,000 >= 30,000)
- ✅ SKU 쿠폰 (2개): 지정 SKU 적용, 없는 SKU 무시
- ✅ ORDER 쿠폰 (2개): 전체 합계 기준, sku 필드 무시
- ✅ 적용 순서 (3개): SKU 배열 순서, SKU → ORDER, 중첩 할인 (500 + 250 = 750)
- ✅ 중복 적용 (2개): 누적 할인 검증
- ✅ 배송비 연동 (6개): 할인 전후 배송료 변화 (45,000 vs 51,000), 무료배송 경계
- ✅ 종합 시나리오 (1개): 복수 상품 + 복수 SKU 쿠폰 + 복수 ORDER 쿠폰
- ✅ Edge cases (4개): 빈 장바구니, 빈 쿠폰, 같은 SKU 다량, 입력 배열 수정 안 함

#### 5. 코드 품질
- ✅ 입력 배열 수정 안 함: `readonly` 사용 (라인 44-45)
- ✅ 예외 처리: `CouponError` 정의 및 적절한 시점에 발생
- ✅ 타입 안전성: TypeScript 정확한 타입 지정, Won 타입 사용

#### 6. 비기능 요구사항
- ✅ domain.md에 규칙 1-12번 추가됨
- ✅ src/pricing/coupon.ts 구현됨
- ✅ src/pricing/coupon.test.ts 테스트 작성됨
- ✅ 모든 테스트 통과

**최종 결론:** 구현이 PRD의 모든 완료 조건과 domain.md의 12가지 규칙을 완벽하게 만족한다.
