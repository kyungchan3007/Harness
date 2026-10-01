# 0030 — 쿠폰 할인 기능 — 판정서

> 검사자(verifier)만 쓴다. 회차를 **아래로 쌓고** 이전 회차는 지우지 않는다. 반려는 최대 2회 — 3회째 반려면 막힘(사람이 판단).

## 1차 · 2026-10-01
판정: approved

### 근거
- 모든 12개 규칙 충족: 정률·정액 할인, maxDiscount, minOrder, 기준액 계산, 적용 순서, 중복 제한, 유효성 검사, 배송비 기준
- 모든 11개 에러 조건 구현: E1(type), E2(scope), E3(value), E4(maxDiscount), E5(minOrder), E6(상품 sku 필수), E7(주문 sku 금지), E8(상품 중복), E9(주문 중복), E10(id 중복), E11(할인액 초과)
- 정수값 검증 포함: value, maxDiscount, minOrder 모두 Number.isInteger() 체크
- 48개 테스트 모두 PASS (SDD 요구 40개 초과)
- pnpm check ALL PASS (Typecheck, Unit tests 141개 포함)

### 확인한 것

#### 인터페이스 검증
- Coupon 인터페이스: id, scope, sku?, type, value, maxDiscount, minOrder 모두 포함 ✓
- CouponError: Error 상속, name="CouponError" 설정 ✓
- priceWithCoupons 함수 서명: `(items: readonly LineItem[], coupons: readonly Coupon[], shippingPolicy?: ShippingPolicy): PriceBreakdown` ✓
- DEFAULT_SHIPPING_POLICY 기본값 사용 ✓

#### 12개 규칙 검증
1. **정률 쿠폰**: `Math.floor((basePriceForSku * coupon.value) / 100)` 원 미만 버림
   - 테스트: 10,000 × 10% = 1,000, 9,999 × 10% = 999 (floor) ✓
2. **정액 쿠폰**: `Math.min(coupon.value, coupon.maxDiscount)` 상한 제한
   - 테스트: value=5,000, maxDiscount=3,000 → 3,000 적용 ✓
3. **maxDiscount**: 할인액 상한 적용
   - 테스트: maxDiscount 제약 검증 ✓
4. **minOrder**: 기준액 < minOrder이면 미적용 (에러 아님)
   - 테스트: minOrder 충족/미충족 시 분기 정확 ✓
5. **상품 쿠폰 기준액**: `unitPrice × quantity` 계산
   - 테스트: 5,000 × 2 = 10,000 기준액 ✓
6. **주문 쿠폰 기준액**: `subtotal - totalProductDiscount` 계산
   - 테스트: 20,000 - 2,000 = 18,000 기준액, 주문쿠폰 1,800 적용 ✓
7. **적용 순서**: applyProductCoupons → applyOrderCoupon 순차 실행
   - 테스트: 상품쿠폰 먼저 적용, 주문쿠폰은 차감 후 기준액 사용 ✓
8. **상품당 1장**: checkCouponDuplicates에서 E8 검사
   - 테스트: 같은 sku 2장 → "같은 상품에 상품쿠폰은 1장만 사용 가능합니다" ✓
9. **주문당 1장**: checkCouponDuplicates에서 E9 검사
   - 테스트: 주문쿠폰 2장 → "주문쿠폰은 1장만 사용 가능합니다" ✓
10. **상품쿠폰 검증**: sku 필수 (E6), 장바구니 있으면 적용 (없으면 continue)
    - 테스트: sku 없음 에러, 없는 상품 미적용 ✓
11. **결과**: discount = 상품 + 주문, shipping = 할인 후 기준
    - 테스트: 배송비 정책 통합 검증 ✓
12. **빈 장바구니**: `items.length === 0` 체크, 모두 0 반환
    - 테스트: empty_cart_with_coupons → {subtotal:0, discount:0, shipping:0, total:0} ✓

