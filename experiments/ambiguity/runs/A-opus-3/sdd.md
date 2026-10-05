# 0030 — 주문 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, domain.md, loop.md, guardrails.md, `src/pricing/price-cart.ts`, `src/money.ts`
- **접근:** `earnPoints(breakdown: PriceBreakdown, opts: { tier: "normal" | "vip"; couponUsed: boolean }): number` 순수 함수. 적립률은 정수 basis point(1% = 100bp)로 두고 `floor(base × bp / 10000)`처럼 정수 연산으로 계산해 부동소수 오차를 피한다(끝수 규칙은 prd 미정 5 확정 후 반영). 쿠폰 사용 여부는 `discount > 0`으로 추론하지 않고 명시 인자로 받는다 — 0003 전이라 discount가 항상 0이고, 0원 쿠폰도 있을 수 있음.
- **대안·트레이드오프:** 비율을 소수(0.01)로 두면 `100_005 × 0.01` 같은 부동소수 오차 위험 → bp 정수 채택. 정책 객체 주입(`PointsPolicy`)으로 배송비 정책처럼 기본값 + 교체 가능하게 한다.
- **파일 계획:** `src/pricing/points.ts`, `src/pricing/points.test.ts`, `agents/context/domain.md`(규칙 추가)
- **위험:** 미정 규칙을 임의로 정하면 도메인 단일 소스가 근거 없는 숫자를 갖게 됨 → 사용자 확인 전 BUILD 보류.
- **검증 계획:** 일반/쿠폰/VIP/쿠폰+VIP × 끝수 경계(예: 99원, 100원, 199원), 0원, 배송비 포함 여부 구분 케이스. `pnpm check`.

## 계획과 달라진 점
(작업 중)

## 검증 결과
(작업 중)
