# 0030 — 판정서

## 1차 · 2026-10-05

판정: approved

### 근거

모든 완료 조건 충족:
1. **기능 완성도**: calculatePoints 함수가 domain.md 규칙 1~8을 모두 구현
2. **정수 처리**: Math.round 반올림, Math.max(0, …)로 최소값 보장, assertWon으로 입력 검증
3. **테스트 추적성**: domain.md 규칙 1~8 각각에 테스트 1개 이상 대응, Acceptance 9개 항목 모두 커버
4. **코드 품질**: 순수 함수, 0002 패턴 준수, ts-check/lint 통과
5. **빌드 상태**: pnpm check ALL PASS (Typecheck ✓, Unit tests 130 PASS ✓, Task records ✓)

### 확인한 것

**실행한 테스트**
- pnpm check 실행: Typecheck ✓, Unit tests 130 PASS ✓, Task records ✓
- 테스트 세부 확인:
  - 규칙 1 (정수성): calculatePoints(10_000) 결과는 Number.isInteger = true, >= 0 ✓
  - 규칙 2 (기본 1%): calculatePoints(10_000)=100, calculatePoints(1_000)=10, calculatePoints(50_000)=500 ✓
  - 규칙 3 (쿠폰 0.8%): calculatePoints(10_000, {couponUsed:true})=80, calculatePoints(5_000, {couponUsed:true})=40 ✓
  - 규칙 4 (VIP 1.5%): calculatePoints(10_000, {isVip:true})=150, calculatePoints(1_000, {isVip:true})=15 ✓
  - 규칙 5 (VIP+쿠폰 1.2%): calculatePoints(10_000, {couponUsed:true, isVip:true})=120, calculatePoints(5_000, {couponUsed:true, isVip:true})=60 ✓
  - 규칙 6 (반올림): 9_501→95, 9_499→95, 10_000→100, 9_375(쿠폰)→75, 6_667(VIP)→100 ✓
  - 규칙 7 (최소값 0): calculatePoints(50)=1, calculatePoints(30)=0, calculatePoints(1)=0 ✓
  - 규칙 8 (빈 주문): calculatePoints(0)=0 ✓

**직접 따져 본 경계값**
- 부동소수점 계산: 9_501×0.01=95.01→95(정확), 9_499×0.01=94.99→95(정확), 9_375×0.01×0.8=75.00(정확)
- 최소값 검증: Math.max(0, points)로 음수 방지, 반올림 후 0도 허용 (30원→0.3→0)
- 중복 적용 검증: 1% × 0.8 × 1.5 = 0.012 = 1.2% (구현 라인 30-37 곱셈 순서 확인)
- 입력 검증: assertWon(total, "total")이 음수와 소수점 거부 (src/money.ts Number.isSafeInteger 확인)

### 원문 대조

**원문 (request.md) 요구사항 vs 구현·테스트:**
1. "결제 금액의 1%를 포인트로 적립합니다" 
   - domain.md 규칙 2: "기본 적립률은 결제 금액(total)의 1%"
   - 구현: points.ts 14행 `BASIC_RATE = 0.01`, 27행 `let pointsBase = total * BASIC_RATE`
   - 테스트: points.test.ts 13-21행 (5개 케이스: 1,000→10, 10,000→100, 50,000→500)
   - ✓ 일치

2. "쿠폰을 쓴 주문은 적립을 좀 줄여 주세요"
   - domain.md 규칙 3: "쿠폰 사용 시 적립률 감소: 기본 적립의 80% (즉, 1% → 0.8%)"
   - 구현: points.ts 15행 `COUPON_RATE = 0.8`, 30-32행 `if (couponUsed) { pointsBase *= COUPON_RATE; }`
   - 테스트: points.test.ts 24-31행 (3개 케이스: 10,000→80, 5,000→40, 50,000→400)
   - ✓ 일치

