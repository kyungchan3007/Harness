# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** [domain.md](../../context/domain.md), `src/pricing/price-cart.ts`, `src/money.ts`(Won), [0002 prd](../0002-cart-pricing/prd.md)
- **접근:** 순수 함수 `calculatePoints(breakdown: PriceBreakdown, member: Member, policy?: PointsPolicy): number`. 적립률은 basis point(1bp = 0.01%) 정수로 들고 `PointsPolicy`(`baseRateBp: 100`, `vipMultiplier: 2`, `couponDivisor: 2`)로 분리, 기본값 `DEFAULT_POINTS_POLICY` — `ShippingPolicy`와 같은 모양.
  - 적립률 bp = `baseRateBp × (VIP ? vipMultiplier : 1) ÷ (쿠폰 ? couponDivisor : 1)` → 일반 100, VIP 200, 일반+쿠폰 50, VIP+쿠폰 100. 모두 정수.
  - 포인트 = `Math.floor((subtotal − discount) × rateBp / 10_000)`. 정수끼리 곱한 뒤 마지막에 한 번만 내림.
- **대안·트레이드오프:**
  - 비율을 소수(0.01, 0.005)로 곱하면 부동소수 오차로 내림 결과가 1 작아질 수 있다(예: `100 * 0.29`) → 정수 bp로 기각.
  - 쿠폰 절반을 "포인트를 먼저 내림한 뒤 절반"으로 하면 이중 내림 → 규칙 5(마지막에 한 번)로 기각.
  - `priceCart`에 포인트 필드 추가 → 금액 계산과 책임이 섞여 기각.
  - `total`에서 `shipping`을 빼서 기준을 구하는 안 → `subtotal − discount`가 정의 그대로라 직접 계산.
- **파일 계획:** `src/pricing/points.ts`, `src/pricing/points.test.ts`, `agents/context/domain.md`(포인트 규칙 절, 완료)
- **위험:** 기본 정책은 정수 bp를 내지만 사용자 주입 정책이 나누어떨어지지 않는 경우(예: 50bp ÷ 4) → 분자·분모를 따로 곱해 `floor(base × rate × mult / (10_000 × divisor))`로 계산하면 정책과 무관하게 정확. 이 방식으로 구현.
- **검증 계획:** 규칙별 단위 테스트, 배송비 제외, 내림 경계값, 등급×쿠폰 4조합, 0원, 잘못된 입력, `pnpm check`.

## 계획과 달라진 점
- 부동소수 위험은 기본 비율(0.01·0.02·0.005)에서는 기준 금액 1~199,999원 범위에서 실제로 나타나지 않았다(직접 측정). 정수 bp 방식은 정책 주입 대비로 유지.
- 쿠폰 절반은 정수 나눗셈 성질상 단계별로 내림해도 결과가 같다. 결과가 달라지는 지점은 **VIP 배수를 내림 뒤에 곱하는 경우**(기준 150원: 2 vs 3)라서, "한 번만 내림" 테스트를 그 사례로 바꿨다.
- 함수에서 런타임 등급 검사(`"VIP" | "NORMAL"` 외 값은 `RangeError`)를 추가했다. 타입 밖의 값이 들어오면 조용히 일반 회원으로 처리되는 것을 막기 위함.

## 검증 결과
- `pnpm check` ALL PASS (Typecheck, Unit tests 116개 — 이번에 11개 추가, lockfile, Task records)
- 규칙 1~6 테스트, 배송비 제외(`priceCart` 결과 사용), 내림 경계값(일반 99/100/199, VIP 49/50, 일반+쿠폰 199/200), 4조합, 0원(빈 장바구니·전액 할인), 잘못된 입력 5종, 정책 주입
