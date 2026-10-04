완료되었습니다! **포인트 적립 기능(0030)** 구현이 모든 게이트를 통과했습니다.

## 구현 결과

### 📋 도메인 규칙 (domain.md 추가)
- **규칙 1**: 결제 금액의 1% 적립 (소수점 버림)
- **규칙 2**: 쿠폰 사용 시 0.5% (절반)
- **규칙 3**: VIP 회원은 50% 증가 (기본 1.5%, 쿠폰 0.75%)
- **규칙 4~5**: 포인트는 정수 ≥ 0, 0원 주문은 0포인트

### 💾 구현
- **`src/pricing/points.ts`** — `calculatePoints(total, options)` 순수 함수
  - 옵션: `{ hasCoupon?, isVip? }`
  - 적립률: 상수로 정의 (`0.01`, `0.005`, `1.5`)
  - 소수점은 `Math.floor`로 버림

### ✅ 테스트 (14개 테스트 ALL PASS)
- 기본 1% / 소수점 버림 / 쿠폰 0.5%
- VIP 1.5% / VIP+쿠폰 0.75%
- 0원 주문 / 입력 검증

### 📊 게이트 현황
- Typecheck ✅
- Unit tests: 113개 ALL PASS
- Spec records (prd·sdd·trace·TASKS) ✅

코드는 `src/pricing/points.ts`에 준비되어 있습니다.
