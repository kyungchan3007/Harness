완성되었습니다! 모든 게이트가 통과했습니다.

## 작업 완료 — 포인트 적립 기능

**`pnpm check` ✅ ALL PASS**

### 구현 내용

**`src/pricing/points.ts`**
- `calculatePoints(breakdown, user)` 함수: `PriceBreakdown` + 회원정보에서 포인트 계산
- 기본 1% 적립 → VIP 2배 → 쿠폰 절반 적용 → 내림(floor)

**테스트: `src/pricing/points.test.ts`** (15개 케이스)
- 규칙 1~5 각각 검증 (정수 배수, 소수 절삭)
- 엣지 케이스: 0원, 1원, 전액 할인, VIP 조합

### 문서
- **PRD**: 5개 규칙, 입출력 명시
- **SDD**: 알고리즘, 대안·트레이드오프, 검증 계획
- **Trace**: 작업 과정 기록

### 테스트 결과
```
Test Files  11 passed (11)
Tests       120 passed (120)
```

코드는 `src/pricing/points.ts`에 위치하며, 배송비를 제외한 `subtotal - discount` 금액을 기준으로 포인트를 계산합니다.
