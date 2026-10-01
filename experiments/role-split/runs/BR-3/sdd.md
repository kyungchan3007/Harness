# 0030 — 쿠폰 적용 — SDD

요구사항: [prd.md](prd.md)

## 설계

- **읽은 문서:**
  - `request.md` (이슈 본문) — 12개 규칙, 인터페이스 정의
  - `agents/context/domain.md` — 배송비 규칙 (기본 3,000원, 할인 후 ≥50,000원 무료), subtotal·discount·total 정의
  - `prd.md` (본 문서 작성 중) — 요구사항 정리

- **접근:**
  1. **인터페이스 준수:** `src/pricing/coupon.ts`의 시그니처를 정확히 구현 (원문 그대로)
  2. **입력 검증:** 각 쿠폰의 `type`, `value`, `maxDiscount`, `minOrder`, `scope`/`sku` 조합 검증
  3. **중복 제어:** 같은 상품에 상품 쿠폰 여러 장 금지, 주문 쿠폰 여러 장 금지
  4. **적용 순서:** 상품 쿠폰 전체 → 주문 쿠폰 (list 순서와 무관)
  5. **할인 계산:** 각 쿠폰마다 기준금액, 할인율/액 반영, maxDiscount 확인
  6. **조건 검사:** minOrder로 전체 쿠폰 적용 필터링
  7. **결과 조립:** `PriceBreakdown` 반환 (discount = 상품쿠폰 + 주문쿠폰)

- **대안·트레이드오프:**
  - **대안 1: 쿠폰 적용 순서 유연성**
    - 검토: 요구사항에서 "적용 순서는 목록 순서와 상관없이 상품 쿠폰을 모두 적용한 뒤 주문 쿠폰"이 명확하므로 고정 순서 적용
    - **선택:** 고정 순서 (상품 → 주문)
  
  - **대안 2: minOrder 미충족 시 처리**
    - 검토: 요구사항에서 "조건에 못 미치면 오류가 아니라 그 쿠폰만 적용하지 않습니다(할인 0원)"
    - **선택:** 오류 아님, 할인 0원 처리
  
  - **대안 3: 정액 쿠폰의 기준금액 상한**
    - 검토: "정액 쿠폰의 할인 금액은 value원이지만, 기준 금액보다 클 수 없습니다"
    - **선택:** `Math.min(value, 기준금액)` 적용

- **파일 계획:**
  - **`src/pricing/coupon.ts`** — 본 구현
    - `Coupon` 인터페이스 (원문 그대로)
    - `CouponError` 클래스
    - `priceWithCoupons` 함수 구현
    - 내부 헬퍼: 검증, 할인 계산, 우선순위 정렬

- **위험:**
  1. **부동소수점 오차:** 할인 계산에서 원 미만 버림 필수 (Math.floor 사용)
  2. **빈 장바구니:** items가 비어있으면 모든 금액 0 반환 (early return)
  3. **입력 수정:** items, coupons를 read-only 취급, 배열 조작 미사용
  4. **기존 배송비 규칙 협력:** DEFAULT_SHIPPING_POLICY 또는 인자 shippingPolicy 사용 필수

- **검증 계획:**
  - **단위 테스트 (jest):**
    - 정률 쿠폰 (100% 할인, 부분 할인, 상한 초과)
    - 정액 쿠폰 (기준금액 내, 기준금액 초과)
    - minOrder 조건 (충족, 미충족)
    - maxDiscount 조건 (초과, 이내)
    - 상품 쿠폰 + 주문 쿠폰 조합
    - 중복 쿠폰 (같은 상품 2장, 주문 쿠폰 2장) → CouponError
    - 없는 상품 쿠폰 → CouponError
    - 검증 오류 (value, maxDiscount, minOrder 범위) → CouponError
    - 빈 장바구니
    - 입력 불변성 (items, coupons 변경 안 됨)
  
  - **통합 테스트:**
    - 실제 장바구니 → 최종 금액 계산 (배송비 포함)
  
  - **게이트:** `pnpm check` (lint, type, test, coverage)

## 규칙 (엄밀한 기술)

### R.1: 정률 쿠폰 계산

- `type === "rate"`인 경우
- 할인 금액 = `floor(기준금액 × value / 100)`
- `value`는 1~100의 정수 (검증에서 확인)

### R.2: 정액 쿠폰 계산

- `type === "fixed"`인 경우
- 할인 금액 = `min(value, 기준금액)`
- `value`는 1 이상의 정수 (검증에서 확인)

### R.3: maxDiscount 상한

- `maxDiscount`가 정의되어 있으면
- 최종 할인 금액 = `min(계산된_할인, maxDiscount)`
- `maxDiscount`는 0 이상의 정수 (검증에서 확인)

### R.4: minOrder 조건

- `minOrder`가 정의되어 있으면
- 쿠폰 적용 조건: `subtotal (할인 전 상품 합계) >= minOrder`
- 조건 미충족 시: 쿠폰 미적용 (오류 아님), 할인 금액 = 0
- `minOrder`는 0 이상의 정수 (검증에서 확인)

### R.5: 상품 쿠폰의 기준금액

