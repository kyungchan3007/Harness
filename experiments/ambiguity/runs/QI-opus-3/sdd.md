# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, agents/context/domain.md, agents/context/architecture.md, agents/harness/loop.md, agents/harness/guardrails.md, src/pricing/price-cart.ts, src/money.ts
- **접근:**
  - `earnPoints(breakdown: PriceBreakdown, member: Member, policy = DEFAULT_POINTS_POLICY): number` 순수 함수.
  - 적립률은 **베이시스 포인트(정수, 1% = 100bp)**로 다룬다: 기본 100bp → VIP면 ×2 → 쿠폰이면 ÷2. 포인트 = `Math.floor(base × rateBp / 10_000)`. 모든 중간값이 정수라 부동소수 오차가 없다(예: `10_398 × 0.005`를 실수로 계산하지 않음).
  - `PointsPolicy { baseRateBp, vipMultiplier }`를 `DEFAULT_POINTS_POLICY`로 둔다(배송비 정책과 같은 형태). 쿠폰 절반은 규칙 자체라 정책값으로 빼지 않는다.
  - 입력 검증: `assertWon(subtotal)`, `assertWon(discount)`, `discount > subtotal`이면 RangeError (`priceCart`와 같은 메시지 형식).
- **대안·트레이드오프:**
  - 실수 적립률(`0.01`)로 계산 후 내림: 간단하지만 `x × 0.005` 같은 값이 `51.999…`/`52.000…1`로 흔들려 내림 경계에서 1포인트 틀릴 수 있다 → 기각.
  - 포인트를 먼저 내림한 뒤 절반: `floor(floor(a)/2) = floor(a/2)`라 결과는 같지만 규칙 문장("적립률을 절반")과 구조가 달라 기각.
  - 쿠폰 판정을 별도 `usedCoupon` 플래그로: 요청자가 `discount > 0`으로 정했으므로 기각. (한계: 쿠폰 외 할인이 생기면 이 판정을 다시 봐야 함 → 허점으로 기록)
- **파일 계획:** `src/pricing/points.ts`, `src/pricing/points.test.ts`. 문서: domain.md(규칙 절, 완료), architecture.md(모듈 표, 완료)
- **위험:** 큰 금액에서 `base × 200` 오버플로 — 2^53 / 200 ≈ 4.5×10^13원이라 현실 범위에서 안전. 별도 처리 안 함.
- **검증 계획:** prd 예시 표 전부를 테스트로 옮김(규칙 번호를 테스트 이름에), 잘못된 입력 RangeError, `priceCart` 결과를 그대로 넣는 통합 1건, `pnpm check`.

## 계획과 달라진 점
- 쿠폰 절반을 `rateBp ÷ 2`가 아니라 **분모 ×2**로 구현했다. 정책값을 바꿔 `baseRateBp`가 홀수가 되면(예: 25bp → 12.5bp) 적립률 자체가 정수가 아니게 되기 때문. 수학적으로 같은 값이고 내림은 여전히 마지막 한 번.

## 검증 결과
- `points.test.ts` 11개: prd 예시 표 전부(규칙 1~6) + `priceCart` 결과 직접 입력 + 잘못된 입력 RangeError 3종.
- `pnpm check` ALL PASS (Typecheck, 테스트 116개, lockfile, 기록 검사).
- 허점: 쿠폰 판정이 `discount > 0`이라, 쿠폰이 아닌 할인(예: 등급 할인)이 생기면 포인트가 잘못 절반이 된다 → 할인 종류가 늘 때 판정 기준을 다시 정해야 함. `request.md` 미생성(git remote 없음).
