# 0030 — 쿠폰 적용 — SDD

요구사항: [prd.md](prd.md)

## 설계

- **읽은 문서:** `request.md` — 쿠폰 기능 요구사항, 12가지 규칙, 완료 조건; `domain.md` — 원(Won) 단위, LineItem, PriceBreakdown, ShippingPolicy, 배송비 규칙

- **접근:** 
  1. **두 단계 할인 모델:** 상품 쿠폰 → 주문 쿠폰 순서로 순차 적용 (상품 쿠폰: sku별 그룹화, 주문 쿠폰: 상품 쿠폰 적용 후 남은 금액 기준)
  2. **검증 우선:** 모든 쿠폰을 미리 검증 (value, minOrder, maxDiscount 범위, 중복, 존재성)
  3. **불변성 보장:** items와 coupons 배열 참조만, 수정 금지
  4. **배송비 후처리:** 모든 할인 후 (subtotal - totalDiscount) 기준으로 배송비 계산

- **대안·트레이드오프:**
  - **쿠폰 순서:** "목록 순서와 상관없이"는 고정 순서(상품→주문) 적용 의도, 같은 타입 내 순서는 사용자 정렬
  - **minOrder 미충족:** 오류 아닌 할인 0으로 처리 (UX 개선)
  - **정률 원 미만:** Math.floor 명시적 구현 (사양: "버린다")

- **파일 계획:**
  - 신규: `src/pricing/coupon.ts` (Coupon 인터페이스, CouponError, priceWithCoupons 함수)
  - 수정: `src/pricing/__tests__/coupon.test.ts` (22개 테스트)
  - 참조: `src/pricing/price-cart.ts`, `src/cart/cart.ts`, `src/money.ts`

- **위험:**
  1. 소수점 버림 오류 (Math.floor vs 반올림) → 테스트로 검증
  2. 상품/주문 쿠폰 기준금액 혼동 → 규칙 재확인, 주석 명시
  3. 중복 검증 누락 → Map/배열로 집계
  4. 빈 장바구니 엣지 케이스 → 초기 체크

- **검증 계획:** 
  - **유효성 (7):** 정률/정액 값 범위, maxDiscount/minOrder 정수, 상품 쿠폰 sku 필수, 존재 확인, 빈 장바구니
  - **제약 (3):** sku당 상품 쿠폰 1장, 주문 쿠폰 1장, 혼합 케이스
  - **계산 (9):** 정률 100%/50%/10%, 버림 검증, maxDiscount, 정액 기준금액, minOrder
  - **적용순서 (2):** 상품→주문, 다중 상품 쿠폰
  - **배송비 (1):** 할인 후 금액 기준

## 계획과 달라진 점

없음

## 검증 결과

(구현 후 작성)
