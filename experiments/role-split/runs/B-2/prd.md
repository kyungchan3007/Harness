# 0030 — 쿠폰 할인 기능 — PRD

- **이슈:** #1

## 개요
기존 장바구니·배송비 기능(0002)을 기반으로 쿠폰 할인 로직을 추가합니다. 고객이 장바구니에 여러 쿠폰을 적용하여 최종 결제 금액을 계산할 수 있어야 합니다.

## 사용자 스토리
> 고객이 장바구니에 여러 쿠폰(상품쿠폰·주문쿠폰)을 적용하여 최종 가격을 계산한다.

- 상품쿠폰: 특정 상품에만 적용되는 할인
- 주문쿠폰: 전체 주문(상품쿠폰 적용 후)에 적용되는 할인

## 요구사항

### 1. Coupon 인터페이스 정의
쿠폰은 다음 필드를 가집니다:
- `id` (string): 쿠폰 고유 식별자
- `scope` ("PRODUCT" | "ORDER"): 적용 범위
- `sku` (string | null): scope=PRODUCT일 때만 필수
- `type` ("PERCENTAGE" | "FIXED"): 정률/정액 할인
- `value` (Won): 할인률(%) 또는 할인액(원)
- `maxDiscount` (Won): 최대 할인액
- `minOrder` (Won): 최소 주문액 (미달 시 미적용)

### 2. priceWithCoupons 함수 구현
함수 서명: `priceWithCoupons(items: readonly LineItem[], coupons: readonly Coupon[], shippingPolicy?: ShippingPolicy): PriceBreakdown`

입력:
- `items`: 장바구니 상품 목록
- `coupons`: 적용할 쿠폰 목록
- `shippingPolicy` (선택): 배송비 정책 (기본값: DEFAULT_SHIPPING_POLICY)

출력:
- `PriceBreakdown`: { subtotal, discount, shipping, total }
  - `discount`: 모든 쿠폰으로부터의 총 할인액

### 3. 할인 계산 규칙 (12개)

#### 정률/정액 할인
1. **정률 쿠폰**: 기준액에 할인률을 곱하고 원 미만 버림 (내림)
   - 예: 10,000원 × 10% = 1,000원, 9,999원 × 10% = 999원
2. **정액 쿠폰**: 기준액에서 `value`만큼 빼되, `maxDiscount` 이상 할인하지 않음

#### 적용 범위
3. **상품 쿠폰**: 해당 상품의 `unitPrice × quantity`를 기준으로 계산
4. **주문 쿠폰**: `subtotal − (모든 상품쿠폰 할인액 합)`을 기준으로 계산

#### 적용 순서
5. **상품쿠폰 먼저**: 모든 상품쿠폰을 먼저 적용
6. **주문쿠폰 나중**: 상품쿠폰 완료 후 주문쿠폰 1장 적용

#### 중복 제한
7. **상품당 1장의 상품쿠폰**: 같은 `sku`에 대해 상품쿠폰 여러 장 제시 시 에러
8. **주문당 1장의 주문쿠폰**: scope=ORDER 쿠폰 여러 장 제시 시 에러
9. **같은 쿠폰 중복 금지**: 동일 `id`를 여러 번 제시 시 에러

#### minOrder 조건
10. **최소 주문액 검사**: 기준액이 `minOrder` 미만이면 이 쿠폰은 미적용 (에러 아님)
    - 상품쿠폰: 해당 상품 가격이 기준
    - 주문쿠폰: 현재 상품합계 − 상품쿠폰할인액이 기준

#### 값 검증
11. **value 유효성**: `value ≥ 0`, 정률일 때 `0 ≤ value ≤ 100`
12. **할인액 상한**: 최종 할인액이 기준액을 초과하지 않음 (초과 시 에러)

### 4. CouponError 예외 처리
9가지 에러 조건:
- E1: type 유효하지 않음 (PERCENTAGE|FIXED 아님)
- E2: scope 유효하지 않음 (PRODUCT|ORDER 아님)
- E3: value 범위 벗어남 (음수, 정률일 때 100 초과)
- E4: maxDiscount 음수
- E5: minOrder 음수
- E6: scope=PRODUCT인데 sku 없음
- E7: scope=ORDER인데 sku 제시 (금지)
- E8: 같은 sku에 상품쿠폰 여러 장 (규칙 7 위반)
- E9: 주문쿠폰 여러 장 (규칙 8 위반)
- E10: 같은 쿠폰 id 중복 (규칙 9 위반)
- E11: 할인액이 기준액 초과 (규칙 12 위반)

## Acceptance

- [x] Coupon 인터페이스가 정의되었다 (scope, sku, type, value, maxDiscount, minOrder)
- [x] priceWithCoupons 함수가 순수 함수로 구현되었다 (입력 items, coupons 변경 없음)
- [x] 정률 쿠폰이 원 미만 버림 처리를 한다 (9,999 × 10% = 999 테스트)
- [x] 정액 쿠폰이 maxDiscount를 초과하지 않는다
- [x] 상품쿠폰이 각 상품별로 적용된다 (여러 상품 테스트)
- [x] 주문쿠폰이 상품쿠폰 적용 후에 적용된다 (적용 순서 테스트)
- [x] minOrder 미달 시 해당 쿠폰이 미적용된다 (에러 아님)
- [x] 같은 sku에 상품쿠폰 2장 제시 시 에러 (규칙 7)
- [x] 주문쿠폰 2장 제시 시 에러 (규칙 8)
- [x] 같은 쿠폰 id 중복 제시 시 에러 (규칙 9)
- [x] 할인액 > 기준액 시 에러 (규칙 12)
- [x] 쿠폰 type/scope/value/maxDiscount/minOrder 유효성 검사 (E1~E7, E11)
- [x] 배송비가 (할인 후 상품합계) 기준으로 계산된다 (0002 규칙 유지)
- [x] 빈 장바구니에 쿠폰 제시 시 모두 미적용 (할인액 0)
- [x] `pnpm check` ALL PASS

설계와 검증 계획: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
