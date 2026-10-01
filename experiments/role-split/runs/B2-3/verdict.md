# 0030 — 판정서

## 1차 · 2026-10-01

판정: rejected

### 근거

**규칙 위반: 함수 시그니처**

- request.md 라인 8 "이름·타입을 바꾸지 마세요" — 입력: 요구사항 시그니처 / 기대: `function priceWithCoupons(items: readonly LineItem[], coupons: readonly Coupon[], shippingPolicy?: ShippingPolicy): PriceBreakdown` / 실제: `function priceWithCoupons(items: readonly LineItem[], coupons: readonly Coupon[] = [], options: PriceWithCouponsOptions = {}): PriceBreakdown`

- Coupon 인터페이스 타입 지정 — 입력: `maxDiscount?, minOrder?` 타입 / 기대: `Won` / 실제: `number`

### 확인한 것

**기능 검증 (모두 정상)**
- ✓ Rule 1 정률 할인: 테스트 "정률 쿠폰 50%: 원 미만 버림" — floor(10001 × 50 / 100) = 5000 검증 완료
- ✓ Rule 2 정액 할인: 테스트 "정액 쿠폰: 기준금액을 초과 불가" — min(15000, 10000) = 10000 검증 완료
- ✓ Rule 3 maxDiscount: 테스트 "maxDiscount: 할인액 제한" — min(50000, 5000) = 5000 검증 완료
- ✓ Rule 4 minOrder 미충족: 테스트 "minOrder 미충족: 할인 0 (오류 아님)" — discount 0, 오류 없음 검증 완료
- ✓ Rule 5 상품 쿠폰 기준금액: 테스트 "상품 쿠폰: unitPrice × quantity 기반" — 5000 × 3 = 15000, 50% = 7500 검증 완료
- ✓ Rule 6 주문 쿠폰 기준금액: 테스트 "상품 쿠폰 → 주문 쿠폰 순서로 적용" — subtotal 10000 - item 5000 = 5000, order 50% = 2500 검증 완료
- ✓ Rule 7 적용 순서: 코드 분석 — 상품 쿠폰 먼저 처리(라인 114-150), 주문 쿠폰 이후 처리(라인 153-171)
- ✓ Rule 8 제약: 테스트 "상품 쿠폰: sku당 1장 초과 시 CouponError", "주문 쿠폰: 1장 초과 시 CouponError", "존재하지 않는 sku" — 모두 CouponError 검증 완료
- ✓ Rule 9 검증: 테스트 "정률/정액 value 범위", "maxDiscount/minOrder 정수", "sku 필수" — 모두 CouponError 검증 완료
- ✓ Rule 10 discount 합계: 테스트 "복합 할인: 상품 쿠폰 2개 + 주문 쿠폰" — 2000 + 5000 + 8600 = 15600 검증 완료
- ✓ Rule 11 빈 장바구니: 테스트 "빈 장바구니: 쿠폰 무시, 모든 금액 0" — {subtotal: 0, discount: 0, shipping: 0, total: 0} 검증 완료
- ✓ Rule 12 배열 불변성: 코드 분석 — readonly 키워드 사용, 배열 수정 불가능

**테스트 결과**
- ✓ 117개 테스트 ALL PASS (pnpm exec vitest run)
- ✓ 타입체크 PASS (pnpm exec tsc --noEmit)
- ✓ 24개 테스트가 22개 SDD 케이스 커버

**배송비 정확성**
- ✓ 할인 후 금액 < 50,000: 배송비 3,000원 — 테스트 "할인 후 금액이 50,000원 이상이면 무료" 검증

**결론:**
기능적으로 모든 12개 규칙을 정확히 구현하고 테스트 완벽하나, 명시적 시그니처 요구사항 위반으로 승인 불가. 함수 파라미터 구조와 Coupon 인터페이스 타입을 수정 필요.

---

## 2차 · 2026-10-01

판정: approved

### 확인한 것

