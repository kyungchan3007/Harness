# 0030 — 쿠폰 적용 — 검증 보고서

## 1차 · 2026-10-01

판정: approved

### 확인한 것

#### 규칙별 검증 결과

| 규칙 | 구현 방식 | 테스트 커버리지 | 결과 |
|------|---------|---------|------|
| 1. 정률 쿠폰 (floor) | `Math.floor((baseAmount * coupon.value) / 100)` | 5개 (5%, 10%, 25%, 소수점, 9%) | ✅ CONFIRMED |
| 2. 정액 쿠폰 (기준금액 제한) | `Math.min(coupon.value, baseAmount)` | 2개 | ✅ CONFIRMED |
| 3. maxDiscount 상한 | `Math.min(discount, coupon.maxDiscount)` | 2개 (정률/정액) | ✅ CONFIRMED |
| 4. minOrder 조건 | 미달시 0 반환 (오류 아님) | 3개 (만족/미달/다중상품) | ✅ CONFIRMED |
| 5. 상품 쿠폰 기준금액 | `unitPrice × quantity` (줄 금액) | 2개 (단일/다중 줄) | ✅ CONFIRMED |
| 6. 주문 쿠폰 기준금액 | `subtotal - itemDiscountTotal` | 3개 (정액/정률/다중) | ✅ CONFIRMED |
| 7. 적용 순서 | itemCoupons → orderCoupons | 2개 (순서 검증) | ✅ CONFIRMED |
| 8. 중복 제한 | `validateCouponDuplicates`: SKU당 1장, 주문 1장 | 3개 (중복/주문2장/없는상품) | ✅ CONFIRMED |
| 9. 값 검증 | `validateCoupon`: 범위/정수성 검증 | 11개 (정률/정액/maxDiscount/minOrder/sku) | ✅ CONFIRMED |
| 10. 할인 합계 & 배송비 | `itemDiscountTotal + orderDiscount`, priceCart 위임 | 4개 (합계/배송비 규칙) | ✅ CONFIRMED |
| 11. 빈 장바구니 | `items.length === 0` → 모든 금액 0 | 2개 | ✅ CONFIRMED |
| 12. 불변성 | `readonly` 배열, 배열 수정 없음 | 2개 (JSON 비교) | ✅ CONFIRMED |

#### 경계값 검증

- **정률 범위**: 1~100 정수만 허용, 0/101/소수/음수 모두 CouponError ✅
- **정액 범위**: 1 이상의 정수, 0/소수/음수 모두 CouponError ✅
- **maxDiscount/minOrder**: 0 이상의 정수, 음수/소수 CouponError ✅
- **floor 동작**: 3,000 × 25 / 100 = 750, 37,000 × 9 / 100 = 3,330 정확히 계산 ✅

#### 오류 케이스

- 같은 SKU에 2개 상품 쿠폰: CouponError ("상품에 여러 쿠폰을 적용할 수 없습니다") ✅
- 주문 쿠폰 2장: CouponError ("주문 쿠폰은 1장까지만 사용 가능합니다") ✅
- 없는 상품 상품 쿠폰: CouponError ("장바구니에 없는 상품입니다") ✅
- 상품 쿠폰에 sku 없음: CouponError ("상품 쿠폰은 sku 필수") ✅

#### 복합 시나리오

- 상품 쿠폰 + 주문 쿠폰 조합: 순서 보장, 기준금액 올바름 ✅
- 정률 + 정액 혼합: 각각 계산, 합계 정확함 ✅
- minOrder 미달로 상품 쿠폰 무시, 주문 쿠폰만 적용: 올바르게 처리 ✅
- shippingPolicy 기본값: DEFAULT_SHIPPING_POLICY 사용 ✅
- 배송비 규칙 준수: 할인 후 금액 50,000원 이상 무료, 미만 3,000원 ✅

#### 게이트 검증

```
Test Files  11 passed (11)
     Tests  137 passed (137)
✅ PASS — Typecheck
✅ PASS — Unit tests
✅ PASS — No npm/yarn lockfiles
✅ PASS — Task records
```

- 규칙 1-12: 모든 규칙별 테스트 존재 및 PASS
- 경계값: 정수성, 범위 검증 테스트 완료
- 에러 케이스: 모든 CouponError 시나리오 검증
- 복합 시나리오: 5개 추가 통합 테스트 PASS
- shippingPolicy: 기본값 및 커스텀 정책 테스트
- request.md 12개 규칙 모두 구현 및 검증 완료
- domain.md 쿠폰 규칙과 일치 확인
