# 0030 — 쿠폰 적용 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** prd.md, domain.md, 0002의 sdd.md
- **접근:**
  - `validateCoupon()`, `checkDuplicatesAndMissing()`: 전 검증 단계. 모든 규칙 위반은 즉시 `CouponError`.
  - `calculateDiscount()`: 정률·정액 계산과 `maxDiscount` 적용. 별도 함수로 단위 테스트 가능.
  - 상품 쿠폰 먼저 적용하고 Map으로 sku 맵핑: 반복 검색 방지.
  - 주문 쿠폰은 반복문에서 `break`로 1장 처리: 중복 검증 후 안전.
  - 최종 계산은 `priceCart()`에 위임: 배송비 규칙 재사용.
- **대안·트레이드오프:**
  - 쿠폰 적용을 별도 클래스(CouponCalculator): 테스트 용이하지만 초기엔 과설계. → 순수 함수로 충분.
  - `minOrder` 미충족 시 오류 vs 미적용: 규칙 4번에서 미적용. UX 개선 면에서 오류면 사용자가 다시 입력해야 함.
  - 쿠폰 순서 변경 허용 vs 고정: 고정(상품→주문). 규칙 7번에서 고정이므로 순서 재정렬은 문제가 될 수 있다.
- **파일 계획:** `src/pricing/coupon.ts` (+test), domain.md에는 쿠폰 규칙 추가 없음 (규칙은 prd.md 규칙 12가지로 끝).
- **위험:** 
  - 정률 계산에서 소수점 반올림: `Math.floor` 사용으로 버림만 하도록 제한.
  - 음수 할인: `calculateDiscount`에서는 발생 안 함. `totalDiscount > subtotal`은 `priceCart`의 assertWon에서 거부.
- **검증 계획:** 규칙별 단위 테스트, 상품+주문 쿠폰 조합 테스트, 경계값(0원 할인, maxDiscount), 모든 오류 시나리오, `pnpm check`
