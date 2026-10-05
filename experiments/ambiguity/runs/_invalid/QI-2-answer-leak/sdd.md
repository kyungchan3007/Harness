# SDD 0030 — 포인트 적립

- **접근:**
  1. `PriceBreakdown`에서 `subtotal - discount`를 기준금액으로 계산
  2. 기본 적립률 1%에 VIP/쿠폰 배수를 순차 적용
  3. 결과를 내림(floor)하여 정수 포인트 반환

- **대안·트레이드오프:**
  - VIP+쿠폰 순서: VIP 2배를 먼저 적용한 뒤 쿠폰 절반을 적용. 역순이 아닌 이유는 PRD에 "VIP 2배를 먼저 적용"으로 명시했기 때문.
  - 보수적 배수: 순차 곱셈은 단순하고 규칙 설명과 일치.

- **검증 계획:**
  - 유닛 테스트: 5개 규칙 × 2개 시나리오 = 10개 이상 케이스
  - 엣지 케이스: 0원(무료), 1원(최소), 소수 절삭
  - 타입 검증: `user.grade` 타입만 가능한지 확인

## 알고리즘

```
기준금액 = subtotal - discount
기본적립률 = 1%
적립금액 = 기준금액 × 기본적립률

// VIP 판별
if user.grade === "VIP":
  적립금액 = 적립금액 × 2

// 쿠폰 판별 (discount > 0)
if discount > 0:
  적립금액 = 적립금액 × 0.5

// 내림
포인트 = floor(적립금액)
```

### 예시

| 시나리오 | 기준금액 | 적립률 | 계산 | 포인트 |
| --- | --- | --- | --- | --- |
| 일반, 쿠폰X | 10,000 | 1% | 10,000 × 0.01 = 100 | 100 |
| VIP, 쿠폰X | 10,000 | 2% | 10,000 × 0.02 = 200 | 200 |
| 일반, 쿠폰O | 9,000 | 0.5% | 9,000 × 0.005 = 45 | 45 |
| VIP, 쿠폰O | 9,000 | 1% | 9,000 × 0.01 = 90 | 90 |
| 일반, 쿠폰X | 12,345 | 1% | 12,345 × 0.01 = 123.45 → floor | 123 |

## 타입

```typescript
export interface UserGrade {
  grade: "VIP" | "NORMAL";
}

export function calculatePoints(breakdown: PriceBreakdown, user: UserGrade): number {
  // 구현
}
```

## 입력 검증

- `breakdown.subtotal ≥ 0` (Won 타입으로 이미 보장)
- `breakdown.discount ≥ 0` (Won 타입으로 이미 보장)
- `breakdown.discount ≤ breakdown.subtotal` (priceCart에서 이미 검증)
- `user.grade ∈ {"VIP", "NORMAL"}`

## 구현 위치

- 함수: `src/pricing/points.ts`
- 테스트: `src/pricing/points.test.ts`
- 모듈 export: `src/pricing/points.ts`

## 테스트 계획

각 규칙당 최소 2개 케이스:

1. **규칙 1: 기본 1%**
   - 정수 배수 (10,000 → 100)
   - 소수 발생 (12,345 → 123)

2. **규칙 2: VIP 2배**
   - VIP, 쿠폰X (10,000 → 200)

3. **규칙 3: 쿠폰 절반**
   - NORMAL, 쿠폰O (10,000 → 50)

4. **규칙 4: VIP + 쿠폰**
   - VIP + 쿠폰 (10,000 → 100)

5. **규칙 5: 내림**
   - 소수 첫째 자리 절삭 (123.45 → 123)

## 게이트

- `pnpm test` 통과
- `pnpm check` 통과 (TypeScript, lint, test)
