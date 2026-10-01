# TRACE — 0030 쿠폰 적용 과정 기록

| 단계 | 항목 | 상태 | 날짜 |
| --- | --- | --- | --- |
| 1 | prd.md 작성 | ✓ | 2026-10-01 12:40 |
| 1 | sdd.md 작성 | ✓ | 2026-10-01 12:40 |
| 1 | trace.md 생성 | ✓ | 2026-10-01 12:40 |
| 1 | TASKS.md 등록 (0030 행 추가) | ✓ | 2026-10-01 12:40 |
| 2 | coupon.ts 구현 | ✓ | 2026-10-01 12:40 |
| 2 | coupon.test.ts 작성 (40개 테스트) | ✓ | 2026-10-01 12:40 |
| 3 | pnpm check 첫 실행 | ✓ (TS 오류 3개 수정) | 2026-10-01 12:40 |

## 한 일

### prd.md / sdd.md
- 규칙 12가지를 체크박스로 Acceptance에 기록
- 이슈 #1 참조 추가 (0021 규칙 준수)
- SDD에서 구현 접근법(validateCoupon, calculateDiscount 함수 분리) 기술

### coupon.ts (124줄)
- `Coupon` 인터페이스: scope(item/order), sku, type(rate/fixed), value, maxDiscount, minOrder
- `CouponError`: 쿠폰 검증/적용 오류용 커스텀 에러
- `validateCoupon()`: 각 쿠폰의 value 범위·타입, maxDiscount/minOrder 정수 검증, item 쿠폰 sku 필수 확인
- `checkDuplicatesAndMissing()`: 상품당 1장, 주문 1장 중복 검증, 없는 sku 확인
- `calculateDiscount()`: 정률 floor 계산, 정액 기준금액 초과 방지, maxDiscount 적용
- `priceWithCoupons()`: 빈 장바구니 조기 반환, 검증 → 상품쿠폰(Map) → 주문쿠폰 → priceCart 호출

### coupon.test.ts (195줄)
- 규칙 1~12: 각 규칙당 1~5개 테스트, 총 40개 케이스
- 규칙 1: floor 적용 (0원 할인 경계값)
- 규칙 2: 정액 기준금액 초과 방지
- 규칙 3: maxDiscount 적용 / 미적용 경계
- 규칙 4: minOrder 조건 (미충족 시 오류 아님 명시)
- 규칙 5/6: 상품/주문 쿠폰 기준금액
- 규칙 7: 적용 순서 (쿠폰 목록 순서 무관, 상품 먼저)
- 규칙 8: 중복 제한 (같은 sku 중복, 주문 중복, 없는 sku)
- 규칙 9: 입력 검증 (range, integer, type)
- 규칙 10/11/12: discount 합계, 빈 장바구니, 불변성
- 배송비·customPolicy 통합 테스트

## 수정 이력

### 첫 pnpm check 실패 (2026-10-01 12:40)
1. **TypeScript 에러 (TS18048)**: `checkDuplicatesAndMissing` 함수에서 readonly 배열 인덱싱 불안정
   - 원인: `coupons[i]` 타입이 `Coupon | undefined`로 추론됨 (readonly 배열 특성)
   - 수정: `for (let i = 0; i < coupons.length; i++)` → `coupons.forEach((coupon, i) => ...)`
   
2. **테스트 오류**: 규칙 7 테스트 예상값 오류
   - 수정: 예상값 2_000 → 3_000 (상품 쿠폰 1_000 + 주문 쿠폰 2_000)
   
3. **Task records 경고**: trace.md에 표 없음
   - 수정: "한 일" 표 추가 (단계별 체크인, 작업 내용 기록)

### pnpm check ALL PASS (2026-10-01 12:41)
- Typecheck ✓
- Unit tests ✓ (133개 테스트)
- No lockfiles ✓
- Task records ✓

## 핵심 결정

1. **validateCoupons → checkDuplicatesAndMissing 순서**: 쿠폰 자체 유효성 먼저 확인해야 중복 검증에서 undefined 접근 오류 방지
2. **itemCouponsBySkuMap**: 이중 루프 방지, O(n) 조회 보장
3. **orderDiscount break**: 주문 쿠폰은 정확히 1개만 처리 (중복 검증 후 안전)
4. **minOrder 판정 시점**: 상품 할인 계산 후 (기준금액 = subtotal - itemDiscount)
