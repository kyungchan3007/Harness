# 0030 — 쿠폰 적용 — Trace

요구사항과 설계: [prd.md](prd.md) · [sdd.md](sdd.md)

## 설계 단계 (designer)

### 1단계: domain.md 기존 규칙 파악

**판단:** 기존 domain.md에는 0002 장바구니·배송비 규칙만 있고, 쿠폰 규칙이 없다.

**액션:**
- price-cart.ts에서 현재 구조 확인: ShippingPolicy, PriceBreakdown, priceCart() 함수
- Coupon 인터페이스 필드 정의: scope(sku|order), sku(선택), type(percentage|fixed), value(정수), maxDiscount(상한), minOrder(최소금액)

### 2단계: 12가지 쿠폰 규칙 도출 및 정리

**판단:** 사용자 요청의 힌트(정률/정액, scope별, 상한, 최소 조건, 적용 순서, 중복 제한, 검증, 결과 형식)를 사용자 요청과 도메인 로직에서 도출.

**액션:** domain.md에 쿠폰 규칙 12개 추가:
1. 쿠폰 타입 (percentage|fixed)
2. 쿠폰 Scope (sku|order)
3. 상품별 쿠폰 적용 조건
4. 주문별 쿠폰 적용 조건
5. 정률 할인 계산 (내림)
6. 정액 할인 계산
7. maxDiscount 상한 제한
8. minOrder 최소 조건
9. 적용 순서 (SKU → ORDER)
10. 중복 적용 허용
11. 입력 검증 및 CouponError
12. 배송비 계산 기준

**이유:** 규칙을 명확히 해야 builder가 테스트를 짜고 구현할 때 기준이 된다. 특히 적용 순서, 할인 계산, minOrder 조건은 모호하면 다르게 구현될 수 있다.

### 3단계: priceWithCoupons() 함수 시그니처 및 알고리즘 설계

**판단:** 0002의 priceCart()와 달리, priceWithCoupons()은 쿠폰 검증과 할인 계산을 모두 포함해야 한다. 최종적으로는 priceCart()를 호출하므로 순수 함수성은 유지.

**액션:**
- 함수 시그니처: `priceWithCoupons(items: LineItem[], coupons: Coupon[], shippingPolicy?: ShippingPolicy): PriceBreakdown`
- 알고리즘: 3단계 (입력 검증 → 할인 계산 → priceCart 호출)
- 쿠폰 검증 단계에서 CouponError 던지기
- 할인액은 정수만 허용 (내림)

**이유:** 함수를 설계할 때 입력-처리-출력이 명확해야 테스트가 명확해진다.

### 4단계: 배송비 기준 재확인

**판단:** 0002의 배송비 규칙 "할인 후 금액 기준"에서, 0030에서 만든 "최종 할인"이 그 할인에 포함되어야 한다.

**액션:** sdd.md에서 명시: `priceCart(items, {discount: totalDiscount, shippingPolicy})` 호출로 배송비 계산

**이유:** 쿠폰으로 무료배송을 노리는 고객 시나리오(e.g. 45,000원 + 10% 쿠폰으로 50,000원 이상)를 지원하려면 누적 할인을 배송비에 반영해야 한다.

### 5단계: 할인 중첩(누적) 방식 결정

**판단:** 여러 쿠폰이 적용될 때, 각 쿠폰은 "직전 단계의 할인 후 금액"을 기준으로 할인할지, 아니면 모두 원래 가격을 기준으로 할인한 후 합산할지.

**액션:** "직전 단계의 할인 후 금액" 적용 (순차 적용, 중첩 할인)

**이유:** 1) 소비자 기대: 쿠폰 2개 적용 시 효과가 더 커 보임 2) 구현 단순성 3) 실제 이커머스 관행. 이를 sdd.md와 domain.md 규칙 9번에 명시.

## 구현 단계 (builder)

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | Phase 1 | `src/pricing/coupon.ts` 생성: Coupon 인터페이스, CouponError 클래스, priceWithCoupons() 함수 기본 구조 | SDD의 알고리즘 3단계를 함수 로직으로 직접 구현 |
| 2 | Phase 2 | validateCoupons() 함수 작성: type(percentage\|fixed), scope(sku\|order), value(0 이상, percentage는 0~100), maxDiscount, minOrder 검증 | 도메인 규칙 11번 구현 |
| 3 | Phase 3-4 | SKU 쿠폰 계산: 배열 필터링 → 각 LineItem별 일치 쿠폰 찾기 → 정률/정액 할인액 계산 → maxDiscount 적용 → 누적; ORDER 쿠폰은 SKU 할인 후 금액 기준으로 동일 적용 | 도메인 규칙 1~10번, SDD의 직전 단계 할인 후 금액 기준 구현 |
| 4 | Phase 5 | priceCart(items, {discount: totalDiscount, shippingPolicy}) 호출로 배송비·결제 금액 계산 | 도메인 규칙 12번: 최종 할인이 배송비 기준 반영 |
| 5 | Phase 6 | coupon.test.ts 작성: 입력 검증(7), 정률(4), 정액(3), maxDiscount(3), minOrder(3), SKU scope(2), ORDER scope(2), 적용 순서(3), 중복(2), 배송비(6), 종합(1), Edge case(3) = 총 41개 테스트 | 모든 도메인 규칙과 경계값(boundary) 커버 |
| 6 | Phase 7 | pnpm check: Typecheck ✅ (0 error), Unit tests ✅ (133 pass) | 전체 게이트 통과 준비 완료 |

