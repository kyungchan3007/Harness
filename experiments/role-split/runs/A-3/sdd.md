# 0030 — 쿠폰 적용 — SDD

요구사항: [prd.md](prd.md)

## 설계

- **접근:**
  1. `src/pricing/coupon.ts`에서 Coupon 인터페이스, CouponError 클래스, priceWithCoupons 함수 구현
  2. priceCart에 discount 값을 전달하여 배송비·결제 금액 계산 위임
  3. 상품 쿠폰 → 주문 쿠폰 순으로 적용, minOrder 조건은 무적용(오류 아님)
  4. 정률은 Math.floor로 원 미만 버림, 정액은 기준 금액 제한

- **아키텍처:**
  ```
  priceWithCoupons(items, coupons, shippingPolicy)
    ├─ 입력 검증 (유효성, 중복, 존재 여부)
    ├─ 상품 쿠폰 적용
    ├─ 주문 쿠폰 적용
    └─ priceCart로 최종 계산 (배송비, 결제 금액)
  ```

- **주요 함수:**
  - `validateCoupon(coupon)`: 유효성 검증
  - `calculateDiscount(coupon, baseAmount)`: 할인 금액 계산

- **대안·트레이드오프:**
  - 중복 검증 시점 (입력 시 vs 계산 시): 입력 시 선택 (빠른 실패, 명확한 오류 메시지)
  - minOrder 미충족 = 오류 vs 무적용: 무적용 선택 (조건부 할인 시나리오 지원)
  - 정율 반올림 (올림 vs 버림): 버림 선택 (도메인 관례)

- **검증 계획:**
  - 정률/정액 할인 기본 동작
  - maxDiscount 적용
  - minOrder 조건 만족/미충족
  - 상품 쿠폰 + 주문 쿠폰 조합
  - 중복 쿠폰, 존재하지 않는 상품 쿠폰 오류
  - 배송비 상호작용 (할인 후 금액 기준)
  - 빈 장바구니, 엣지 케이스
