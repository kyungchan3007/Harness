# 0030 — 쿠폰 적용 — Trace

## 설계 판단

### 1. 규칙 해석: minOrder 미충족 시 오류 vs 무시

**요구사항:** "조건에 못 미치면 오류가 아니라 그 쿠폰만 적용하지 않습니다(할인 0원)"

**판단:** 무시하고 할인 0으로 처리, 오류 발생 안 함

**이유:**
- 명시적 언어: "오류가 아니라"
- UX: 사용자가 여러 쿠폰을 준비했을 때 일부가 조건을 못 충족해도 나머지는 적용되어야 함
- 구현: 전체 유효성 검증 후 각 쿠폰마다 조건 체크 로직 분리

---

### 2. 기준금액 계산: 상품 vs 주문 쿠폰

**규칙 5:** "상품 쿠폰의 기준 금액은 대상 상품 줄의 금액(unitPrice × quantity)입니다. 개당이 아니라 줄 금액에 한 번 계산합니다."

**규칙 6:** "주문 쿠폰의 기준 금액은 `상품 합계 − 상품 쿠폰 할인 합계`입니다."

**판단:** 
- 상품 쿠폰: 줄 단위 (lineItem.unitPrice × lineItem.quantity)
- 주문 쿠폰: subtotal에서 모든 상품 쿠폰 할인을 뺀 금액

**이유:**
- 명확한 계층: 상품→주문 순서는 기준금액 계산 순서도 정함
- 배송비와의 구분: 배송비는 "할인 후 금액"을 기준으로 계산 (규칙 10)

---

### 3. 적용 순서: 규칙 7의 "상관없이"

**규칙 7:** "적용 순서는 목록 순서와 상관없이 상품 쿠폰을 모두 적용한 뒤 주문 쿠폰을 적용합니다."

**판단:** coupons 배열의 순서를 무시하고 type별로 정렬해서 적용

**이유:**
- 명시적 명령: "상관없이", "모두 적용한 뒤"
- 일관성: 쿠폰 할인액이 배열 순서에 영향받지 않으므로 예측 가능

**구현 전략:**
```
1. coupons를 scope별로 필터링
   - itemCoupons = [scope === "item"]
   - orderCoupons = [scope === "order"]
2. itemCoupons를 sku별로 그룹화
3. 각 sku의 할인액 계산
4. 주문 쿠폰 기준금액 = subtotal - 상품할인합계
5. 각 주문 쿠폰의 할인액 계산
```

---

### 4. 중복 제한: 규칙 8의 "sku당 1장"

**규칙 8:** "상품 쿠폰은 sku당 1장, 주문 쿠폰은 1장까지만 쓸 수 있습니다."

**판단:**
- 상품 쿠폰: Map<sku, Coupon>으로 집계, 2개 이상이면 CouponError
- 주문 쿠폰: 배열 필터링으로 1개 이상이면 CouponError

**이유:**
- 상품 쿠폰은 물리적으로 같은 상품에만 적용 가능 (중복 방지)
- 주문 쿠폰은 전체 주문에 한 번만 (누적 방지)

---

### 5. 값 검증: 정율 vs 정액

**규칙 9:** 
- 정률 value: 1~100의 정수
- 정액 value: 1 이상의 정수
- maxDiscount, minOrder: 0 이상의 정수

**판단:** 모든 값을 먼저 검증, 실패 시 즉시 CouponError

**이유:**
- 빠른 실패: 계산 전에 입력 오류 감지
- 일관성: 모든 쿠폰을 동일한 기준으로 검증

---

### 6. 정률 할인에서 원 미만 처리

**규칙 1:** "원 미만은 버립니다"

**판단:** Math.floor 사용, 절대 반올림하지 않음

**예:**
- 10% × 999원 = 99.9원 → 99원
- 10% × 1000원 = 100원

**이유:**
- "버린다" = floor 연산
- 할인은 소비자 유리이므로 버림이 아닌 올림은 정책 위반

---

### 7. 빈 장바구니: 규칙 11

