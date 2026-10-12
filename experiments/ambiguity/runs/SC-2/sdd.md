# 0034 — 포인트 적립 — SDD

- **접근:**
  - 순수 함수(pure function)로 구현한다. 입력값(totalAmount, isVip, usedCoupon)을 받아 최종 포인트를 반환한다.
  - Won 타입 검증 포함 (assertWon)
  - 도메인 로직만 포함 (저장·조회는 0034 범위 외)

## 설계 결정

### 적립률 계산
기본 적립률 1%에 쿠폰·VIP 계수를 순차적으로 적용한다.

| 시나리오 | 적립률 | 계산 | 예 (1000원) |
| --- | --- | --- | --- |
| 기본 | 1% | 1% | 10포인트 |
| 쿠폰 사용 | 0.5% | 1% × 0.5 | 5포인트 |
| VIP | 2% | 1% × 2 | 20포인트 |
| VIP + 쿠폰 | 1% | 1% × 0.5 × 2 | 10포인트 |

### 계산 순서
```
1. rate = 1% (기본 적립률)
2. if (usedCoupon) rate *= 0.5        // 쿠폰 사용 시 적립률 반감
3. if (isVip) rate *= 2                // VIP 회원 적립률 2배
4. points = Math.floor(totalAmount * rate / 100)  // 최종 포인트 (버림)
```

### 엣지 케이스

| 입력 | 적립률 | 계산 | 예상 |
| --- | --- | --- | --- |
| total = 0 | 1% | 0 × 0.01 = 0 | 0포인트 |
| total = 50 | 1% | 50 × 0.01 = 0.5 | 0포인트 |
| total = 100 | 1% | 100 × 0.01 = 1 | 1포인트 |
| total = 150 | 1% | 150 × 0.01 = 1.5 | 1포인트 |
| total = 1000 | 1% | 1000 × 0.01 = 10 | 10포인트 |
| total = 1000, coupon | 0.5% | 1000 × 0.005 = 5 | 5포인트 |
| total = 1000, VIP | 2% | 1000 × 0.02 = 20 | 20포인트 |
| total = 1000, VIP + coupon | 1% | 1000 × 0.01 = 10 | 10포인트 |
| total = 100,000, VIP + coupon | 1% | 100000 × 0.01 = 1000 | 1,000포인트 |

- **대안·트레이드오프:**
  - 적용 순서 (쿠폰→VIP) vs (VIP→쿠폰): 쿠폰→VIP 선택. 감소 후 증가 순서가 직관적.
  - 계산 방식 (적립률에서 한 번) vs (단계별): 적립률에서 한 번 선택. 부동소수점 오차 최소화.
  - 반올림 (Math.floor): 도메인 규칙상 금액은 정수이므로 버림 적용.
  - VIP 입력 (boolean vs enum): boolean 선택. 단순성 + 향후 확장성 가능.

- **검증 계획:**
  - TC-1: 기본 적립 (total=1000, isVip=false, usedCoupon=false) → 10포인트
  - TC-2: 작은 금액 (total=50, isVip=false, usedCoupon=false) → 0포인트
  - TC-3: 쿠폰 적용 (total=1000, isVip=false, usedCoupon=true) → 5포인트
  - TC-4: VIP 적용 (total=1000, isVip=true, usedCoupon=false) → 20포인트
  - TC-5: VIP + 쿠폰 (total=1000, isVip=true, usedCoupon=true) → 10포인트
  - TC-6: 0원 결제 (total=0, isVip=false, usedCoupon=false) → 0포인트
  - TC-7: 큰 금액 (total=100000, isVip=true, usedCoupon=false) → 2,000포인트
  - 정적 검사: TypeScript strict 모드 + assertWon 호출 + ESLint 통과

## 구현 구조

### 파일: `src/pricing/points.ts`

```typescript
export interface PointsCalculationInput {
  totalAmount: Won;
  isVip: boolean;
  usedCoupon: boolean;
}

export function calculatePoints(input: PointsCalculationInput): number {
  assertWon(input.totalAmount, "totalAmount");

  let rate = 1;

  if (input.usedCoupon) {
    rate *= 0.5;
  }

  if (input.isVip) {
    rate *= 2;
  }

  return Math.floor((input.totalAmount * rate) / 100);
}
```

## 완료 조건

- [ ] 포인트 계산 함수 구현
- [ ] 모든 테스트 케이스 통과
- [ ] TypeScript 타입 안전성 확인
- [ ] `pnpm check` 통과 (lint, type, test)
