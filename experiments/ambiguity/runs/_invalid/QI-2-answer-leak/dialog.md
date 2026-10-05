## AI

현재 코드 구조를 확인했습니다. **prd.md·sdd.md를 작성하기 전에 모호한 요구사항을 명확히 해야 합니다:**

## 명확히 필요한 사항

### 1. **쿠폰 사용 시 포인트 감소**
   - 예: 1%에서 몇 %로 줄일까요? (0.5%? 0.7%)

### 2. **VIP 회원 포인트**
   - 몇 배 더 적립할까요? (1.5배? 2배?)
   - VIP 판별 기준은? (회원 등급 필드? 가입 기간? 누적 구매액?)

### 3. **적용 순서**
   - VIP + 쿠폰 사용 시 어떻게 계산할까요?
   - 예: (결제금액 × 1%) × 1.5(VIP) × 0.5(쿠폰) = ?

### 4. **반올림**
   - 1%가 정수 아닐 때는? (예: 12,345원의 1% = 123.45)
   - 내림? 올림? 반올림(ROUND)?

### 5. **데이터 구조**
   - `Order` 객체에 어떤 필드가 있을까요? (`total`, `couponUsed`, `userType` 등)
   - `User` 객체는 별도로 받을까요?

---

**답변을 받으면 `agents/intent/specs/0030-points/prd.md`와 `sdd.md`를 작성하고 구현을 시작하겠습니다.**

## 요청자

1. 쿠폰을 쓴 주문은 적립률을 절반으로 줄입니다 (1% → 0.5%).
2. VIP는 적립률 2배입니다 (1% → 2%). VIP 판별은 회원 정보를 { grade: "VIP" | "NORMAL" } 형태로 따로 받아서 합니다.
3. VIP가 쿠폰을 쓰면 VIP 2배를 먼저 적용하고 쿠폰으로 절반을 줄입니다 (2% → 1%). 쿠폰을 썼는지는 priceCart 결과(PriceBreakdown)의 discount가 0보다 큰지로 판단합니다. 적립 기준 금액은 쿠폰 할인 후 상품 금액(subtotal − discount)이고, 배송비는 빼고 계산합니다.
4. 1포인트 미만은 버립니다(내림).
5. 입력은 priceCart 결과(PriceBreakdown: subtotal·discount·shipping·total)와 회원 정보 { grade: "VIP" | "NORMAL" }입니다. 쿠폰 할인은 discount로 들어옵니다. 함수 이름은 자유입니다.

## AI

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
