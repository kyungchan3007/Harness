# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

> **초안 — PRD Q1~Q8 답을 받기 전에는 구현하지 않는다.** 아래는 답과 무관한 골격만 적는다.

## 설계
- **읽은 문서:** [domain.md](../../context/domain.md), [loop.md](../../harness/loop.md), `src/pricing/price-cart.ts`, `src/money.ts`
- **접근:** `priceCart`의 `PriceBreakdown`(또는 Q1에 따라 그중 필요한 값)과 회원·쿠폰 정보를 받아 정수 포인트를 반환하는 순수 함수 `calculatePoints`. 적립률 등 수치는 `DEFAULT_POINTS_POLICY` 상수로 모아 `DEFAULT_SHIPPING_POLICY`와 같은 방식으로 주입 가능하게 한다. 입력 금액은 `assertWon`으로 검증.
- **대안·트레이드오프:** 비율을 부동소수(0.01)로 곱하면 `x * 0.01` 오차로 단수 처리가 틀릴 수 있다 → 적립률을 **천분율/만분율 정수**로 두고 `Math.floor(amount * rate / 1000)`처럼 정수 연산 후 단수 처리(Q2 확정 시 방식 결정).
- **파일 계획:** `src/pricing/points.ts`, `src/pricing/points.test.ts`, `agents/context/domain.md`(규칙 추가)
- **위험:** 쿠폰(0003) 미구현 상태라 쿠폰 판정 입력(Q4)이 0003 설계와 어긋날 수 있음.
- **검증 계획:** 규칙별 단위 테스트 + 단수 경계값(예: 99원·100원·12,345원) + VIP×쿠폰 조합 표 테스트 + 0원 주문.

## 계획과 달라진 점
(구현 전)

## 검증 결과
(구현 전)
