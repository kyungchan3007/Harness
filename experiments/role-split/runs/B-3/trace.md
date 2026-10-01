# 0030 — 쿠폰 적용 기능 — Trace

## 설계 결정 기록

### 1. domain.md에 쿠폰 규칙 12개 정의

**요청:** "모든 규칙 12개를 테스트로 검증"

**판단 과정:**
- 사용자가 제시한 요구사항 10개 항목을 domain.md 규칙으로 체계적으로 변환
- 규칙 1~2: 쿠폰 scope/type 정의 (조합 4가지)
- 규칙 3~5: 필드 정의 (sku, value 범위, 조건 필드)
- 규칙 6~7: 중복 제약 (SKU당 1장, 주문당 1장)
- 규칙 8: 적용 순서
- 규칙 9~10: 계산 로직 (정률/정액, maxDiscount)
- 규칙 11: minOrder 미충족 처리
- 규칙 12: 할인 합산

**결과:** 규칙 1~12를 domain.md에 추가했으며, 각각 테스트 1개 이상으로 검증 가능하게 설계

### 2. 함수 시그니처 고정

**요청:** "서명은 sdd.md와 정확히 일치"

```ts
export function priceWithCoupons(
  items: readonly LineItem[],
  coupons: readonly Coupon[],
  shippingPolicy?: ShippingPolicy,
): PriceBreakdown;
```

**판단:**
- 0002의 `priceCart(items, options, shippingPolicy)` 패턴을 따름
- 할인 금액 계산을 함수 내부에서 한 후 `priceCart` 호출
- 반환값은 동일 구조 유지 (이미 정의된 `PriceBreakdown`)

**이유:** 0002와의 일관성 + 역할 분리 (쿠폰 → 가격)

### 3. 정액 쿠폰의 기준금액을 scope별로 분리

**요청:** "정액 쿠폰은 기준 금액을 초과할 수 없음"

**모호성:** "기준 금액"이 scope="item"과 scope="order"에서 다를 수 있음

**판단:**
- `scope="item"`: 해당 상품의 합계 (그 상품의 쿠폰만 적용)
- `scope="order"`: 상품 쿠폰 할인 후 금액 (주문 전체에 영향)

**이유:**
- 실무 규칙: 상품 쿠폰 → 주문 쿠폰 순서 적용
- 주문 쿠폰이 상품 쿠폰 할인을 고려하지 않으면 할인 중복이 부자연스러움
- 규칙 10에서 "기준금액은 scope별로 다르다"고 명시

### 4. minOrder 미충족은 오류가 아니라 할인 0원

**요청:** "minOrder 미충족 쿠폰은 오류가 아니라 적용하지 않음"

**대안 검토:**
- A (선택됨): 할인 0원, 오류 없음. 사용자는 쿠폰을 담을 수 있지만 활성화 안 됨
- B: 예외 던짐. 엄격하지만 UX 악화

**이유:** prd에서 명시적으로 "오류 아님"

### 5. 정률 쿠폰 계산은 floor (반올림 X)

**요청:** "정률 쿠폰의 원 미만은 버림"

**판단:**
```ts
discount = Math.floor(subtotal × value / 100)
```

**이유:** 한국 실무 표준 + 규칙 명시

### 6. 쿠폰 중복 처리: 첫 번째만 적용

**요청:** "상품 쿠폰은 SKU당 1장, 주문 쿠폰은 1장까지만 가능"

**구현:**
- 입력 배열에서 SKU/주문별로 첫 번째 쿠폰만 추출
- 나머지는 무시 (오류 X)

**대안:**
- 모두 합산: 할인 누적으로 규칙 복잡도 증가, 0030 범위 초과
- 명시적 거부: 엄격하지만 사용자 입장에서는 불편

**이유:** "최대 1장"을 우호적으로 해석 (첫 번째 우선)

### 7. 정액 쿠폰의 할인이 maxDiscount를 초과하지 않도록

**요청:** "할인 상한(maxDiscount)"

**판단:**
```ts
adjustedDiscount = Math.min(value, maxDiscount || value)
```

**이유:** 정액 쿠폰이 원래 금액(value)인데, maxDiscount로 제한 가능

### 8. 테스트 추적 전략

**판단:**
- 테스트 함수명에 규칙 번호 명시 (e.g., `test('rule 1: scope validation')`)
- domain.md의 규칙 번호와 테스트 번호 1:1 대응
- 0002 방식 따르기

**이유:** 게이트 검증 + 수동 추적 용이

### 9. priceWithCoupons는 순수 함수

**판단:** 외부 상태 의존 X, 동일 입력 → 동일 출력

**이유:** 0002의 priceCart 패턴 유지 + 테스트 용이성

## 미해결 질문 & 향후 개선

