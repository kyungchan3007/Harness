# 0030 — 포인트 적립 — PRD

- **이슈:** #1

## 개요

주문 완료 시 결제 금액에 따라 포인트를 적립하는 기능.

## 요구사항

### 기본 규칙
- **기본 적립률:** 결제 금액(total)의 1%
- **포인트 단위:** 1포인트 (정수, 내림)

### 조정 규칙
1. **쿠폰 사용 시:** 적립률 50% 감소
   - 판정: `discount > 0`인 경우 쿠폰 사용으로 간주
   - 적립률: 1% → 0.5%

2. **VIP 회원:** 적립률 2배
   - 판정: `grade === "VIP"`
   - 적립률: 1% → 2%

3. **VIP + 쿠폰:** VIP 2배 적용 후 쿠폰 절반 적용
   - 순서: VIP 2배 먼저 → 쿠폰 절반
   - 적립률: 1% → 2% → 1%

## 입력

```typescript
input: {
  breakdown: PriceBreakdown  // { subtotal, discount, shipping, total }
  member: { grade: "VIP" | "NORMAL" }
}
```

## 출력

```typescript
output: number  // 적립 포인트 (정수)
```

## 예시

| 결제금액 | 회원 | 쿠폰 | 적립률 | 포인트 |
| --- | --- | --- | --- | --- |
| 10,000원 | NORMAL | 없음 | 1% | 100포인트 |
| 10,000원 | NORMAL | 있음 | 0.5% | 50포인트 |
| 10,000원 | VIP | 없음 | 2% | 200포인트 |
| 10,000원 | VIP | 있음 | 1% | 100포인트 |
| 12,345원 | NORMAL | 없음 | 1% | 123포인트 (내림) |

## Acceptance

- [x] 함수 `calculatePoints(breakdown, member)` 구현
- [x] 모든 시나리오 단위 테스트 통과
- [x] `pnpm check` 통과
