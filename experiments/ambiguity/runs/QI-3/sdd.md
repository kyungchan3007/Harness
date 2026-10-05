# 0030 — 포인트 적립 기능 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** domain.md(용어·규칙), 0002 prd(장바구니·금액), 0002 sdd(구현 패턴)
- **접근:**
  - `calculatePoints(total: number, hasDiscount: boolean, isVIP: boolean): number` 순수 함수
  - 결제 금액(total), 쿠폰 사용 여부, VIP 여부를 인자로 받고 포인트(정수)를 반환
  - 계산 로직: `let rate = 0.01` → `[isVIP면 ×2]` → `[hasDiscount면 ×0.5]` → `Math.floor(total * rate)`
- **대안·트레이드오프:**
  - 다른 적용 순서(쿠폰 먼저)?: 사용자가 VIP 먼저를 명시했으므로 따름
  - 다른 반올림(round/ceil)?: 사용자가 floor를 명시했으므로 따름
  - domain.md 갱신 필요?: 포인트 규칙을 domain.md에 추가(prd 후 진행)
- **파일 계획:**
  ```
  src/pricing/
  ├── points.ts (새로 생성)
  └── points.test.ts (새로 생성)
  ```
- **위험:** 없음 (순수 함수로 격리, 다른 모듈과 무관)
- **검증 계획:** 
  1. 단위 테스트 (각 조합 최소 2개)
     - 쿠폰 ✗ VIP ✗ (1%)
     - 쿠폰 ○ VIP ✗ (0.5%)
     - 쿠폰 ✗ VIP ○ (2%)
     - 쿠폰 ○ VIP ○ (1%)
  2. 소수점 처리(floor) 경계값
  3. `pnpm check` ALL PASS

## 계획과 달라진 점
없음 — 설계 단계에서의 계획이 그대로 구현됨.

## 검증 결과

### 단위 테스트 (총 9개)
1. ✅ 기본 1% 적립: 10,000원 → 100포인트
2. ✅ 쿠폰 0.5%: 10,000원 → 50포인트
3. ✅ VIP 2%: 10,000원 → 200포인트
4. ✅ VIP + 쿠폰 1%: 10,000원 → 100포인트
5. ✅ 소수점 처리 (floor): 12,345 × 1% = 123.45 → 123포인트
6. ✅ 결제 금액 0: 0포인트
7. ✅ 음수·소수점 입력 거부
8. ✅ 정수 반환 보장
9. ✅ domain.md 규칙 1~5 모두 커버

### pnpm check
- Typecheck: ✅ PASS
- Unit tests: 113개 모두 pass (0030 테스트 9개 포함)
- Task records: ✅ PASS
- **종합: ALL PASS** ✅

### 구현 상세

**파일:**
- `src/pricing/points.ts` — calculatePoints 순수 함수 구현
- `src/pricing/points.test.ts` — 9개 단위 테스트

**함수 서명:**
```typescript
function calculatePoints(total: Won, options?: PointsOptions): number
interface PointsOptions {
  hasDiscount?: boolean  // 쿠폰 적용 여부
  isVIP?: boolean        // VIP 회원 여부
}
```

**계산 로직:**
```
rate = 0.01 (기본 1%)
if (isVIP) rate *= 2    // VIP: 2배
if (hasDiscount) rate *= 0.5  // 쿠폰: 절반
return Math.floor(total * rate)
```
