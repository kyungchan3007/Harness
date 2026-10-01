# 0030 — 쿠폰 할인 기능 — SDD

요구사항: [prd.md](prd.md)

## 설계

- **읽은 문서:** AGENTS.md, harness/loop.md, context/architecture.md, domain.md (0002 배송비 규칙), price-cart.ts
- **접근:**
  - `src/pricing/`: `priceWithCoupons(items, coupons, shippingPolicy)` 순수 함수 추가 (기존 `priceCart`와 별도)
  - 쿠폰 인터페이스(`Coupon`) 및 `CouponError` 별도 모듈로 정의
  - 금액은 `Won` 타입 (0-based 정수)으로 통일
  - 입력(items, coupons) 변경하지 않음 (불변성)
  - 처리 순서: 유효성 검사 → 중복 검사 → 상품쿠폰 → 주문쿠폰 → 배송비 계산
- **대안·트레이드오프:**
  - **쿠폰을 priceCart 안에 통합 vs 분리**: 통합은 호출 단순하나 로직 복잡, 분리하면 격리·테스트 용이 → 분리 선택
  - **정률 쿠폰 반올림**: 올림(고객 불리), 버림(판매자 불리/관례), 반올림(경계 이슈) → 버림 선택 (Math.floor)
  - **중복 검사 시점**: 개별 처리 중 vs 입력 검증 단계 → 입력 검증 선택 (명확함, 실패 시 명확)
  - **minOrder 미달 시**: 에러 발생 vs 미적용 반환 → 미적용 반환 선택 (사용자 경험)
  - **배송비 기준 (할인 전 vs 후)**: 할인 전이면 무료배송 악용 가능 → 할인 후 기준 (0002와 동일)
- **파일 계획:**
  - `src/pricing/coupon.ts`: Coupon, CouponError, 상수
  - `src/pricing/price-with-coupons.ts`: priceWithCoupons 함수
  - `src/pricing/price-with-coupons.test.ts`: 테스트
  - `agents/context/domain.md`: 쿠폰 규칙 12개 추가
- **위험:**
  - 할인액 합계가 상품 합계 초과 → 입력 검증에서 거부
  - 빈 장바구니인데 쿠폰 제시 → 모두 미적용 (정상)
  - 부동소수점 오차 (정률 계산) → Won(정수) 사용으로 방지, Math.floor 사용
- **검증 계획:** 규칙별 단위 테스트(12개 규칙 + 9개 에러), 통합 테스트(복합 시나리오), 엣지 케이스, 불변성, `pnpm check`

## 알고리즘 상세

### 고수준 설계 (High-Level Design)

#### 입력
```
items: readonly LineItem[]           // 장바구니 상품 목록
coupons: readonly Coupon[]           // 적용할 쿠폰 목록
shippingPolicy?: ShippingPolicy      // 배송비 정책 (기본값: DEFAULT_SHIPPING_POLICY)
```

#### 처리 단계
1. **유효성 검사**: 모든 쿠폰의 type, scope, value, maxDiscount, minOrder 검증
2. **중복 검사**: 
   - 같은 sku에 상품쿠폰 2장 이상 → 에러
   - 주문쿠폰 2장 이상 → 에러
   - 같은 id 중복 → 에러
3. **상품쿠폰 적용**: 각 상품별로 scope=PRODUCT 쿠폰 1장씩 적용
4. **주문쿠폰 적용**: scope=ORDER 쿠폰 1장 적용
5. **배송비 계산**: 할인 후 상품합계 기준으로 배송비 결정

#### 출력
```
PriceBreakdown: {
  subtotal: Won,   // 상품 합계 (쿠폰 적용 전)
  discount: Won,   // 모든 쿠폰 할인액 합계
  shipping: Won,   // 배송비
  total: Won       // subtotal - discount + shipping
}
```

### 알고리즘 단계별 상세

#### 단계 1: 쿠폰 유효성 검증
각 쿠폰마다:
- **E1 검사**: type이 "PERCENTAGE" 또는 "FIXED"인가? → 아니면 CouponError
- **E2 검사**: scope가 "PRODUCT" 또는 "ORDER"인가? → 아니면 CouponError
- **E3 검사**: 
  - value ≥ 0인가?
  - type="PERCENTAGE"이면 0 ≤ value ≤ 100인가?
  - → 위반하면 CouponError
- **E4 검사**: maxDiscount ≥ 0인가? → 아니면 CouponError
- **E5 검사**: minOrder ≥ 0인가? → 아니면 CouponError
- **E6 검사**: scope="PRODUCT"이면 sku가 null이 아닌가? → 아니면 CouponError
- **E7 검사**: scope="ORDER"이면 sku가 null인가? (ORDER는 sku 없어야 함) → 아니면 CouponError

