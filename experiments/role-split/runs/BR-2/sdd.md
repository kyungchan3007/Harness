# 0030 — 쿠폰 적용 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** domain.md (장바구니·배송비 규칙), src/cart/cart.ts (LineItem), src/pricing/price-cart.ts (PriceBreakdown, ShippingPolicy, priceCart), src/money.ts (Won, assertWon), request.md
- **접근:** 새 파일 `src/pricing/coupon.ts`에서 독립적으로 쿠폰 계산 로직 구현. 모든 쿠폰을 사용 직전에 검증 (CouponError 발생). 상품 쿠폰을 모두 적용한 뒤 주문 쿠폰 적용. 정수 연산은 `Math.floor()` 사용 (원 미만 버림). 최종 할인을 `priceCart()`에 전달하여 배송비 규칙 재사용. 입력 배열 불변 유지.
- **대안·트레이드오프:**
  - 쿠폰 검증 타이밍: 사용 직전 모두 검증 (선택) vs 적용 시점에 검증 → 부분 적용 오류 방지, 입력값 신뢰도 제고
  - 계산 재사용: `priceCart` 호출로 배송비 규칙 일관성 (선택) vs 계산 중복 → DRY 원칙, 유지보수성
  - 스코프별 분류: 배열 분류 후 처리 (선택) vs 순회 중 분기 → 명확성, 테스트 용이성
- **파일 계획:** `src/pricing/coupon.ts` (신규: `Coupon` 인터페이스, `CouponError` 클래스, `priceWithCoupons` 함수), `agents/context/domain.md` (쿠폰 규칙 0030 추가), `src/pricing/coupon.test.ts` (단위/통합 테스트)
- **위험:** (1) 정수 연산 정확성: Math.floor()로 정확하게 처리 필요 (2) minOrder/maxDiscount 경계값 (3) 상품 쿠폰 중복 검증 정확성 (4) 빈 배열 처리
- **검증 계획:** 규칙별 단위 테스트 14개 (정률·정액 할인, maxDiscount, minOrder 경계값, 상품·주문 쿠폰 조합, 제약 조건, 검증 오류, 빈 배열), 배송비 통합 테스트, `pnpm check` ALL PASS

## 계획과 달라진 점

(작업 시작 전이므로 없음)

## 검증 결과

(작업 후 작성)