**규칙 11:** "장바구니가 비어 있으면 쿠폰을 보지 않고 모든 금액 0을 돌려줍니다."

**판단:** items.length === 0이면 모든 쿠폰 무시, PriceBreakdown 반환 {subtotal: 0, discount: 0, shipping: 0, total: 0}

**이유:**
- 명시적: 쿠폰도 무시
- 실용성: 빈 장바구니에 쿠폰 적용하려는 건 논리 오류

---

### 8. 입력 보호: 규칙 12

**규칙 12:** "넘겨받은 items·coupons를 바꾸지 않습니다"

**판단:** readonly 배열, 내부 계산은 새 변수 사용

**이유:**
- 함수형 프로그래밍: 입력을 변경하지 않는 순수 함수
- 버그 방지: 호출자가 같은 배열을 다시 쓸 때 부작용 없음

---

## 테스트 커버리지 검토

### 유효성 검증 (7개)
- ✓ 정률 value 1~100 범위 검증
- ✓ 정액 value ≥1 검증
- ✓ maxDiscount, minOrder ≥0 검증
- ✓ 상품 쿠폰 필수 sku 검증
- ✓ 존재하지 않는 sku 검증
- ✓ 빈 장바구니 처리
- ✓ 정수 타입 검증

### 쿠폰 제한 (3개)
- ✓ sku당 상품 쿠폰 1장 제한
- ✓ 주문 쿠폰 1장 제한
- ✓ 혼합 쿠폰 (상품 2개 + 주문 1개 등)

### 할인 계산 (9개)
- ✓ 정률 100%, 50%, 부분 (10%)
- ✓ 정률 + 버림 (999원 × 10%)
- ✓ 정률 + maxDiscount
- ✓ 정액 기준금액까지만
- ✓ 정액 + maxDiscount
- ✓ 정액 기준금액 초과 제한
- ✓ 기준금액 0인 상품 (unitPrice=0)
- ✓ minOrder 미충족 (할인 0)
- ✓ minOrder 충족 (정상 할인)

### 적용 순서 (2개)
- ✓ 상품 쿠폰 → 주문 쿠폰 순서
- ✓ 주문 쿠폰의 기준금액 (상품할인 후)

### 배송비 (1개)
- ✓ 할인 후 금액 50000원 이상 무료
- ✓ 할인 후 금액 50000원 미만 3000원

**총 22개 테스트 케이스**

---

## 구현 기록

| 날짜 | 항목 | 한 일 | 결과 |
| --- | --- | --- | --- |
| 2026-10-01 | coupon.ts 구현 | priceWithCoupons 함수 (2단계 할인: 상품→주문), validateCoupon, calculateDiscount, calculateDiscounts 함수 구현; Math.floor로 정률 버림 처리 | src/pricing/coupon.ts 완성 |
| 2026-10-01 | 테스트 작성 | 22개 테스트 케이스 작성: 유효성(7), 제약(3), 계산(9), 적용순서(2), 배송비(1) | src/pricing/__tests__/coupon.test.ts 완성 |

## 검증 기록 (2026-10-01)

### 검사자: 판정

#### 1단계: 요구사항 분석
- request.md 12개 규칙 읽음
- prd.md 완료 조건 18개 확인
- domain.md 쿠폰 규칙 재확인
- 핵심: "이름·타입을 바꾸지 마세요" — 정확한 시그니처 요구

#### 2단계: 구현 검토
```
src/pricing/coupon.ts 분석:
- Coupon 인터페이스: maxDiscount/minOrder 타입이 Won이 아닌 number 사용 (타입 위반)
- priceWithCoupons 함수: 
  * 파라미터: coupons = [] (기본값 추가)
  * 3번째 파라미터: options 객체 (shippingPolicy 직접 파라미터 아님)
  * 규칙: "이름·타입 바꾸지 마세요" 명시적 위반
```

#### 3단계: 기능 테스트
- pnpm check 실행: ✓ ALL PASS
  - TypeCheck: ✓ PASS
  - Unit Tests: ✓ 117개 ALL PASS
  - Task Records: ✓ PASS

