# 0030 — 쿠폰 적용 — 판정서

## 1차 · 2026-10-01

판정: approved

### 확인한 것

#### 규칙 12가지 준수 여부

- [x] **규칙 1**: 정률 쿠폰 할인액 = `기준금액 × value / 100` (원 미만 버림)
  - 구현: `calculateDiscount`에서 `Math.floor((baseAmount * coupon.value) / 100)` 사용
  - 테스트: "정률 할인 시 원 미만 버림" 케이스로 검증 (100 × 1 / 100 = 1, 10,000 × 33 / 100 = 3,300)

- [x] **규칙 2**: 정액 쿠폰 할인액 = `value` (기준금액 이하로 제한)
  - 구현: `Math.min(coupon.value, baseAmount)` 사용
  - 테스트: "정액 쿠폰은 기준 금액을 초과할 수 없음" — 20,000 요청 vs 10,000 기준 → 10,000 확인

- [x] **규칙 3**: maxDiscount 적용
  - 구현: `Math.min(discount, coupon.maxDiscount)` 사용
  - 테스트: "maxDiscount로 할인 상한 제한" — 10% (1,000) with maxDiscount(500) → 500 확인

- [x] **규칙 4**: minOrder 미충족 시 0원 할인 (에러 아님)
  - 상품 쿠폰: `if (coupon.minOrder !== undefined && subtotal < coupon.minOrder) { continue; }` 
  - 주문 쿠폰: `if (orderCoupon.minOrder === undefined || subtotal >= orderCoupon.minOrder)`
  - 테스트: "minOrder 미충족 (쿠폰 무시, 에러 아님)" — subtotal 10,000 vs minOrder 20,000 → discount 0, 에러 없음 확인

- [x] **규칙 5**: 상품 쿠폰 기준금액 = 줄 금액 (unitPrice × quantity)
  - 구현: `const lineAmount = item.unitPrice * item.quantity;`
  - 테스트: "상품 쿠폰은 줄 금액 기준 (quantity 포함)" — 20,000 × 2 × 10% = 4,000 확인

- [x] **규칙 6**: 주문 쿠폰 기준금액 = subtotal - 상품쿠폰할인합
  - 구현: `const baseAmount = subtotal - itemDiscount;`
  - 테스트: "주문 쿠폰은 (subtotal - 상품쿠폰할인) 기준" — (50,000 - 5,000) × 10% = 4,500 확인

- [x] **규칙 7**: 적용 순서 = 상품쿠폰 먼저, 주문쿠폰 나중
  - 구현: 132-146줄에서 상품쿠폰 처리, 148-158줄에서 주문쿠폰 처리
  - 테스트: "상품 쿠폰 + 주문 쿠폰 조합" — 순서 검증 ✓

- [x] **규칙 8**: 중복 방지 (상품당 1장, 주문 1장)
  - 상품 쿠폰: `if (itemCouponsMap.has(sku)) { throw new CouponError(...) }`
  - 주문 쿠폰: `if (orderCouponCount > 1) { throw new CouponError(...) }`
  - 장바구니 없는 상품: `if (!items.some((item) => item.sku === sku)) { throw new CouponError(...) }`
  - 테스트: "상품당 여러 쿠폰 (CouponError)", "주문 여러 쿠폰 (CouponError)", "장바구니 없는 상품 쿠폰 (CouponError)" 모두 통과

- [x] **규칙 9**: 쿠폰 유효성 검증
  - 정률: `value` 1~100 정수
  - 정액: `value` 1 이상 정수
  - maxDiscount/minOrder: 0 이상 정수
  - 상품쿠폰: sku 필수
  - 구현: `validateCoupon` 함수에서 모든 검증 수행
  - 테스트: "쿠폰 유효성: rate 범위 검증", "fixed 값 검증", "maxDiscount/minOrder 음수 검증", "상품쿠폰 sku 누락" 모두 통과

- [x] **규칙 10**: 결과값 discount = 상품쿠폰 + 주문쿠폰 합계
  - 구현: `const totalDiscount = itemDiscount + orderDiscount;`
  - 배송비·결제금액은 priceCart 함수로 계산 (기존 규칙 0002 준수)
  - 테스트: 모든 happy path 테스트에서 discount 값 정확성 확인

- [x] **규칙 11**: 빈 장바구니 처리
  - 구현: `if (items.length === 0) { return { subtotal: 0, discount: 0, shipping: 0, total: 0 }; }`
  - 테스트: "빈 장바구니" — 모든 값 0 확인