- `scope === "item"`인 경우
- 기준금액 = 해당 SKU 줄의 `unitPrice × quantity`
- **한 줄에 대해 한 번만 계산** (개당 아님)
- `sku` 필드 필수 (없으면 CouponError)

### R.6: 주문 쿠폰의 기준금액

- `scope === "order"`인 경우
- 기준금액 = `subtotal - Σ(상품쿠폰할인)`
- 상품 쿠폰 계산 완료 후에 계산

### R.7: 적용 순서

1. 입력 `coupons` 목록 순서와 무관하게 정렬
2. 상품 쿠폰(`scope === "item"`) 모두 먼저 계산
3. 주문 쿠폰(`scope === "order"`) 나중에 계산

### R.8: 중복 제한 및 오류

- **상품 쿠폰:** 같은 `sku`에 대해 최대 1장만 허용
  - 초과: `CouponError` 발생
- **주문 쿠폰:** 최대 1장만 허용
  - 초과: `CouponError` 발생
- **없는 상품:** 상품 쿠폰의 `sku`가 장바구니에 없으면 `CouponError` 발생

### R.9: 입력 검증

모든 검증 오류는 `CouponError` 발생:

- **정률 쿠폰:** `type === "rate"` → `value`는 1~100 범위 정수
- **정액 쿠폰:** `type === "fixed"` → `value`는 1 이상 정수
- **maxDiscount:** 0 이상의 정수 (정의된 경우)
- **minOrder:** 0 이상의 정수 (정의된 경우)
- **상품 쿠폰:** `scope === "item"` → `sku` 필드 필수

### R.10: 결과 조립

- `discount` = `Σ(상품쿠폰할인) + Σ(주문쿠폰할인)`
- `shipping` 계산: 기존 배송비 규칙 따름
  - 기준: `subtotal - discount` (할인 후 금액)
  - 규칙: ≥50,000원 무료, 그 외 3,000원
- `total` = `subtotal - discount + shipping`

### R.11: 빈 장바구니

- `items.length === 0`이면
- `subtotal = 0`, `discount = 0`, `shipping = 0`, `total = 0` 반환
- 쿠폰 검증 및 계산 생략

### R.12: 입력 불변성

- 인자 `items`, `coupons`를 수정하지 않음 (read-only)

## 예제

### 예제 1: 상품 쿠폰 + 주문 쿠폰

```
items:
  - sku: "A", unitPrice: 10,000, quantity: 2 → 20,000
  - sku: "B", unitPrice: 15,000, quantity: 1 → 15,000
  subtotal: 35,000

coupons:
  - scope: "item", sku: "A", type: "rate", value: 10 (10% 할인)
  - scope: "order", type: "fixed", value: 5,000

step 1: 상품 쿠폰 (A)
  기준금액: 20,000
  할인: floor(20,000 × 10 / 100) = 2,000
  item_discount: 2,000

step 2: 주문 쿠폰
  기준금액: 35,000 - 2,000 = 33,000
  할인: min(5,000, 33,000) = 5,000
  order_discount: 5,000

step 3: 최종
  discount: 2,000 + 5,000 = 7,000
  배송비: 35,000 - 7,000 = 28,000 < 50,000 → 3,000원
  total: 35,000 - 7,000 + 3,000 = 31,000
```

### 예제 2: maxDiscount 상한

```
items:
  - sku: "A", unitPrice: 100,000, quantity: 1 → 100,000
  subtotal: 100,000

coupons:
  - scope: "item", sku: "A", type: "rate", value: 50, maxDiscount: 30,000

step 1: 계산
  기준금액: 100,000
  할인(상한 전): floor(100,000 × 50 / 100) = 50,000
  할인(상한 적용): min(50,000, 30,000) = 30,000

result:
  discount: 30,000
  배송비: 100,000 - 30,000 = 70,000 ≥ 50,000 → 무료
  total: 100,000 - 30,000 + 0 = 70,000
```

### 예제 3: minOrder 미충족

```
items:
  - sku: "A", unitPrice: 10,000, quantity: 2 → 20,000
  subtotal: 20,000

coupons:
  - scope: "order", type: "fixed", value: 5,000, minOrder: 50,000

step 1: 검사
  minOrder: 50,000
  subtotal: 20,000 < 50,000 → 조건 미충족
  할인: 0원 (오류 아님)

result:
  discount: 0
  배송비: 20,000 - 0 = 20,000 < 50,000 → 3,000원
  total: 20,000 - 0 + 3,000 = 23,000
```

### 예제 4: 중복 쿠폰 오류

```
coupons:
  - scope: "item", sku: "A", type: "rate", value: 10
  - scope: "item", sku: "A", type: "fixed", value: 2,000
  (같은 sku "A"에 2장 → CouponError)
```

### 예제 5: 없는 상품 쿠폰

```
items:
  - sku: "A", unitPrice: 10,000, quantity: 1

coupons:
  - scope: "item", sku: "B", type: "rate", value: 10
  (B는 장바구니에 없음 → CouponError)
```

## 계획과 달라진 점

(작업 중 기록)

## 검증 결과

(검사자가 기록)
