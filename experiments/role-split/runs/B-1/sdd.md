# 0030 — 쿠폰 적용 — SDD

요구사항: [prd.md](prd.md)

## 설계

- **읽은 문서:** AGENTS.md, harness/loop.md, context/domain.md, src/pricing/price-cart.ts, src/cart/cart.ts
- **접근:**
  - `src/pricing/coupon.ts`: `Coupon` 인터페이스, `CouponError` 클래스, `priceWithCoupons()` 순수 함수
  - `Coupon`: scope(sku|order), sku(선택), type(percentage|fixed), value(0~100 정수), maxDiscount(0 이상 정수), minOrder(0 이상 정수)
  - `priceWithCoupons(items, coupons, shippingPolicy)`: 쿠폰을 적용하고 최종 PriceBreakdown 반환
  - 알고리즘:
    1. 입력 검증: coupons 배열 및 각 쿠폰 필드 검증 → CouponError 던지기
    2. scope=sku 쿠폰 적용: 각 LineItem별로, sku 일치하는 쿠폰 순서대로 적용
    3. scope=order 쿠폰 적용: subtotal (sku 할인 적용 후)에 order 쿠폰 순서대로 적용
    4. 최종 할인 금액 계산
    5. `priceCart(items, {discount: totalDiscount, shippingPolicy})` 호출로 배송비·결제 금액 계산
  - 할인액 계산:
    - 정률(percentage): `Math.floor(대상금액 × value / 100)` (내림)
    - 정액(fixed): `value` (단, 대상금액 초과 불가)
    - maxDiscount 적용: `Math.min(할인액, maxDiscount)`
    - minOrder 조건: subtotal < minOrder일 때 쿠폰 미적용

- **대안·트레이드오프:**
  - 할인을 상품별로 저장 vs 합계만 저장: 상품별 할인 내역은 나중에 필요할 수 있지만 지금은 합계만 필요 → 합계만 저장. PriceBreakdown 구조 그대로 유지.
  - scope=sku 할인이 누적된 후 scope=order 할인을 적용할 대상: subtotal에서 모든 sku 할인을 뺀 금액인지, 각 주문 쿠폰마다 직전 누적 할인을 뺀 금액인지 → 명확히: 각 쿠폰은 "직전 단계의 할인 후 금액"에 적용 (중첩 할인)
  - 정률 할인의 반올림: 내림(floor) vs 반올림(round) → 소비자 보호: 내림 선택
  - CouponError vs TypeError/RangeError: 쿠폰 검증은 도메인 로직이므로 전용 에러 클래스 필요 → CouponError 정의

- **파일 계획:**
  - `src/pricing/coupon.ts`: Coupon 인터페이스, CouponError, priceWithCoupons() 함수
  - `agents/context/domain.md`: 쿠폰 규칙 1~12번 추가
  - `src/pricing/coupon.test.ts`: 검증 테스트, 정률·정액 할인, sku·order scope, minOrder·maxDiscount, 적용 순서 등 단위 테스트
  - `src/pricing/` 추가 통합 테스트: priceCart와 연동, 배송비 계산 포함 시나리오

- **위험:**
  - 음수 할인: value가 음수일 수 없도록 입력 검증
  - maxDiscount < value(정액)일 경우 판정: 검증 단계에서 거부할지 여부 → value가 maxDiscount를 초과하는 정액 쿠폰은 경고하되 일단 허용 (maxDiscount가 상한)
  - scope=sku 쿠폰 누적으로 인한 음수: 한 상품의 할인 합이 상품 합계를 초과하지 않도록 제한
  - 빈 장바구니(items.length === 0): 쿠폰이 없어도 PriceBreakdown은 정상 반환 (priceCart가 처리)

- **검증 계획:**
  1. 입력 검증 테스트: 정상 쿠폰, 비정상 type, 비정상 value, 비정상 scope
  2. 할인 계산 테스트:
     - 정률: 1000원 상품에 10% 쿠폰 → 100원 할인
     - 정액: 1000원 상품에 100원 쿠폰 → 100원 할인
     - maxDiscount: 1000원에 50% + maxDiscount 200원 → 200원 할인
     - minOrder: subtotal 30,000원 이상 조건, 20,000원 장바구니 → 쿠폰 미적용
  3. 적용 순서 테스트: SKU 쿠폰 → ORDER 쿠폰 → 배송비
  4. 중복 적용 테스트: 한 상품에 여러 SKU 쿠폰 → 할인 누적
  5. 배송비 연동 테스트: 쿠폰으로 50,000원 이상 달성 → 무료배송
  6. 모든 테스트에 규칙 번호 표기 (domain.md와 1:1 추적)
  7. `pnpm check` ALL PASS

## 계획과 달라진 점

(설계 단계이므로 "없음")

## 검증 결과

(구현 단계 완료 후 builder가 작성)