1. **CouponError 타입:** 검증 실패 시 어떤 정보를 던질지? (필드, 값, 이유)
   - 현재: 기본 Error 메시지만 사용
   - 개선: 0031에서 더 세밀한 오류 분류 (CouponValidationError, CouponConflictError 등)

2. **성능:** 쿠폰 배열이 크면 O(n) 필터링이 여러 번 실행됨
   - 현재: 충분 (실무 쿠폰 개수는 보통 < 10)
   - 개선: 0031에서 indexing 고려

3. **부동소수점 안정성:** rate 계산에서 부동소수점 오류 가능성
   - 현재: floor로 정수 보장
   - 한계: 매우 큰 금액에서 오류 가능성 (하지만 이미 0002에서 number 선택)

## 디자인 문서 완성도

- [x] domain.md 규칙 1~12 정의 (이제 build 단계에서 구현)
- [x] 함수 시그니처 고정 (sdd.md)
- [x] 알고리즘 명시
- [x] 에러 처리 정책
- [x] 트레이드오프 기록
- [x] 테스트 전략 개요

## 구현 과정 (PLAN → BUILD → VERIFY)

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | PLAN | domain.md 규칙 1~12 정의, sdd.md에서 함수 시그니처 및 알고리즘 확정 | prd의 요구사항을 체계적으로 규칙으로 변환 |
| 2 | BUILD | src/pricing/coupon.ts: Coupon 인터페이스, CouponError, priceWithCoupons 함수 구현 | validateCoupons와 calculateDiscount 헬퍼함수로 역할 분리 |
| 3 | BUILD | src/pricing/coupon.test.ts: 규칙 1~12 각각 매핑된 42개 테스트 작성 | 경계값, 에러케이스, 상품+주문 쿠폰 조합 모두 포함 |
| 4 | BUILD | TypeScript exactOptionalPropertyTypes 오류 해결: options 객체 조건부 구성 | shippingPolicy가 undefined가 아닐 때만 추가 |
| 5 | BUILD | 테스트 로직 오류 수정: (30,000-15,000=15,000) < 50,000 배송비 3,000 | 주석과 예상값 일치 확인 |
| 6 | BUILD | trace.md에 구현 기록 및 과정 테이블 추가 | 결정사항과 문제 해결 과정 기록 |
| 7 | VERIFY | pnpm check: Typecheck ✅, Unit tests 135/135 ✅, Task records ✅ | 모든 게이트 통과 |

## 구현 기록 (BUILD)

### 1. src/pricing/coupon.ts 구현

**완료 항목:**
- [x] Coupon 인터페이스 정의 (scope, sku, type, value, maxDiscount, minOrder)
- [x] CouponError 클래스 정의
- [x] priceWithCoupons 함수 구현

**핵심 알고리즘:**
1. 빈 장바구니 체크: items.length === 0이면 early return
2. 입력 검증: validateCoupons() 함수에서 모든 규칙 1~11 검증
   - scope/type 값 검증
   - scope=item이면 sku 필수, scope=order이면 sku 없어야 함
   - type=rate이면 value 1~100, type=fixed이면 value >= 1
   - maxDiscount/minOrder는 음이 아닌 정수
   - 장바구니에 없는 SKU 거부
   - 중복 검사: SKU당 최대 1개의 상품 쿠폰, 최대 1개의 주문 쿠폰
3. 상품 쿠폰 적용: 첫 번째 쿠폰만 선택 (SKU당 최대 1개 보장)
4. 주문 쿠폰 적용: 첫 번째 쿠폰만 선택
5. calculateDiscount() 헬퍼함수: type별 계산 + maxDiscount 적용
6. priceCart() 호출: 총 할인액 계산 및 배송비 결정

**구현 결정사항:**
- minOrder 미충족: 할인 0원, 오류 없음 (for 루프에서 continue)
- 정률 계산: Math.floor 사용 (소수점 버림)
- 정액 한도: Math.min(value, baseAmount) (기준금액 초과 방지)
- maxDiscount: Math.min(discount, maxDiscount) (할인 상한)
- 주문 쿠폰 기준금액: subtotal - 상품쿠폰할인액 (규칙 10 적용)

### 2. src/pricing/coupon.test.ts 작성

**규칙별 테스트 대응:**
- rule-1: scope/type 필드 정의 + 잘못된 값 거부
- rule-2: scope=item이면 sku 필수
- rule-3: scope=order이면 sku 없음
- rule-4: type=rate 1~100, floor 계산
- rule-5: type=fixed >= 1, 기준금액 초과 방지
- rule-6: maxDiscount 상한 적용
- rule-7: minOrder 미충족은 할인 0원 (오류 아님)
- rule-8: 상품 쿠폰 SKU당 최대 1장
- rule-9: 주문 쿠폰 최대 1장
- rule-10: 상품 쿠폰 → 주문 쿠폰 순서 적용
- rule-11: 유효성 검증 (value 범위, 음수 거부, 없는 SKU)
- rule-12: discount 합산, 배송비는 최종 할인 후 기준

