# 0030 — 쿠폰 적용 — PRD

- **이슈:** #1
- **역할 분리:** on
- **문제:** 장바구니 기능에 쿠폰이 없어서 할인된 가격을 계산할 수 없습니다.
- **목표:** `src/pricing/coupon.ts`에 `Coupon` 인터페이스와 `priceWithCoupons` 함수를 구현해 상품 쿠폰과 주문 쿠폰을 적용하고 최종 금액을 계산합니다.
- **비목표:** 
  - 쿠폰 저장소·관리 기능 (발급, 삭제, 유효기간 등)
  - UI/API 엔드포인트
  - 기존 장바구니·배송비 규칙 변경

## Acceptance

- [x] `src/pricing/coupon.ts` 파일이 존재하고 `Coupon`, `CouponError`, `priceWithCoupons` export
- [x] 정률 쿠폰 할인 금액 = `기준금액 × value / 100` (원 미만 버림)
- [x] 정액 쿠폰 할인 금액 = `value`원 (기준금액 초과 불가)
- [x] `maxDiscount` 지정된 쿠폰의 할인 금액 ≤ `maxDiscount`
- [x] `minOrder` 지정된 쿠폰은 할인 전 `subtotal` ≥ `minOrder`일 때만 적용 (미충족 시 0원, 오류 아님)
- [x] 상품 쿠폰: `unitPrice × quantity` (줄 금액)을 기준으로 계산
- [x] 주문 쿠폰: `subtotal − 상품쿠폰할인합계`를 기준으로 계산
- [x] 상품 쿠폰을 모두 적용한 후 주문 쿠폰 적용 (순서 보장)
- [x] 같은 상품(sku)에 상품 쿠폰 2개 이상 → `CouponError`
- [x] 주문 쿠폰 2개 이상 → `CouponError`
- [x] 장바구니에 없는 상품의 상품 쿠폰 → `CouponError`
- [x] 정률 `value`가 1~100 정수 아님 → `CouponError`
- [x] 정액 `value`가 1 이상의 정수 아님 → `CouponError`
- [x] `maxDiscount`, `minOrder`가 0 이상의 정수 아님 → `CouponError`
- [x] 상품 쿠폰에 `sku` 없음 → `CouponError`
- [x] 결과의 `discount` = 상품 쿠폰 할인 + 주문 쿠폰 할인
- [x] 배송비·결제금액은 기존 배송비 규칙대로 (모든 할인 후 금액으로 계산)
- [x] 빈 장바구니 → 모든 금액 0 (쿠폰 무시)
- [x] `items`, `coupons` 배열 변경 없음 (불변성 보장)
- [x] `pnpm check` ALL PASS (lint, type, test)

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
