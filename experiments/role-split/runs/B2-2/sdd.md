# 0030 — 쿠폰 적용 — SDD

- **접근:**
  1. `src/pricing/coupon.ts`에서 쿠폰 인터페이스와 가격 계산 함수를 구현하며, 두 가지 쿠폰 종류(상품, 주문)와 두 가지 할인 방식(정률, 정액)을 지원
  2. 개별 쿠폰과 전체 쿠폰 리스트 검증을 분리해 테스트 가능성과 유지보수성 향상
  3. 상품 할인 / 주문 할인 / 합계 계산을 각각의 함수로 분리
  4. 할인 금액 계산 후 `priceCart`에 discount 옵션으로 전달

- **대안·트레이드오프:**
  1. 단일 통합 함수 vs 함수 분리: 배제 (테스트 어려움, 로직 재사용 불가)
  2. minOrder 판단 기준은 subtotal 전체로 통일: 상품별로 다른 기준은 복잡도 증가
  3. 주문 쿠폰 여러 장 허용: 배제 (규칙 8에서 "1장"으로 명시, 순서 불명확)

- **검증 계획:**
  1. 단위 테스트: validateCoupon (9가지 에러), calculateItemDiscount, calculateOrderDiscount, applyItemCoupons
  2. 통합 테스트: 상품/주문 쿠폰 단독 및 조합, minOrder 만족/미달, 중복 에러 메시지
  3. 엣지 케이스: 정률 소수점(floor), minOrder 미달, 배송비(50,000원 정확히), 빈 배열

## 인터페이스 정의

```ts
export interface Coupon {
  scope: "item" | "order";
  sku?: string;
  type: "rate" | "fixed";
  value: number;
  maxDiscount?: Won;
  minOrder?: Won;
}

export class CouponError extends Error {}

export function priceWithCoupons(
  items: readonly LineItem[],
  coupons: readonly Coupon[],
  shippingPolicy?: ShippingPolicy,
): PriceBreakdown;
```

## 핵심 알고리즘

### 1. 입력 검증

```
1. items 또는 coupons 중 하나라도 빈 배열이면, shippingPolicy 기본값 사용하고 금액 0 반환
2. 각 coupon을 검증:
   - scope가 "item"일 때 sku 필수 → 없으면 CouponError
   - scope가 "item"일 때 sku가 items에 없으면 CouponError
   - type="rate"면 value는 1~100의 정수 → 아니면 CouponError
   - type="fixed"면 value는 1 이상의 정수 → 아니면 CouponError
   - maxDiscount, minOrder는 0 이상의 정수 또는 undefined → 정수 아니면 CouponError
3. 중복 검증:
   - 상품 쿠폰: 같은 sku로 여러 쿠폰 있으면 CouponError
   - 주문 쿠폰: scope="order"인 쿠폰이 2개 이상이면 CouponError
```

### 2. 할인 계산

상품 합계: `subtotal = Σ(unitPrice × quantity)`

정률 할인:
```
할인 금액 = floor(기준 금액 × value / 100)
```

정액 할인:
```
할인 금액 = min(value, 기준 금액)
```

maxDiscount 적용:
```
if (maxDiscount !== undefined) {
  할인 금액 = min(할인 금액, maxDiscount)
}
```

minOrder 조건:
```
if (minOrder !== undefined && subtotal < minOrder) {
  이 쿠폰 무시 (할인 0원)
}
```

### 3. 적용 순서

1. **상품 쿠폰 계산** (scope="item")
   - 각 상품별로, 해당 상품의 쿠폰이 있으면 적용
   - 기준 금액: `unitPrice × quantity` (줄 금액)
   - 할인 계산: 위의 정액/정률 규칙 적용
   - minOrder 체크: subtotal(전체) < minOrder이면 무시
   - 결과: `itemDiscounts = Map<sku, discount금액>`

2. **상품 쿠폰 할인 합계**
   ```
   itemDiscountTotal = Σ(itemDiscounts 값들)
   ```

3. **주문 쿠폰 계산** (scope="order")
   - 기준 금액: `subtotal - itemDiscountTotal`
   - minOrder 체크: 기준 금액 < minOrder이면 무시
   - 할인 계산: 위의 정액/정률 규칙 적용
   - 결과: `orderDiscount = discount금액 또는 0`

4. **최종 할인**
   ```
   totalDiscount = itemDiscountTotal + orderDiscount
   ```

### 4. 배송비 및 결제금액

```
discountedSubtotal = subtotal - totalDiscount
shipping = (discountedSubtotal >= shippingPolicy.freeThreshold) ? 0 : shippingPolicy.fee
total = discountedSubtotal + shipping
```

기본 shippingPolicy: `{ fee: 3_000, freeThreshold: 50_000 }`

## 에러 케이스 (CouponError)

| 조건 | 메시지 |
| --- | --- |
| scope="item"일 때 sku 없음 | 상품 쿠폰은 sku 필수 |
| 장바구니에 없는 SKU의 상품 쿠폰 | 장바구니에 없는 상품입니다 |
| 정률 value 범위 (1~100 정수) | 정률 쿠폰의 할인율은 1~100의 정수 |
| 정액 value 범위 (1 이상 정수) | 정액 쿠폰의 할인 금액은 1 이상의 정수 |
| maxDiscount, minOrder 범위 (0 이상 정수) | 0 이상의 정수여야 합니다 |
| 같은 SKU 상품 쿠폰 중복 | 상품에 여러 쿠폰을 적용할 수 없습니다 |
| 주문 쿠폰 중복 | 주문 쿠폰은 1장까지만 사용 가능합니다 |

## 구현 전략

1. **검증 함수** 분리
   - `validateCoupon(coupon, itemSkus): void` — 개별 쿠폰 검증
   - `validateCoupons(coupons, itemSkus): void` — 전체 중복 검증

2. **계산 함수** 분리
   - `calculateDiscount(coupon, baseAmount, subtotal): Won` — 할인액 계산
   - `applyItemCoupons(items, coupons, subtotal): Won` — 상품 쿠폰 적용
   - `applyOrderCoupon(coupon, baseAmount): Won` — 주문 쿠폰 적용

3. **메인 함수**
   ```ts
   export function priceWithCoupons(
     items: readonly LineItem[],
     coupons: readonly Coupon[],
     shippingPolicy?: ShippingPolicy,
   ): PriceBreakdown {
     // 빈 장바구니 체크
     // 기본 shippingPolicy 설정
     // subtotal 계산
     // 검증
     // 상품 쿠폰 적용
     // 주문 쿠폰 적용
     // priceCart() 호출
   }
   ```