**시그니처 재검증**
- ✓ Coupon 인터페이스 (라인 14-27): `maxDiscount?: Won`, `minOrder?: Won` — Won 타입 정확 확인
- ✓ 함수 시그니처 (라인 190-194): `priceWithCoupons(items: readonly LineItem[], coupons: readonly Coupon[], shippingPolicy?: ShippingPolicy): PriceBreakdown` — 정확히 요구사항 일치

**12개 규칙 최종 검증**
1. ✓ 정률 할인: 라인 49 `Math.floor((baseAmount * coupon.value) / 100)` — 원 미만 버림 구현
2. ✓ 정액 할인: 라인 52 `Math.min(coupon.value, baseAmount)` — 기준금액 초과 불가 구현
3. ✓ maxDiscount: 라인 55-57 `Math.min(discount, coupon.maxDiscount)` — 할인액 제한 구현
4. ✓ minOrder 미충족: 라인 148, 169 조건부 할인 0 — 오류 없이 할인 0 처리
5. ✓ 상품 쿠폰 기준금액: 라인 145 `item.unitPrice * item.quantity` — 줄 금액 기준
6. ✓ 주문 쿠폰 기준금액: 라인 166 `subtotal - result.totalItemDiscount` — 상품 할인 후 금액 기준
7. ✓ 적용 순서: 라인 119-156 상품 쿠폰 먼저, 라인 164-177 주문 쿠폰 나중 — 올바른 순서
8. ✓ 상품 쿠폰 제한: 라인 133-135 `sku당 1장 초과 시 CouponError` — 제약 확인
9. ✓ 주문 쿠폰 제한: 라인 160-162 `1장 초과 시 CouponError` — 제약 확인
10. ✓ 장바구니에 없는 상품: 라인 128-130 `CouponError` — 검증 확인
11. ✓ 값 검증: 라인 65-95 `validateCoupon` — 정률/정액/maxDiscount/minOrder/sku 모두 검증
12. ✓ discount 합계: 라인 179 `totalDiscount = totalItemDiscount + totalOrderDiscount` — 합계 계산
13. ✓ 배송비 계산: 라인 221-222 할인 후 금액 기준 — 배송비 규칙 적용
14. ✓ 빈 장바구니: 라인 198-199 모든 금액 0 — 빈 장바구니 처리
15. ✓ 배열 불변성: 라인 191-192 `readonly LineItem[]`, `readonly Coupon[]` — 배열 수정 불가능

**테스트 커버리지 최종 확인**
- ✓ `pnpm exec vitest run src/pricing/__tests__/coupon.test.ts`: 24 PASS
- ✓ `pnpm exec tsc --noEmit`: Typecheck PASS
- ✓ `pnpm check`: ALL PASS (117 tests total)

**규칙 매핑**
- ✓ "정률 쿠폰 100%, 50%, 10%" — domain.md 규칙 1 (원 미만 버림)
- ✓ "maxDiscount 할인액 제한" — domain.md 규칙 3
- ✓ "정액 쿠폰 기준금액 초과 불가" — domain.md 규칙 2
- ✓ "minOrder 충족/미충족" — domain.md 규칙 4
- ✓ "상품 쿠폰 단위 금액" — domain.md 규칙 5
- ✓ "상품 쿠폰 → 주문 쿠폰 순서" — domain.md 규칙 6, 7
- ✓ "상품 쿠폰 sku당 1장, 주문 쿠폰 1장" — domain.md 제약
- ✓ "검증 오류 (정률/정액/maxDiscount/minOrder/sku)" — domain.md 검증 오류
- ✓ "discount 합계, 배송비, 결제 금액" — domain.md 결과 계산
- ✓ "빈 장바구니 처리" — domain.md 제약
- ✓ "배열 불변성" — prd.md acceptance criterion

**결론:**
모든 시그니처 요구사항 충족. 12개 규칙 완벽 구현. 테스트 117/117 PASS. pnpm check ALL PASS. domain.md, prd.md, request.md 모든 요구사항 충족. 승인.
