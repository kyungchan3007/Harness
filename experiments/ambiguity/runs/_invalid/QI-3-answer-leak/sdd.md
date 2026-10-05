# 0030 — 포인트 적립 — SDD

## 설계
- **접근:**
  - `src/pricing/points.ts`: `calculatePoints(breakdown, member)` 순수 함수
  - `PriceBreakdown`과 `Member { grade }` 입력받아 정수 포인트 반환
  - 입력값 검증 불필요 (상위에서 보장), 계산만 수행
  - `Math.floor`로 내림하여 1포인트 미만 버림
- **대안·트레이드오프:**
  - 순수 함수: 부작용 없음, 테스트 용이, 재사용 가능 ✓
  - 내림(floor): 사용자에게 유리한 방식, 정확성 보장 ✓
  - Member 인터페이스 분리: PriceBreakdown과 독립적, 확장 용이 ✓
- **검증 계획:**
  - 단위 테스트: 8가지 시나리오 (기본·쿠폰·VIP·VIP+쿠폰, 내림 케이스 포함) 모두 통과
  - 타입 검증: TypeScript strict mode
  - 게이트: `pnpm check` (lint, format, test, type)

## 함수 설계

### 시그니처
```typescript
function calculatePoints(breakdown: PriceBreakdown, member: Member): number
```

### 계산 로직
1. 기본 적립률: `rate = 0.01` (1%)
2. VIP 판정: `grade === "VIP"` → `rate *= 2` (2%)
3. 쿠폰 판정: `discount > 0` → `rate *= 0.5` (절반)
4. 포인트 계산: `points = Math.floor(total * rate)`

## 테스트 케이스

| 설명 | 금액 | 회원 | 쿠폰 | 예상 |
| --- | --- | --- | --- | --- |
| 기본 | 10000 | NORMAL | 없음 | 100 |
| 쿠폰 | 10000 | NORMAL | 있음 | 50 |
| VIP | 10000 | VIP | 없음 | 200 |
| VIP+쿠폰 | 10000 | VIP | 있음 | 100 |
| 내림 | 12345 | NORMAL | 없음 | 123 |
| 쿠폰 내림 | 12345 | NORMAL | 있음 | 61 |
| VIP 내림 | 12345 | VIP | 없음 | 246 |
| VIP+쿠폰 내림 | 12345 | VIP | 있음 | 123 |

## 타입 재사용

기존 `PriceBreakdown` 타입 사용:
```typescript
interface PriceBreakdown {
  subtotal: number
  discount: number
  shipping: number
  total: number
}
```