#### 4단계: 규칙별 로직 검증

**통과한 규칙들:**
1. Rule 1: Math.floor 구현 (라인 43) — 정률 원 미만 버림 ✓
2. Rule 2: Math.min 구현 (라인 46) — 정액 기준금액 상한 ✓
3. Rule 3: maxDiscount 상한 (라인 49-51) ✓
4. Rule 4: minOrder 미충족 → 할인 0 (라인 142-145, 163-166) — 오류 없음 ✓
5. Rule 5: 상품 쿠폰 기준금액 (라인 139) — unitPrice × quantity ✓
6. Rule 6: 주문 쿠폰 기준금액 (라인 160) — subtotal - 상품할인합 ✓
7. Rule 7: 상품→주문 순서 (라인 114-171) ✓
8. Rule 8: 중복 제약 (라인 126-156) — sku당 1장, 주문 1장 ✓
9. Rule 9: 검증 (라인 59-89) — 정율/정액/maxDiscount/minOrder ✓
10. Rule 10: discount 합계 (라인 173) — 상품+주문 ✓
11. Rule 11: 빈 장바구니 (라인 196-198) — 모든 금액 0 ✓
12. Rule 12: readonly 배열 — 배열 수정 불가 ✓

**기능은 모두 정상이나 인터페이스 위반**

#### 5단계: 판정
- 기능: 완벽 (모든 규칙 정확히 구현, 테스트 117개 모두 통과)
- 인터페이스: 위반 (함수 시그니처, Coupon 타입 구조)
- 결론: **Rejected** — 기능은 정확하나 spec compliance 위반

#### 6단계: verdict.md 작성
- 반려 사유: 함수 시그니처 변경, 파라미터 구조 변경, 타입 사용 오류
- 수정 요청사항 3가지:
  1. priceWithCoupons 함수 시그니처를 (items, coupons, shippingPolicy?) 형태로 정확히 변경
  2. coupons 파라미터에서 기본값 제거
  3. Coupon 인터페이스에서 number 대신 Won 타입 사용
- 근거 및 테스트 결과 기록

## 수정 기록 (2026-10-01, Verifier 피드백 반영)

| 항목 | 이전 | 이후 | 이유 |
| --- | --- | --- | --- |
| Coupon.maxDiscount | number | Won | 모든 금액은 Won 타입 (domain.md) |
| Coupon.minOrder | number | Won | 모든 금액은 Won 타입 (domain.md) |
| priceWithCoupons 매개변수 1 | items | items | 변경 없음 |
| priceWithCoupons 매개변수 2 | coupons: readonly Coupon[] = [] | coupons: readonly Coupon[] | 기본값 제거 (필수 파라미터) |
| priceWithCoupons 매개변수 3 | options: PriceWithCouponsOptions = {} | shippingPolicy?: ShippingPolicy | request.md 원문과 정확히 일치 |

**변경 후:**
- ✅ pnpm check ALL PASS (Typecheck, 117개 테스트)
- ✅ Coupon 인터페이스: request.md 라인 15-28과 정확히 일치
- ✅ priceWithCoupons 시그니처: request.md 라인 32-36과 정확히 일치
- ✅ 모든 기능 정상 (12개 규칙 정확히 구현)

## 최종 검증 기록 — 2차 판정 (2026-10-01)

### 검사자: 2차 검증

#### 1단계: 시그니처 재검증

**request.md 요구사항:**
```
export interface Coupon {
  scope: "item" | "order";
  sku?: string;
  type: "rate" | "fixed";
  value: number;
  maxDiscount?: Won;
  minOrder?: Won;
}

export function priceWithCoupons(
  items: readonly LineItem[],
  coupons: readonly Coupon[],
  shippingPolicy?: ShippingPolicy,
): PriceBreakdown;
```

