# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

> **초안.** prd.md 열린 질문(Q1~Q9)의 답에 따라 수치·시그니처가 바뀐다. 답을 받기 전 BUILD 금지.

## 설계
- **읽은 문서:** AGENTS.md, agents/context/domain.md, agents/harness/loop.md, src/pricing/price-cart.ts, src/money.ts
- **접근:** `priceCart`의 `PriceBreakdown`을 입력으로 받는 순수 함수 `earnPoints(breakdown, { usedCoupon, tier })`. 정책 값(기본율·쿠폰율·VIP율)은 `ShippingPolicy`처럼 `PointsPolicy` 객체 + `DEFAULT_POINTS_POLICY`로 분리해 숫자가 바뀌어도 함수는 그대로 둔다. 비율은 부동소수 오차를 피하려고 퍼밀/분수 정수로 계산(예: `Math.floor(base * 10 / 1000)`).
- **대안·트레이드오프:** `PriceBreakdown` 대신 금액 숫자만 받기 — 더 단순하지만 Q1(배송비 포함 여부)을 호출자에게 떠넘김. 정책 객체 없이 상수 하드코딩 — 짧지만 0005·쿠폰 모듈(0003)과 맞물릴 때 바꾸기 어려움.
- **파일 계획:** `src/pricing/points.ts`, `src/pricing/points.test.ts`, `agents/context/domain.md`(규칙 추가)
- **위험:** 쿠폰 모듈(0003)이 생기면 "쿠폰 사용" 판정(Q4)이 바뀔 수 있음. 부동소수 곱셈으로 1% 계산 시 경계값 오차.
- **검증 계획:** 단위 테스트로 경계값(99원→0, 100원→1, 기준 금액에 배송비 포함 여부, 쿠폰·VIP 각각과 조합), 음수·비정수 입력 거부, `pnpm check`.

## 계획과 달라진 점
(아직 BUILD 전)

## 검증 결과
(아직 BUILD 전)
