# 0030 — 쿠폰 적용 — PRD

- **이슈:** #1

## PRD
- **문제:** 장바구니에는 상품과 배송비만 있고, 할인이 없다.
- **목표:** 쿠폰을 장바구니에 적용해 할인을 계산한다. 규칙은 아래 명세를 따른다.
- **비목표:** 쿠폰 발급, 유효 기간 검증, 쿠폰 사용 내역 기록.

## Acceptance
- [x] 정률/정액 쿠폰 할인을 올바르게 계산한다
- [x] maxDiscount 제약을 적용한다
- [x] minOrder 제약을 적용한다 (미충족 시 오류 아니라 0원 할인)
- [x] 상품 쿠폰(scope=item)과 주문 쿠폰(scope=order)을 구분하고, 상품 쿠폰을 먼저 적용한다
- [x] 상품(sku)당 상품 쿠폰 1장, 주문 전체 1장만 사용 가능 (초과 시 CouponError)
- [x] 장바구니에 없는 상품의 상품 쿠폰은 CouponError
- [x] 잘못된 쿠폰 값(value, maxDiscount, minOrder의 범위, 상품 쿠폰의 sku 누락)은 CouponError
- [x] 결과 PriceBreakdown의 discount는 상품 쿠폰과 주문 쿠폰 할인 합
- [x] 배송비는 모든 할인 후 금액 기준으로 계산
- [x] 빈 장바구니는 모든 금액 0
- [x] 넘겨받은 items, coupons를 수정하지 않음
- [x] `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
