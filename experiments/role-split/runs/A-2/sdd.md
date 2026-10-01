# 0030 — 쿠폰 적용 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** domain.md, priceCart 구현
- **접근:**
  - Coupon 인터페이스를 정의해 쿠폰의 종류(scope: item/order)와 할인 방식(type: rate/fixed)을 분리
  - 할인 계산: 정률은 Math.floor로 내림, 정액은 기준금액 제약
  - maxDiscount와 minOrder 제약을 검증 단계(값 유효성)와 적용 단계(조건 충족)에서 처리
  - 상품 쿠폰을 먼저 적용한 후 주문 쿠폰을 적용하도록 순서 고정
  - priceWithCoupons는 priceCart와 분리된 독립 함수로 구현
- **대안·트레이드오프:**
  - priceCart 재사용 vs 독립 구현: 재사용하면 코드 중복을 줄 수 있지만, 할인 계산의 각 단계를 명시적으로 제어하기 어렵다. 독립 구현으로 명확성과 유지보수성을 택함.
  - minOrder 미충족 시 오류 vs 무시: 규칙 4에 따라 오류가 아니라 그 쿠폰만 적용 안 함(할인 0원). 예측 가능한 동작.
- **파일 계획:** `src/pricing/coupon.ts`(+test), 기존 `src/pricing/price-cart.ts`와 `src/cart/cart.ts` 수정 없음
- **위험:** 
  - 상품 쿠폰의 기준금액은 줄 전체(`unitPrice × quantity`)인데, 개당으로 착각할 수 있음 → 테스트에서 quantity > 1인 경우로 검증
  - 할인이 subtotal을 초과하는 경우 → 모든 할인 적용 후 체크해 RangeError 던짐
- **검증 계획:**
  - 규칙별 단위 테스트 (정률/정액, maxDiscount, minOrder, 상품/주문 쿠폰, 적용 순서)
  - 경계값 테스트 (1%, 100%, 기준금액 이상/이하)
  - 에러 케이스 (중복 쿠폰, 없는 상품, 잘못된 값)
  - 배송비 계산 확인 (할인 후 금액이 50,000 이상/이하)
  - `pnpm check`

## 검증 결과
- `pnpm check`: ALL PASS (Typecheck, 단위 테스트 131개, lockfile, spec 레코드)
- 정률/정액 쿠폰: 1%, 10%, 33%, 100% 계산 확인, Math.floor 원 미만 버림 검증
- maxDiscount 제약: 정률/정액 모두 상한 적용 확인
- minOrder 제약: 미충족 시 0원 할인(오류 아님) 확인, 경계값 49,999/50,000 검증
- 상품 쿠폰: sku별 1장 제약, 줄 금액(quantity 포함) 기준 계산, 장바구니 없는 상품 에러
- 주문 쿠폰: 1장 제약, 상품 할인 후 금액 기준 계산
- 적용 순서: 상품 쿠폰 먼저 적용 후 주문 쿠폰 확인
- 배송비: 할인 후 금액 50,000원 기준, 경계값 49,999/50,000 검증
- 입력 보호: items, coupons 수정 없음 확인
- 에러 케이스: 값 범위 위반, 중복 쿠폰, 없는 상품 모두 CouponError
