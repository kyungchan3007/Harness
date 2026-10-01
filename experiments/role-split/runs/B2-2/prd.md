# 0030 — 쿠폰 적용 — PRD

## 문제

장바구니에 쿠폰을 적용하지 못해, 사용자가 할인을 받을 수 없습니다.

## 목표

상품 줄별 할인(상품 쿠폰)과 전체 주문 할인(주문 쿠폰)을 지원하는 쿠폰 적용 기능을 구현합니다.

## 범위

- **구현:** `src/pricing/coupon.ts`에 Coupon 인터페이스, CouponError 클래스, priceWithCoupons 함수
- **규칙:** request.md의 12개 규칙을 모두 준수
- **테스트:** 모든 규칙과 에러 케이스를 테스트하여 `pnpm check` PASS

## 역할 분리

- **역할 분리:** on
- **Designer:** PRD, SDD, trace.md 작성
- **Builder:** src/pricing/coupon.ts, 테스트 파일 구현
- **Verifier:** verdict.md 작성, `pnpm check` 검증

## 이슈

- **이슈:** #1

## Acceptance

### 기능 완성

- [ ] Coupon 인터페이스 구현 (scope, sku?, type, value, maxDiscount?, minOrder?)
- [ ] CouponError 클래스 정의
- [ ] priceWithCoupons 함수 구현 (items, coupons, shippingPolicy?)
- [ ] 반환값 PriceBreakdown (subtotal, discount, shipping, total)

### 규칙 준수

- [ ] 규칙 1: 정률 쿠폰 계산 (floor 적용)
- [ ] 규칙 2: 정액 쿠폰 (기준 금액 제한)
- [ ] 규칙 3: maxDiscount 상한 적용
- [ ] 규칙 4: minOrder 미달 시 무시 (오류 아님)
- [ ] 규칙 5: 상품 쿠폰 (줄 금액 기준)
- [ ] 규칙 6: 주문 쿠폰 (상품 쿠폰 할인 후 기준)
- [ ] 규칙 7: 상품 → 주문 순 적용
- [ ] 규칙 8: 중복 제한 (sku당 1장, 주문 1장)
- [ ] 규칙 9: 값 검증 (CouponError)
- [ ] 규칙 10: 할인 합계, 배송비 규칙
- [ ] 규칙 11: 빈 장바구니 처리
- [ ] 규칙 12: 불변성

### 테스트

- [ ] 정률 쿠폰 계산 (5%, 10%, 25%, floor 검증)
- [ ] 정액 쿠폰 (기준 금액 제한 검증)
- [ ] maxDiscount 제한 적용
- [ ] minOrder 조건 (만족, 미달, 무시됨)
- [ ] 상품 쿠폰만 적용
- [ ] 주문 쿠폰만 적용
- [ ] 상품 + 주문 쿠폰 조합
- [ ] 중복 쿠폰 에러 (같은 SKU, 주문 쿠폰 2장)
- [ ] 없는 상품의 상품 쿠폰 에러
- [ ] 잘못된 값 에러 (value 범위, 정수성)
- [ ] 배송비 계산 (무료 조건 50,000원)
- [ ] 빈 장바구니 (금액 0)
- [ ] shippingPolicy 기본값

### 게이트

- [ ] `pnpm check` ALL PASS
- [ ] 코드: `src/pricing/coupon.ts` 및 테스트만