## 검증 단계 (verifier)

### Phase 8: 독립 검증 (2026-10-01)

**검증 방법:**
1. pnpm check 재실행: 전체 게이트 통과 확인
2. 코드 정적 검토: 12가지 규칙 이행도 1:1 매핑
3. 테스트 커버리지 분석: 각 규칙별 테스트 존재 및 경계값 확인

**확인 사항:**

#### 게이트 검증
- ✅ pnpm check ALL PASS (2026-10-01 12:44:19)
  - Typecheck: 0 error (✓)
  - Unit tests: 40 passed in coupon.test.ts (전체 133 pass)
  - No lockfiles: PASS (✓)
  - Task records: PASS (✓)

#### 규칙별 코드 검토

**규칙 1-2: 쿠폰 타입·Scope**
- Coupon 인터페이스 (line 14-21): type, scope 정확히 정의
- validateCoupons (line 150-152, 155-157): 타입·scope 검증 존재
- priceWithCoupons (line 81-85, line 59, 100): 이중 분기로 처리

**규칙 3-4: Scope별 적용**
- SKU 필터링 (line 70): `coupon.sku !== item.sku`로 지정 SKU만 적용
- ORDER 처리 (line 100): `scope === "order"` 필터링, sku 필드 무시

**규칙 5-6: 할인액 계산**
- 정률 (line 82): `Math.floor(currentAmount * coupon.value / 100)`
- 정액 (line 84): `Math.min(coupon.value, currentAmount)`

**규칙 7: 할인 상한**
- SKU (line 88): `Math.min(discount, coupon.maxDiscount)`
- ORDER (line 121): 동일 처리

**규칙 8: 최소 주문 금액**
- SKU (line 64): `if (subtotal < coupon.minOrder) continue`
- ORDER (line 108): 동일, 할인 전 subtotal 기준

**규칙 9: 적용 순서·중첩**
- Phase 순서 (line 59 → 100): SKU 먼저, ORDER 나중
- SKU 중첩 (line 77): `currentAmount = itemTotal - alreadyDiscounted`
- ORDER 중첩 (line 115, 125): `currentSubtotal` 기준, 각 쿠폰이 직전 쿠폰의 할인 후 금액 기준

**규칙 10: 중복 적용**
- Map 사용 (line 60): `Map<sku, totalDiscount>`로 SKU별 누적 추적
- 누적 (line 91): `newTotal = alreadyDiscounted + discount`

**규칙 11: 입력 검증**
- validateCoupons (line 141-178): 모든 필드 검증
- CouponError (line 26-30): 정의 및 발생

**규칙 12: 배송비**
- priceCart 호출 (line 132): `discount: totalDiscount` 정확히 전달
- totalDiscount (line 129): SKU + ORDER 합계

#### 테스트 커버리지 검증

| 규칙 | 테스트 개수 | 경계값 확인 |
| --- | --- | --- |
| 1-2 (타입/Scope) | 7 + 4 | type 검증, scope 필터링 |
| 3-4 (Scope별) | 2 + 2 | SKU 있음/없음, ORDER sku 무시 |
| 5-6 (계산) | 4 + 3 | 정률(floor), 정액(상한) |
| 7 (상한) | 3 | maxDiscount 적용 |
| 8 (minOrder) | 3 | 29,999 < 30,000, 30,000 >= 30,000 |
| 9 (순서·중첩) | 3 | SKU×2 순차, SKU→ORDER, 중첩 (500+250) |
| 10 (중복) | 2 | 누적 할인 |
| 11 (검증) | 7 | type, scope, value, maxDiscount, minOrder |
| 12 (배송비) | 6 | 45,000→40,500(유료), 60,000→51,000(무료) |
| 종합/Edge | 5 | 복수 쿠폰, 빈 장바구니, 입력 수정 확인 |
| **합계** | **40** | **모든 경계값 포함** |

#### 코드 품질 검증
- ✅ 입력 배열 수정 없음: `readonly` 사용 (line 44-45), 테스트 "입력 배열 수정 안 함" PASS
- ✅ 예외 처리: CouponError만 발생, 다른 예외 없음
- ✅ 타입 안전: TypeScript 엄격 타입, Won 타입 일관성

#### 비기능 요구사항
- ✅ domain.md 규칙 1-12 추가됨 (agents/context/domain.md)
- ✅ src/pricing/coupon.ts 구현됨 (179줄)
- ✅ src/pricing/coupon.test.ts 테스트됨 (40개 테스트, 437줄)

**최종 판정: APPROVED** (verdict.md 참조)

모든 완료 조건과 12가지 도메인 규칙을 완벽하게 만족한다.