#### 단계 2: 중복 및 범위 검사
- **E8 검사**: 같은 sku를 대상으로 하는 상품쿠폰이 2장 이상인가? → CouponError
- **E9 검사**: 주문쿠폰이 2장 이상인가? → CouponError
- **E10 검사**: 같은 id가 여러 번 나타나는가? → CouponError

#### 단계 3: 상품쿠폰 적용
```
productCouponDiscount = Map<sku, Won>  // sku별 할인액

for each coupon where scope="PRODUCT":
  sku = coupon.sku
  lineItem = items.find(item => item.sku === sku)
  
  if lineItem is null:  // 쿠폰 대상 상품이 없음
    // 미적용 (에러 아님)
    continue
  
  basePriceForSku = lineItem.unitPrice * lineItem.quantity
  
  // minOrder 검사 (규칙 10)
  if basePriceForSku < coupon.minOrder:
    // 미적용
    continue
  
  // 할인액 계산
  if coupon.type === "PERCENTAGE":
    // 규칙 1: 원 미만 버림
    discount = Math.floor(basePriceForSku * coupon.value / 100)
  else:  // FIXED
    // 규칙 2: maxDiscount 제한
    discount = Math.min(coupon.value, coupon.maxDiscount)
  
  // 규칙 12: 할인액이 기준액을 초과하지 않음
  if discount > basePriceForSku:
    throw new CouponError("할인액이 기준액을 초과할 수 없습니다")
  
  productCouponDiscount[sku] = discount

totalProductCouponDiscount = sum(productCouponDiscount.values())
```

#### 단계 4: 주문쿠폰 적용
```
// 규칙 4: 주문쿠폰의 기준액 = subtotal - totalProductCouponDiscount
baseForOrderCoupon = subtotal - totalProductCouponDiscount

orderCouponDiscount = 0

for each coupon where scope="ORDER":
  // minOrder 검사 (규칙 10)
  if baseForOrderCoupon < coupon.minOrder:
    // 미적용
    continue
  
  // 할인액 계산
  if coupon.type === "PERCENTAGE":
    // 규칙 1: 원 미만 버림
    discount = Math.floor(baseForOrderCoupon * coupon.value / 100)
  else:  // FIXED
    // 규칙 2: maxDiscount 제한
    discount = Math.min(coupon.value, coupon.maxDiscount)
  
  // 규칙 12: 할인액이 기준액을 초과하지 않음
  if discount > baseForOrderCoupon:
    throw new CouponError("할인액이 기준액을 초과할 수 없습니다")
  
  // 규칙 6: 주문쿠폰은 1장만 (E9에서 이미 검사됨, 여기서는 첫 번째만 적용)
  orderCouponDiscount = discount
  break  // 한 장만 적용

totalDiscount = totalProductCouponDiscount + orderCouponDiscount
```

#### 단계 5: 배송비 및 최종 금액 계산
```
// 0002 규칙: 할인 후 상품합계 기준
discountedSubtotal = subtotal - totalDiscount
shipping = (discountedSubtotal >= shippingPolicy.freeThreshold) ? 0 : shippingPolicy.fee

return {
  subtotal: subtotal,
  discount: totalDiscount,
  shipping: shipping,
  total: discountedSubtotal + shipping
}
```

### 에러 조건 (CouponError)

| 코드 | 조건 | 메시지 |
| --- | --- | --- |
| E1 | type ∉ {PERCENTAGE, FIXED} | "쿠폰 타입이 유효하지 않습니다" |
| E2 | scope ∉ {PRODUCT, ORDER} | "쿠폰 범위가 유효하지 않습니다" |
| E3 | value < 0 or (type=PERCENTAGE and value > 100) | "쿠폰 할인값이 유효하지 않습니다" |
| E4 | maxDiscount < 0 | "최대 할인액이 음수일 수 없습니다" |
| E5 | minOrder < 0 | "최소 주문액이 음수일 수 없습니다" |
| E6 | scope=PRODUCT and sku is null | "상품쿠폰은 sku가 필수입니다" |
| E7 | scope=ORDER and sku is not null | "주문쿠폰은 sku를 가질 수 없습니다" |
| E8 | 같은 sku에 상품쿠폰 2장 이상 | "같은 상품에 상품쿠폰은 1장만 사용 가능합니다" |
| E9 | 주문쿠폰 2장 이상 | "주문쿠폰은 1장만 사용 가능합니다" |
| E10 | 같은 coupon.id 중복 | "같은 쿠폰을 중복으로 사용할 수 없습니다" |
| E11 | discount > basePriceForSku (상품) or baseForOrderCoupon (주문) | "할인액이 기준액을 초과할 수 없습니다" |