**테스트 통계:**
- 총 42개 테스트 (정상케이스 + 경계값 + 에러케이스 포함)
- 각 규칙당 평균 2~4개 서브테스트
- 특별 케이스: 빈 장바구니, readonly 배열 검증

### 3. 마주친 문제와 해결

**문제 1: TypeScript exactOptionalPropertyTypes**
- 원인: PriceOptions가 `shippingPolicy?: ShippingPolicy`인데, undefined를 명시적으로 전달
- 해결: shippingPolicy가 undefined가 아닐 때만 options 객체에 추가

**문제 2: 테스트 로직 오류**
- 원인: 주석과 예상값이 일치하지 않음 (30,000 - 15,000 = 15,000 < 50,000 이므로 배송비 3,000)
- 해결: 예상값을 3,000으로 수정, 배송비 및 총액 검증 추가

**문제 3: 헬퍼함수 sku 전달**
- 원인: 조건부로 sku를 추가하는 함수에서 TypeScript strict 모드 오류
- 해결: 먼저 coupon 객체를 생성한 후 조건에 따라 sku 추가 (union type 회피)

### 4. 검증 완료

**pnpm check 결과:**
- [x] Typecheck: 모든 타입 오류 해결
- [x] Unit tests: 42/42 PASS
- [x] No npm/yarn lockfiles: OK
- [x] Task records: trace.md 구현 기록 추가

## 검증 과정 (VERIFY) — 검사자 기록

### 1차 검증 · 2026-10-01

**검증 방식:** 요구사항·규칙 대비 구현 검사, 테스트 실행, 경계값 검증

**확인한 항목:**

1. **domain.md 규칙 1~12 확인** ✓
   - agents/context/domain.md 라인 30-43에 12개 쿠폰 규칙 모두 정의됨
   - 규칙 1-2: scope(item|order), type(rate|fixed), value, sku 필드
   - 규칙 3-5: scope별 sku 요구사항, type별 value 범위, 계산 방식
   - 규칙 6-7: maxDiscount, minOrder 조건
   - 규칙 8-9: 중복 제약 (SKU당 1장, 주문당 1장)
   - 규칙 10-12: 적용 순서, 유효성, 합산

2. **함수 시그니처 일치 확인** ✓
   - sdd.md: `priceWithCoupons(items, coupons, shippingPolicy?): PriceBreakdown`
   - coupon.ts (line 26-30): 정확히 일치

3. **테스트-규칙 대응 확인** ✓
   - coupon.test.ts: 규칙 1~12 각각 describe 블록으로 구성
   - 42개 테스트, 평균 3.5개/규칙
   - 정상·경계·에러 케이스 모두 포함

4. **구현 로직 검증** ✓
   - validateCoupons(): 규칙 1-3, 4-5, 6-7, 8-9, 11 검증 (line 108-180)
   - 상품 쿠폰 필터링: SKU당 1개 보장 (line 45-56)
   - 주문 쿠폰 필터링: 1개만 선택 (line 58-67)
   - calculateDiscount(): 정률(floor)/정액(min), maxDiscount 적용 (line 185-202)
   - 적용 순서: 상품 → 주문 (line 69-95)
   - priceCart() 호출 (line 97-102)

5. **테스트 실행** ✓
   - `pnpm test`: 135 tests passed (11 files)
   - coupon.test.ts 42개 테스트 모두 PASS

6. **게이트 통과** ✓
   - Typecheck: PASS
   - Unit tests: 135/135 PASS
   - No npm/yarn lockfiles: PASS
   - Task records: prd.md, sdd.md, trace.md 완성

7. **경계값 검증** ✓
   - Rule-4 floor: 10,001 × 33% = 3,300.33 → 3,300 (테스트: line 97-109)
   - Rule-5 기준금액: fixed 15,000 on 10,000 → 10,000 (테스트: line 131-143)
   - Rule-6 maxDiscount: rate 50% (5,000) + maxDiscount 3,000 → 3,000 (테스트: line 147-159)
   - Rule-7 minOrder: 10,001 > 10,000 → discount 0 (테스트: line 174-210)
   - Rule-10 순서: item 5,000 + order (15,000-5,000)×50% = 10,000 (테스트: line 243-262)
   - Rule-12 배송비: (subtotal-discount=50,000) → shipping 0 (테스트: line 300-313)
   - Empty cart: {subtotal:0, discount:0, shipping:0, total:0} (테스트: line 327-333)

8. **부작용 검증** ✓
   - readonly 배열 준수: 원본 수정 없음 (테스트: line 357-365)
   - 정수 금액: Math.floor 사용으로 부동소수점 오류 방지

**판정:** approved
- 모든 12개 규칙이 정확히 구현되고 테스트됨
- 함수 시그니처가 설계 문서와 일치
- 모든 게이트 통과
- 경계값 및 부작용 검증 완료
