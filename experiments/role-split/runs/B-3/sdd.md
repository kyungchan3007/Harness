# 0030 — 쿠폰 적용 기능 설계 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, harness/loop.md, context/domain.md, architecture.md, 0002 prd.md/sdd.md
- **접근:**
  - `src/pricing/coupon.ts`에 `Coupon` 인터페이스, `CouponError` 클래스, `priceWithCoupons()` 함수 구현
  - 쿠폰 필드: `scope` ("item"|"order"), `sku?` (scope=item일 때만 필수), `type` ("rate"|"fixed"), `value` (type별로 검증), `maxDiscount?`, `minOrder?`
  - 함수 시그니처: `priceWithCoupons(items, coupons, shippingPolicy?): PriceBreakdown` (0002 priceCart 패턴 따름)
  - 알고리즘: (1) 입력 검증 → (2) 상품 쿠폰 적용 (SKU당 최대 1장) → (3) 주문 쿠폰 적용 (최대 1장) → (4) priceCart() 호출
  - 정률 쿠폰: `Math.floor(기준금액 × value / 100)`, maxDiscount 적용
  - 정액 쿠폰: `value`, maxDiscount 적용, 기준금액 초과 방지 (scope별로 기준 다름)
  - minOrder 미충족: 할인 0원, 오류 아님. scope=order일 때 기준금액은 상품 쿠폰 할인 후 금액
  - 에러 처리: scope/type 범위 검증, scope=item이면 sku 필수, scope=order이면 sku 없어야 함

- **대안·트레이드오프:**
  1. 쿠폰 중복 → (선택됨) 첫 번째만 사용 / 대안: 모두 합산 → 거부: 규칙 단순화 위해
  2. 정액 쿠폰 기준금액 → (선택됨) scope별로 분리 (item: 상품 합계, order: 상품 쿠폰 할인 후) / 대안: 동일 기준 → 거부: 할인 누적 불명확
  3. minOrder 미충족 → (선택됨) 할인 0원 (오류 X) / 대안: 예외 던짐 → 거부: prd 명시 "오류 아님"
  4. 정률 쿠폰 계산 → (선택됨) floor / 대안: round → 거부: 사양 명시 "버림"

- **파일 계획:** `src/pricing/coupon.ts` (+test), `agents/context/domain.md` (규칙 추가)

- **위험:** 정액 쿠폰이 기준금액 초과 → `Math.min(할인액, 기준금액)` 보장; 할인 음수 → 입력 검증과 로직에서 방지; 부동소수점 오류 → `Math.floor` 사용

- **검증 계획:** domain.md 규칙 1~12 각각 테스트, 경계값 (minOrder, maxDiscount), 상품+주문 쿠폰 조합, `pnpm check` ALL PASS, 테스트명에 규칙 번호 붙여 domain.md와 1:1 대응