## 검증 계획

### 전략
- 규칙별 단위 테스트 (prd의 12개 규칙 + 11개 에러 조건)
- 통합 테스트 (상품 여러 개 + 상품·주문 쿠폰 조합)
- 엣지 케이스 (빈 장바구니, 미존재 상품, 중복 쿠폰, 경계값, 정확한 금액)
- 불변성 검증 (입력 items, coupons 변경 없음)
- `pnpm check` 게이트 (typecheck, 모든 테스트, spec Acceptance)

### 단위 테스트 (Unit Tests)

#### 정률 쿠폰 (규칙 1)
- `test_percentage_coupon_basic`: 10,000원 × 10% = 1,000원
- `test_percentage_coupon_floor`: 9,999원 × 10% = 999원 (버림)

#### 정액 쿠폰 (규칙 2)
- `test_fixed_coupon_basic`: 5,000원 할인
- `test_fixed_coupon_with_max_discount`: 5,000원이지만 maxDiscount=3,000이면 3,000원

#### 상품 쿠폰 기준액 (규칙 3)
- `test_product_coupon_base_calculation`: unitPrice × quantity 맞는지 확인

#### 주문 쿠폰 기준액 (규칙 4)
- `test_order_coupon_base_calculation`: subtotal - 상품쿠폰할인액 맞는지 확인

#### 적용 순서 (규칙 5, 6)
- `test_product_before_order_coupon`: 상품쿠폰 먼저, 주문쿠폰 나중 순서 확인

#### 중복 제한 (규칙 7, 8, 9)
- `test_product_coupon_duplicate_sku`: 같은 sku에 상품쿠폰 2장, E8 에러
- `test_order_coupon_duplicate`: 주문쿠폰 2장, E9 에러
- `test_coupon_duplicate_id`: 같은 id 2번, E10 에러

#### minOrder 조건 (규칙 10)
- `test_min_order_met_product`: 상품 쿠폰의 minOrder 충족, 적용됨
- `test_min_order_not_met_product`: 상품 쿠폰의 minOrder 미충족, 미적용 (에러 아님)
- `test_min_order_met_order`: 주문 쿠폰의 minOrder 충족, 적용됨
- `test_min_order_not_met_order`: 주문 쿠폰의 minOrder 미충족, 미적용 (에러 아님)

#### value 유효성 (규칙 11)
- `test_percentage_value_range`: value ≥ 0, value ≤ 100
- `test_fixed_value_range`: value ≥ 0

#### 할인액 상한 (규칙 12)
- `test_discount_exceeds_base_product`: 상품쿠폰 할인액 > 기준액, E11 에러
- `test_discount_exceeds_base_order`: 주문쿠폰 할인액 > 기준액, E11 에러

#### 유효성 검사 (E1~E7)
- `test_invalid_type`: E1 에러
- `test_invalid_scope`: E2 에러
- `test_invalid_value`: E3 에러
- `test_invalid_max_discount`: E4 에러
- `test_invalid_min_order`: E5 에러
- `test_missing_sku_product`: E6 에러
- `test_sku_provided_order`: E7 에러

### 통합 테스트 (Integration Tests)
- `test_complex_scenario`: 상품 3개 + 상품쿠폰 2개 + 주문쿠폰 1개
- `test_with_shipping_fee`: 배송비가 할인 후 상품합계 기준 (0002 규칙 유지)
- `test_with_free_shipping`: 할인 후 50,000 이상이면 무료배송

### 엣지 케이스 (Edge Cases)
- `test_empty_cart_with_coupons`: 빈 장바구니 + 쿠폰 → 모두 미적용, 할인액 0
- `test_coupon_for_nonexistent_sku`: 쿠폰 대상 상품 없음 → 미적용
- `test_min_order_exact_boundary`: minOrder와 정확히 같은 금액
- `test_zero_coupon_value`: value=0 (유효, 할인 없음)
- `test_multiple_products_one_coupon`: 상품 3개 중 2개에만 쿠폰 적용

### 불변성 검증
- `test_items_not_mutated`: priceWithCoupons 호출 전후 items 변경 없음
- `test_coupons_not_mutated`: priceWithCoupons 호출 전후 coupons 변경 없음
- `test_pure_function_deterministic`: 같은 입력으로 여러 번 호출해도 동일한 결과

### Gate Verification
- `pnpm check` ALL PASS (typecheck, 테스트, lockfile, spec Acceptance)
- PriceBreakdown 값이 domain.md 규칙과 일치하는지 테스트로 확인
