# 0030 — 판정서

## 1차 · 2026-10-04

판정: approved

### 확인한 것

**테스트 실행 결과:**
- `pnpm check` ALL PASS (130 tests passed)
- Typecheck ✅
- Unit tests ✅
- Task records ✅

**Acceptance Criteria 검증:**

1. 포인트 계산이 domain.md의 포인트 규칙 1~4를 지킨다
   - 규칙 1 (기본 1%): describe블록 "규칙 1" 3개 테스트 ✓
   - 규칙 2 (쿠폰 50%): describe블록 "규칙 2" 4개 테스트 ✓
   - 규칙 3 (VIP 1.5배): describe블록 "규칙 3" 4개 테스트 + 중복 3개 테스트 ✓
   - 규칙 4 (정수): describe블록 "규칙 4" + Number.isInteger() 검증 ✓

2. 결제 금액의 1%를 기본 포인트로 적립 (경계값)
   - 100원 → 1포인트: `earnPoints(100, noOptions())` = 1 ✓
   - 99원 → 0포인트: `earnPoints(99, noOptions())` = 0 ✓
   - 구현: `Math.floor(total * 0.01)` (points.ts 40행) ✓

3. 쿠폰 사용 시 기본 포인트의 50%만 적립
   - 100원 기본 1포인트 → 쿠폰 0포인트: `earnPoints(100, withCoupon())` = 0 ✓
   - 200원 기본 2포인트 → 쿠폰 1포인트: `earnPoints(200, withCoupon())` = 1 ✓
   - 구현: `basePoints * 0.5` with floor (points.ts 43, 49행) ✓

4. VIP 회원은 기본 포인트의 1.5배 적립, 쿠폰과 중복 적용
   - 100원 기본 1포인트 → VIP 1포인트: `earnPoints(100, withVip())` = 1 ✓
   - 200원 기본 2포인트 → VIP 3포인트: `earnPoints(200, withVip())` = 3 ✓
   - 쿠폰+VIP 400원: `earnPoints(400, withBoth())` = 3 (4×0.5×1.5=3) ✓
   - 구현: `basePoints * couponMultiplier * vipMultiplier` (points.ts 49행) ✓

5. 포인트는 항상 정수 (내림)
   - 최종 계산: `Math.floor(basePoints * couponMultiplier * vipMultiplier)` ✓
   - 테스트: 모든 결과가 Number.isInteger() 통과 ✓

6. 함수 위치와 시그니처
   - `src/pricing/points.ts` 존재 ✓
   - `export function earnPoints(total: Won, options: EarnPointsOptions): number` ✓

7. `pnpm check` ALL PASS
   - 130 tests passed ✓

**경계값 직접 확인:**
- 0원 → 0포인트 ✓
- 1원 → 0포인트 ✓
- 99원 → 0포인트 ✓
- 100원 → 1포인트 ✓
- 150원 → 1포인트 ✓
- 200원 → 2포인트 ✓
- 쿠폰 감소 후 정수: 1.0→1, 0.5→0, 1.5→1, 2.0→2 ✓

**입력 검증:**
- 음수 시 RangeError 발생 (assertWon) ✓
- 소수점 시 RangeError 발생 (assertWon) ✓

### 원문 대조

- 원문 "결제 금액의 1%를 포인트로 적립합니다" ↔ domain.md 규칙 1 "기본 포인트는 결제 금액(total)의 1%다" ↔ points.ts 40행 `Math.floor(total * 0.01)` ✓
- 원문 "쿠폰을 쓴 주문은 적립을 좀 줄여 주세요" ↔ domain.md 규칙 2 "쿠폰을 사용한 주문은 기본 포인트의 50%만 적립한다" ↔ points.ts 43, 49행 `couponMultiplier = isCouponUsed ? 0.5 : 1.0` 및 floor 처리 ✓
- 원문 "VIP 회원은 더 많이 적립해 주세요" ↔ domain.md 규칙 3 "VIP 회원은 기본 포인트의 1.5배를 적립한다. 쿠폰과 VIP는 중복 적용 가능 (곱하기)" ↔ points.ts 46, 49행 `vipMultiplier = isVip ? 1.5 : 1.0` 및 `basePoints * couponMultiplier * vipMultiplier` ✓
- 원문 "포인트는 1포인트 단위(정수)입니다" ↔ domain.md 규칙 4 "포인트는 항상 정수(1포인트 단위)다. 계산 중간의 소수는 내림(Math.floor)한다" ↔ points.ts 49행 `Math.floor(basePoints * couponMultiplier * vipMultiplier)` ✓
- 원문 "코드는 `src/pricing/points.ts`에 만들어 주세요" ↔ points.ts 파일 존재 ✓
