# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, loop.md, guardrails.md, domain.md, architecture.md, `src/pricing/price-cart.ts`
- **접근:** (초안) `priceCart`처럼 순수 함수 `earnPoints(input) → number`. 입력은 기준 금액·쿠폰 사용 여부·VIP 여부. 적립률은 정책 객체(`DEFAULT_POINTS_POLICY`)로 분리해 `DEFAULT_SHIPPING_POLICY`와 같은 모양으로 둔다. 금액 검증은 `assertWon` 재사용.
- **대안·트레이드오프:** 적립률을 실수(0.01)로 곱하면 부동소수 오차로 정수 경계가 틀릴 수 있다 → 퍼밀/베이시스포인트 정수로 계산 후 정수 나눗셈.
- **파일 계획:** `src/pricing/points.ts`, `src/pricing/points.test.ts`, `agents/context/domain.md`(포인트 규칙 절 추가)
- **위험:** prd 미결 1~6이 확정되지 않으면 수치를 지어내게 됨 → 확정 전 BUILD 금지.
- **검증 계획:** 규칙별 단위 테스트 + 정수 경계(예: 99원 → 0P, 100원 → 1P) + `pnpm check`.

## 계획과 달라진 점
(작업 후 작성)

## 검증 결과
(작업 후 작성)