3. "VIP 회원은 더 많이 적립해 주세요"
   - domain.md 규칙 4: "VIP 회원 적립 증가: 기본 적립의 150% (즉, 1% → 1.5%)"
   - 구현: points.ts 16행 `VIP_RATE = 1.5`, 35-37행 `if (isVip) { pointsBase *= VIP_RATE; }`
   - 테스트: points.test.ts 34-41행 (3개 케이스: 1,000→15, 10,000→150, 50,000→750)
   - ✓ 일치

4. "포인트는 1포인트 단위(정수)입니다"
   - domain.md 규칙 1: "포인트 단위는 정수(point)이며, 항상 0 이상의 정수다"
   - domain.md 규칙 6: "포인트 반올림: 소수점은 표준 반올림(Math.round, 0.5 이상 올림)"
   - domain.md 규칙 7: "최소 포인트: 반올림 후 0 이상의 정수 (0도 가능)"
   - 구현: points.ts 40행 `const points = Math.round(pointsBase);`, 42행 `return Math.max(0, points);`
   - 테스트: points.test.ts 6-10행 (정수성), 54-77행 (반올림 경계), 80-93행 (최소값), 101-107행 (입력 검증)
   - ✓ 일치

5. "코드는 `src/pricing/points.ts`에 만들어 주세요"
   - 파일 위치: /src/pricing/points.ts 확인 ✓
   - 내용: calculatePoints 함수 + 상수 정의 + 주석 ✓

**prd.md 완료 조건 (9개) vs 구현:**
| # | 조건 | 구현·테스트 | 상태 |
|---|------|----------|------|
| 1 | 포인트 계산 함수 src/pricing/points.ts 구현 | points.ts 18-43행 | ✓ |
| 2 | 기본 적립: 1% (예: 10,000→100) | BASIC_RATE=0.01, test 13-21행 | ✓ |
| 3 | 쿠폰: 80% (예: 10,000 쿠폰→80) | COUPON_RATE=0.8, test 24-31행 | ✓ |
| 4 | VIP: 150% (예: 10,000 VIP→150) | VIP_RATE=1.5, test 34-41행 | ✓ |
| 5 | VIP+쿠폰: 120% (예: 10,000→120) | 곱셈 30-37행, test 44-51행 | ✓ |
| 6 | Math.round 반올림 | points.ts 40행, test 54-77행 | ✓ |
| 7 | 최소값 0 (반올림 후) | Math.max(0, …), test 80-93행 | ✓ |
| 8 | 빈 주문 0 (total=0) | 27-42행 로직, test 96-98행 | ✓ |
| 9 | 포인트 항상 정수 | Math.round + 검증, test 6-10행 | ✓ |
| 10 | domain.md 규칙 1~8 명시 & 테스트 대응 | domain.md 30-39행, test 17개 | ✓ |
| 11 | pnpm check ALL PASS | 실행 결과 보고 | ✓ |

**domain.md 규칙 1~8 vs 구현·테스트:**
- 규칙 1: 정수, 0≥ ↔ points.ts 40,42행, test 6-10행 ✓
- 규칙 2: 기본 1% ↔ points.ts 14,27행, test 13-21행 ✓
- 규칙 3: 쿠폰 0.8% ↔ points.ts 15,30-32행, test 24-31행 ✓
- 규칙 4: VIP 1.5% ↔ points.ts 16,35-37행, test 34-41행 ✓
- 규칙 5: VIP×쿠폰 1.2% ↔ points.ts 30-37행, test 44-51행 ✓
- 규칙 6: Math.round ↔ points.ts 40행, test 54-77행 ✓
- 규칙 7: 최소값 0 ↔ points.ts 42행, test 80-93행 ✓
- 규칙 8: total=0→0 ↔ points.ts 27-42행, test 96-98행 ✓

**최종 검증**
- 원문 요구 4개 사항 모두 domain.md 규칙으로 구체화 ✓
- domain.md 규칙 1~8 모두 points.ts에 구현 ✓
- points.test.ts에서 규칙 1~8 각각 1개 이상 테스트 대응 (총 17개 테스트) ✓
- pnpm check: Typecheck ✓, Unit tests 130 PASS ✓, Task records ✓ → **ALL PASS** ✓
