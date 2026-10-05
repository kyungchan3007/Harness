# 0030 — 포인트 적립 — SDD

## 설계

- **접근:** 포인트 적립률은 회원 등급(VIP/NORMAL)과 쿠폰 사용 여부에 따라 결정됩니다. 기본 1%, VIP는 2배, 쿠폰 사용 시 절반. 규칙을 순차적으로 적용하여 최종 적립률을 계산합니다. 적립 기준 금액은 subtotal - discount (배송비 제외)이며, 내림 처리하여 정수 포인트를 반환합니다.

- **대안·트레이드오프:**
  - 적립률 계산 순서: VIP 배수 먼저 적용, 쿠폰은 나중. 명확한 규칙 순서 (기본 → VIP → 쿠폰), VIP + 쿠폰: 2% → 1% (직관적)
  - 반올림 정책: 내림(Math.floor) 선택. 간단한 구현, 사용자에게 명확 (123.45 → 123)

- **검증 계획:**
  1. 단위 테스트: 6가지 시나리오 (기본/VIP/쿠폰/VIP+쿠폰/소수점/0원)
  2. 경계값: 매우 큰 금액 (수백만원)
  3. 타입 검증: Won 타입 assertWon 검증
  4. 통합: priceCart 결과와 함께 사용

## 모듈 위치

`src/pricing/points.ts`

## 함수 서명

```typescript
export interface Customer {
  grade: "VIP" | "NORMAL";
}

export function calculatePoints(
  priceBreakdown: PriceBreakdown,
  customer: Customer
): number
```

## 알고리즘

1. 기준 금액: `baseAmount = subtotal - discount`
2. 초기 적립률: `rate = 0.01` (1%)
3. VIP 적용: `if (grade === "VIP") rate *= 2`
4. 쿠폰 적용: `if (discount > 0) rate *= 0.5`
5. 포인트: `Math.floor(baseAmount * rate)`
6. 음수 방지: `Math.max(0, points)`

## 타입

- 입력: `PriceBreakdown` (기존), `Customer { grade: "VIP" | "NORMAL" }`
- 출력: 0 이상의 정수

## 테스트 시나리오

| 케이스 | subtotal | discount | grade | 포인트 |
| --- | --- | --- | --- | --- |
| 기본 | 10,000 | 0 | NORMAL | 100 |
| VIP | 10,000 | 0 | VIP | 200 |
| 쿠폰 | 10,000 | 2,000 | NORMAL | 40 |
| VIP + 쿠폰 | 10,000 | 2,000 | VIP | 80 |
| 소수점 내림 | 12,345 | 0 | NORMAL | 123 |
| 0원 | 0 | 0 | NORMAL | 0 |
