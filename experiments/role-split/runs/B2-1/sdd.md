# 0030 — 쿠폰 적용 — SDD

요구사항: [prd.md](prd.md)

## 설계

- **읽은 문서:**
  - `agents/intent/specs/0030-coupons/request.md` — 쿠폰 기능 요구사항 및 규칙 12가지
  - `agents/context/domain.md` — 배송비 규칙 (0002)
  - `src/cart/cart.ts` — LineItem 인터페이스
  - `src/pricing/price-cart.ts` — PriceBreakdown, ShippingPolicy, priceCart 함수
  - `src/money.js` — Won 타입 및 assertWon 함수

- **접근:** 단계별 알고리즘 — 입력검증 → subtotal 계산 → 상품쿠폰 적용 → 주문쿠폰 적용 → 배송비 계산. 규칙 9의 사전 검증으로 에러 조기 감지, Map으로 중복 방지, Math.floor로 정수 보장.

- **대안·트레이드오프:** 쿠폰 순서 정렬(명시 vs 규칙) — 규칙 사용 선택 (코드 단순, 규칙 7 직접 준수). 유효성 검증 시점(적용 전 vs 적용 시) — 적용 전 선택 (조기 에러 감지). minOrder 미충족(에러 vs 0원) — 0원 할인 선택 (규칙 4). 정률 내림(floor vs round) — floor 선택 (규칙 1). 중복 검증(사전 vs 사후) — 사전 검증 선택 (조기 감지).

- **파일 계획:**
  - 생성: `src/pricing/coupon.ts` (Coupon 인터페이스, CouponError 클래스, priceWithCoupons 함수, 헬퍼 함수)
  - 참조: `src/cart/cart.ts`, `src/pricing/price-cart.ts`, `src/money.ts`, `agents/context/domain.md`

- **위험:** 부동소수점 연산 오류(Math.floor 사용), 중복 검증 누락(Map 사용), minOrder >= 조건 오류, 상품/주문 기준 금액 혼동, 불변성 위반(입력 복사 필수), 빈 장바구니 처리 누락.

- **검증 계획:** 단위테스트 — 정률/정액 할인액(floor, maxDiscount), minOrder 미충족(0원 할인), 상품쿠폰(줄 금액), 주문쿠폰(subtotal - 상품할인합), 중복 방지(상품당 1, 주문 1), 유효성 검증(rate 1-100, fixed 1+, maxDiscount/minOrder 0+, sku 필수), 빈 장바구니. 통합테스트 — priceCart 연동, 배송비 규칙(50000 이상 무료). 게이트 — pnpm check.

## 계획과 달라진 점

없음 (설계 단계이므로 미정)

## 검증 결과

(구현 및 테스트 완료 후 기입)
