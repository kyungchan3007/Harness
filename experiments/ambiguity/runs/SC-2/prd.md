# 0034 — 포인트 적립 — PRD

- **이슈:** #1

## 목표

주문 결제 시 포인트를 자동으로 적립해 주는 기능을 구현한다.

## 요구사항

### 포인트 적립 기본 규칙

1. **기본 적립률:** 결제 금액(total)의 **1%**를 포인트로 적립한다.
   - 예: 100,000원 결제 → 1,000포인트 적립
   
2. **단위:** 포인트는 **1포인트 단위의 정수**이다. 소수점 포인트는 없다.
   - 버림 처리: 1,234원 결제 → 12.34포인트 → **12포인트** (정수 변환)

3. **쿠폰 사용 시 감소:** 쿠폰을 사용한 주문은 적립 포인트를 감소시킨다.

4. **VIP 회원 보너스:** VIP 회원은 더 많은 포인트를 적립한다.

5. **포인트 적립 시점:** 주문 결제 완료 시 적립한다. (주문 생성 시가 아님)

## 범위

### 포함
- 포인트 계산 함수 구현 (calculatePoints)
- 회원 등급별 적립률 적용 (기본/VIP)
- 쿠폰 사용 여부에 따른 적립률 조정
- 단위 변환 (소수 → 정수)

### 제외
- 포인트 적립 이력 저장 (데이터베이스)
- 포인트 사용/차감 기능
- 포인트 만료 처리
- UI/API 엔드포인트

## 인터페이스

```typescript
interface PointsCalculationInput {
  totalAmount: number;      // 결제 금액 (원)
  isVip: boolean;           // VIP 회원 여부
  usedCoupon: boolean;      // 쿠폰 사용 여부
}

export function calculatePoints(input: PointsCalculationInput): number
```

## Acceptance

- [x] `src/pricing/points.ts` 구현 완료 (calculatePoints 함수)
- [x] 모든 엣지 케이스 처리 완료 (0원 결제, VIP+쿠폰 조합 등)
- [x] 포인트 계산 테스트 케이스 6개 이상 작성 및 통과 (12개 통과)
- [x] `pnpm check` (lint, type, test) 통과

## 애매한 곳·가정

- **쿠폰 감소율:** 적립률을 절반으로 줄임 (1% → 0.5%) (확인됨: 적립률 절반)
- **VIP 보너스 배율:** 적립률 2배 (1% → 2%) (확인됨: 적립률 2배)
- **VIP 판정 기준:** 호출자가 boolean으로 제공 (가정)

## 의존성

- domain.md: 결제 금액(total) 정의 참조
- money.ts: Won 타입 검증