#### 에러 조건 검증
- E1 (type): "쿠폰 타입이 유효하지 않습니다" ✓
- E2 (scope): "쿠폰 범위가 유효하지 않습니다" ✓
- E3 (value): "쿠폰 할인값이 유효하지 않습니다" (음수, 정수 아님, 정률 100 초과) ✓
- E4 (maxDiscount): "최대 할인액이 음수일 수 없습니다" (음수, 정수 아님) ✓
- E5 (minOrder): "최소 주문액이 음수일 수 없습니다" (음수, 정수 아님) ✓
- E6 (상품 sku): "상품쿠폰은 sku가 필수입니다" ✓
- E7 (주문 sku): "주문쿠폰은 sku를 가질 수 없습니다" ✓
- E8 (상품 중복): "같은 상품에 상품쿠폰은 1장만 사용 가능합니다" ✓
- E9 (주문 중복): "주문쿠폰은 1장만 사용 가능합니다" ✓
- E10 (id 중복): "같은 쿠폰을 중복으로 사용할 수 없습니다" ✓
- E11 (할인액 초과): "할인액이 기준액을 초과할 수 없습니다" ✓

#### 테스트 커버리지
- 정률 쿠폰: 2개 (기본, 버림) ✓
- 정액 쿠폰: 2개 (기본, maxDiscount) ✓
- 상품/주문 쿠폰 기준액: 2개 ✓
- 적용 순서: 1개 ✓
- 중복 제한: 3개 (상품, 주문, id) ✓
- minOrder: 4개 (충족·미충족 상품·주문) ✓
- value 유효성: 4개 (정률 범위, 정액 범위, 할인액 초과 상품·주문) ✓
- 유효성 검사 E1~E7: 7개 ✓
- 정수값 검증: 3개 (value, maxDiscount, minOrder) ✓
- 통합 테스트: 4개 (복합 시나리오, 배송비 정책) ✓
- 엣지 케이스: 6개 (빈 장바구니, 없는 상품, 경계값, 수량) ✓
- 불변성: 3개 (items, coupons, 결정성) ✓
- 배송비 정책: 1개 ✓
- 상품·주문 쿠폰 조합: 3개 ✓
- 여러 상품 쿠폰: 1개 ✓
- 최종 계산: 2개 ✓
- **총 48개** (SDD 요구 40개 초과, 모두 PASS) ✓

#### 경계값 검증
- 정률 쿠폰 버림: 9,999 × 10% = 999 (floor) ✓
- minOrder 경계값: 정확히 같으면 충족, 미만이면 미적용 ✓
- 정액 쿠폰 maxDiscount: min(value, maxDiscount) 적용 ✓
- 할인액 > 기준액: E11 에러 발생 ✓
- 배송비 무료 경계: 50,000 미만 3,000, 이상 0 ✓
- value=0: 유효, 할인 없음 ✓

#### 불변성 검증
- items 미수정: JSON 직렬화 비교로 동일성 확인 ✓
- coupons 미수정: JSON 직렬화 비교로 동일성 확인 ✓
- 결정성: 동일 입력 × 3회 호출 시 결과 동일 ✓

#### 코드 품질
- TypeScript Typecheck: PASS ✓
- 단위 테스트 141개: ALL PASS (coupon 48개 포함) ✓
- pnpm check: ALL PASS (Typecheck, Tests, Lockfile, Task records) ✓
- 입력 readonly 선언: `readonly LineItem[]`, `readonly Coupon[]` ✓
- 순수 함수: 입력 변경 없음, 부수 효과 없음 ✓

## 최종 판정

**APPROVED** — 모든 요구사항 충족

- **인터페이스**: Coupon, CouponError, priceWithCoupons 정의 완료
- **규칙 준수**: 12개 규칙 + 11개 에러 조건 모두 구현, 정수 검증 포함
- **테스트**: 48개 테스트 모두 통과 (SDD 40개 요구 초과)
- **품질**: TypeScript, pnpm check ALL PASS, 불변성·순수성 검증 완료
- **기능 정확성**: 할인 계산(정률/정액), 기준액(상품/주문), 적용 순서, 배송비 정책 모두 정확
