# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, agents/context/domain.md, agents/context/architecture.md, agents/harness/loop.md, src/pricing/price-cart.ts, src/money.ts
- **접근:** 순수 함수 `earnPoints(breakdown: PriceBreakdown, member: Member): number`. 적립률은 베이시스포인트(1% = 100bp) 정수로 들고, `Math.floor(base * bp / 10_000)`으로 계산해 부동소수(`× 0.01`) 오차를 피한다.
  - bp = 100 → VIP면 ×2 → 쿠폰(`discount > 0`)이면 ÷2. 100이 2로 나누어떨어지므로 bp는 항상 정수다.
- **입력 검증:** `subtotal`·`discount`는 `assertWon`. `discount > subtotal`이면 `RangeError`(priceCart와 같은 불변식). `grade`가 VIP/NORMAL이 아니면 `RangeError`(JS 호출자 대비).
- **대안·트레이드오프:**
  - `total − shipping`으로 기준 금액 계산 → `subtotal − discount`와 같지만 빈 장바구니 특례 등 priceCart 내부에 기대게 되므로 규칙 원문 그대로 `subtotal − discount` 사용.
  - 정책 객체(`DEFAULT_POINTS_POLICY`)로 적립률 분리 → 요구에 정책 교체가 없어 YAGNI. 상수 하나(`BASE_RATE_BP`)만 둔다.
- **파일 계획:** `src/pricing/points.ts`, `src/pricing/points.test.ts`, domain.md(규칙 절), architecture.md(모듈 표)
- **위험:** 쿠폰(0003)이 discount를 쿠폰 외 할인에도 쓰게 되면 "discount > 0 = 쿠폰" 판정이 틀어진다 → 요청자 답(Q6)대로 구현하고 위험만 기록.
- **검증 계획:** 등급×쿠폰 4조합 적립률, 배송비 제외, 내림 경계(99→0, 100→1, 199→1), 쿠폰 0.5% 경계(199→0, 200→1), 0원, 잘못된 입력 거부.

## 계획과 달라진 점
없음

## 검증 결과
- `pnpm check` ALL PASS (Typecheck, Unit tests 113개, lockfile, Task records) — 2026-10-07
- `points.test.ts` 8개: 규칙 1~6 + 입력 거부. 경계: 99→0, 100→1, 199→1, 쿠폰 199→0 / 200→1, 12,345원 NORMAL 123 / VIP 246, discount 1원도 쿠폰 판정
