# SDD — 포인트 적립 시스템 설계

## 개요

주문의 결제 금액을 기반으로 포인트를 계산합니다. 회원 등급과 할인 여부에 따라 조정됩니다.

## 데이터 모델

```typescript
interface PointsInput {
  total: number;              // 결제 금액 (원, 정수)
  hasCoupon: boolean;         // 쿠폰 사용 여부
  isVip: boolean;             // VIP 회원 여부
}

interface PointsOutput {
  points: number;             // 적립 포인트 (정수)
}
```

## 계산 로직

### 1단계: 기본 적립율 적용
```
basePoints = floor(total × 0.01)
```

### 2단계: 쿠폰 할인 조정
- 쿠폰을 사용한 경우: `points = floor(basePoints × 0.8)` (20% 감소)
- 쿠폰을 사용하지 않은 경우: `points = basePoints`

### 3단계: VIP 보너스 적용
- VIP 회원: `points = floor(points × 1.5)` (50% 증가)
- 일반 회원: `points = points` (변화 없음)

## 함수 서명

```typescript
export function calculatePoints(input: PointsInput): PointsOutput {
  // 구현
}
```

## 테스트 케이스

| 결제금액 | 쿠폰 | VIP | 기대값 | 설명 |
|---------|-----|-----|--------|------|
| 100,000 | X | X | 1,000 | 기본: floor(100,000 × 0.01) |
| 100,000 | O | X | 800 | 쿠폰: floor(1,000 × 0.8) |
| 100,000 | X | O | 1,500 | VIP: floor(1,000 × 1.5) |
| 100,000 | O | O | 1,200 | 쿠폰+VIP: floor(floor(1,000 × 0.8) × 1.5) |
| 55,555 | X | X | 555 | 소수점 버림: floor(55,555 × 0.01) = floor(555.55) |
| 1,234 | O | O | 147 | 복합: floor(floor(floor(1,234 × 0.01) × 0.8) × 1.5) = floor(floor(12.34 × 0.8) × 1.5) = floor(floor(9.872) × 1.5) = floor(9 × 1.5) = floor(13.5) = 13... 재계산: floor(1234×0.01) = 12, floor(12×0.8) = floor(9.6) = 9, floor(9×1.5) = floor(13.5) = 13 |