**실제 구현 (src/pricing/coupon.ts):**
- ✓ 라인 14-27: Coupon 인터페이스 정확 일치 (maxDiscount?: Won, minOrder?: Won)
- ✓ 라인 190-194: priceWithCoupons 시그니처 정확 일치

#### 2단계: 12개 규칙 최종 로직 검증

1. **정률 할인:** 라인 49 `Math.floor((baseAmount * coupon.value) / 100)` ✓
2. **정액 할인:** 라인 52 `Math.min(coupon.value, baseAmount)` ✓
3. **maxDiscount:** 라인 55-57 할인액 상한 적용 ✓
4. **minOrder 미충족:** 라인 148, 169 조건부 할인 0 ✓
5. **상품 쿠폰 기준금액:** 라인 145 `unitPrice × quantity` ✓
6. **주문 쿠폰 기준금액:** 라인 166 `subtotal - totalItemDiscount` ✓
7. **적용 순서:** 라인 119-156 상품 먼저, 164-177 주문 나중 ✓
8. **상품 쿠폰 제한:** 라인 133-135 CouponError ✓
9. **주문 쿠폰 제한:** 라인 160-162 CouponError ✓
10. **장바구니에 없는 상품:** 라인 128-130 CouponError ✓
11. **값 검증:** 라인 65-95 validateCoupon 완벽 검증 ✓
12. **discount 합계:** 라인 179 totalItemDiscount + totalOrderDiscount ✓

#### 3단계: 테스트 커버리지 최종 확인

```
pnpm exec vitest run src/pricing/__tests__/coupon.test.ts
Test Files  1 passed (1)
Tests  24 passed (24)
```

**테스트 케이스 매핑:**
- 유효성 검증 (7): value 범위, maxDiscount/minOrder 정수, sku 필수, 빈 장바구니
- 제약 조건 (3): sku당 1장, 주문 쿠폰 1장, 존재하지 않는 sku
- 할인 계산 (9): 정률 100%/50%/10% + 버림, maxDiscount, 정액, minOrder 충족/미충족
- 적용 순서 (2): 상품→주문, 다중 상품 쿠폰
- 배송비 (1): 할인 후 금액 기준
- 통합 (2): 쿠폰 없음, 정액+maxDiscount, 복합 할인

#### 4단계: pnpm check 최종 확인

```
════════════════════════════════════════
 harness-lab 완료 게이트
════════════════════════════════════════

▶ Typecheck: ✅ PASS
▶ Unit tests: ✅ PASS (117 passed)
▶ No npm/yarn lockfiles: ✅ PASS
▶ Task records: ✅ PASS

결과: ✅ ALL PASS — 완료 선언 가능
════════════════════════════════════════
```

#### 5단계: domain.md 규칙 최종 대조

**agents/context/domain.md 라인 30-78 쿠폰 규칙:**
- ✓ Coupon 인터페이스: scope, type, value, maxDiscount?, minOrder?
- ✓ 할인 계산: 정률/정액/maxDiscount/minOrder 모두 정확
- ✓ 기준 금액: 상품 쿠폰 (unitPrice × quantity), 주문 쿠폰 (subtotal - 상품할인)
- ✓ 적용 순서: 상품 쿠폰 모두 → 주문 쿠폰
- ✓ 제약: 상품 sku당 1장, 주문 1장, 존재하지 않는 sku, 빈 장바구니
- ✓ 검증 오류: 정률/정액/maxDiscount/minOrder/sku 모두 정확
- ✓ 결과 계산: discount 합계, shipping, total 모두 정확

#### 6단계: 최종 판정

**결론: APPROVED**

이유:
1. 시그니처: request.md 요구사항과 정확히 일치
2. 규칙: 12개 규칙 완벽하게 구현
3. 테스트: 24개 테스트 ALL PASS
4. 타입체크: Typecheck PASS
5. 게이트: pnpm check ALL PASS (117 tests total)
6. 요구사항: prd.md, request.md, domain.md 모두 충족

공급자의 1차 반려 피드백에 따라 시그니처를 정확히 수정했으므로, 이제 모든 요구사항을 충족합니다.
