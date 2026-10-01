# 0030 — 쿠폰 적용 — PRD

- **이슈:** #1
- **역할 분리:** on
- **문제:** 장바구니에 쿠폰을 적용하는 기능이 없어서 할인된 최종 금액을 계산할 수 없습니다.
- **목표:** 정률·정액 쿠폰(상품별/주문 전체)을 장바구니에 적용해 최종 결제 금액을 계산하는 `priceWithCoupons` 함수를 구현합니다.
- **비목표:** 
  - 쿠폰 생성·보관·만료 관리
  - UI/결제 게이트웨이 연동
  - 쿠폰 통계·분석

## Acceptance

**구현 완료 조건:**
- [ ] `src/pricing/coupon.ts`에 `Coupon` 인터페이스, `CouponError` 클래스, `priceWithCoupons` 함수 구현
- [ ] 도메인 규칙 0030의 12가지 규칙을 모두 준수:
  - [ ] 정률 쿠폰 할인액 계산 (원 미만 버림)
  - [ ] 정액 쿠폰 할인액 계산 (기준 금액 이하로 제한)
  - [ ] maxDiscount 적용
  - [ ] minOrder 조건 검증 (조건 미충족 시 0원 할인, 에러 아님)
  - [ ] 상품 쿠폰의 기준 금액 (줄 금액 = unitPrice × quantity)
  - [ ] 주문 쿠폰의 기준 금액 (상품합계 - 상품쿠폰할인합)
  - [ ] 적용 순서 (상품 쿠폰 먼저, 주문 쿠폰 나중)
  - [ ] 중복 적용 방지 (상품당 1장, 주문 1장)
  - [ ] 쿠폰 유효성 검증 (정률 1-100, 정액 1 이상, maxDiscount/minOrder 0 이상, 상품쿠폰 sku 필수)
  - [ ] 결과값 계산 (discount = 상품쿠폰+주문쿠폰 합계)
  - [ ] 배송비 규칙 적용 (할인 후 금액 기준)
  - [ ] 빈 장바구니 처리 (모든 값 0)
  - [ ] 불변성 유지 (items, coupons 수정 금지)

**테스트 완료 조건:**
- [ ] Happy path: 정률/정액 쿠폰 단일 적용
- [ ] Happy path: 상품 쿠폰 + 주문 쿠폰 조합
- [ ] Happy path: 여러 상품에 상품 쿠폰 각각 적용
- [ ] Happy path: maxDiscount로 할인 상한 제한
- [ ] Happy path: minOrder로 최소 주문 조건 확인
- [ ] Edge case: 빈 장바구니
- [ ] Edge case: 할인이 subtotal과 같은 경우
- [ ] Edge case: minOrder 미충족 (쿠폰 무시, 에러 아님)
- [ ] Error: 상품당 여러 쿠폰 (CouponError)
- [ ] Error: 주문 여러 쿠폰 (CouponError)
- [ ] Error: 장바구니 없는 상품 쿠폰 (CouponError)
- [ ] Error: 쿠폰 유효성 검증 실패 (CouponError) — rate 범위, fixed 값, maxDiscount/minOrder 음수, 상품쿠폰 sku 누락
- [ ] `pnpm check` ALL PASS (lint, type, unit test, integration test)

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