- [x] **규칙 12**: 불변성 유지 (items, coupons 수정 금지)
  - 구현: items와 coupons를 순회만 하고 수정하지 않음
  - 테스트: "items를 수정하지 않음", "coupons를 수정하지 않음" — JSON.stringify로 검증

#### 타입·인터페이스 정확성

- [x] `Coupon` 인터페이스: 요구사항과 정확히 일치
  - scope, sku, type, value, maxDiscount, minOrder 모두 정확한 타입 및 주석

- [x] `CouponError` 클래스: `extends Error` 정확

- [x] `priceWithCoupons` 함수 시그니처:
  - 입력: `items: readonly LineItem[]`, `coupons: readonly Coupon[]`, `shippingPolicy?: ShippingPolicy`
  - 출력: `PriceBreakdown`
  - 정확함

- [x] `PriceBreakdown` 반환값: `subtotal`, `discount`, `shipping`, `total` 모두 정확

#### 테스트 커버리지

**Happy path (6개)**
- ✅ 정률 쿠폰 단일 적용
- ✅ 정액 쿠폰 단일 적용
- ✅ 상품 쿠폰 + 주문 쿠폰 조합
- ✅ 여러 상품에 상품 쿠폰 각각 적용
- ✅ maxDiscount로 할인 상한 제한
- ✅ minOrder로 최소 주문 조건 확인

**Edge case (3개)**
- ✅ 빈 장바구니
- ✅ 할인이 subtotal과 같은 경우
- ✅ minOrder 미충족 (쿠폰 무시, 에러 아님)

**Error case (5개)**
- ✅ 상품당 여러 쿠폰
- ✅ 주문 여러 쿠폰
- ✅ 장바구니 없는 상품 쿠폰
- ✅ 쿠폰 유효성: rate 범위
- ✅ 쿠폰 유효성: fixed 값
- ✅ 쿠폰 유효성: maxDiscount/minOrder 음수
- ✅ 쿠폰 유효성: 상품쿠폰 sku 누락

**추가 테스트 (7개)**
- ✅ 정률 할인 시 원 미만 버림 (소수 발생 없음)
- ✅ 정률 할인 시 원 미만 버림 (소수 발생)
- ✅ 정률 할인 시 원 미만 버림 (1원 미만)
- ✅ 배송비 규칙: 50,000 이상 무료
- ✅ 배송비 규칙: 50,000 미만 3,000
- ✅ 상품 쿠폰 기준 금액 (quantity 포함)
- ✅ 주문 쿠폰 기준 금액 (subtotal - 상품쿠폰할인)
- ✅ 정액 쿠폰 상한
- ✅ 불변성: items 수정 금지
- ✅ 불변성: coupons 수정 금지
- ✅ 기본 배송비 정책

**전체 테스트 수**: 21개 케이스 (총 120개 테스트)

#### 게이트 확인

```
✅ Typecheck — 모든 타입 정확
✅ Unit tests — 120개 모두 통과
✅ No npm/yarn lockfiles — 정상
✅ Task records (prd·sdd·trace·TASKS) — 모두 완성
```

#### 구현 코드 검증

**입력 검증:**
- 쿠폰 유효성 검증을 적용 전 수행 (조기 에러 감지)
- 정률 value: 1~100 정수
- 정액 value: 1 이상 정수
- maxDiscount/minOrder: 0 이상 정수
- 상품쿠폰 sku 필수

**중복 방지:**
- `Map<string, Coupon>` 사용으로 상품당 1장 검증
- 주문 쿠폰 카운터로 1장 검증
- 장바구니 없는 상품 검증

**할인 계산 정확성:**
- 정률: `Math.floor` 사용으로 원 미만 버림
- 정액: `Math.min(value, baseAmount)` 사용으로 기준금액 제한
- maxDiscount: `Math.min` 사용으로 상한 제한

**기준금액 구분:**
- 상품쿠폰: 줄 금액 = unitPrice × quantity (개당 아님)
- 주문쿠폰: subtotal - itemDiscount

**배송비 규칙:**
- `priceCart` 함수에 discount와 shippingPolicy 전달
- domain.md 규칙 0002 준수 확인 (50,000 이상 무료, 미만 3,000)

**불변성:**
- items, coupons 배열을 순회만 하고 수정하지 않음
- 읽기 전용 매개변수(`readonly`) 사용

### 결론

구현은 **요구사항(request.md)의 12가지 규칙을 모두 정확히 준수**하며, **도메인 규칙(domain.md)과도 일치**합니다. 테스트는 **Happy path, Edge case, Error case를 모두 포함**하여 총 21개 케이스(120개 테스트)를 통과했습니다. `pnpm check` 전체가 PASS되어 **완료 조건을 만족**합니다.
