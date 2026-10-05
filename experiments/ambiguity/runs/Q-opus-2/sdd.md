# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, domain.md, loop.md, guardrails.md, `src/pricing/price-cart.ts`, `src/money.ts`
- **접근:** (초안 — prd 질문 답변 후 확정) `priceCart`가 만든 `PriceBreakdown`과 회원 등급·쿠폰 여부를 받아 적립 포인트(0 이상 정수)를 돌려주는 순수 함수 `calculatePoints`를 `src/pricing/points.ts`에 둔다. 적립률은 정책 객체(`DEFAULT_POINTS_POLICY`)로 분리해 `ShippingPolicy`와 같은 모양으로 맞춘다. 규칙은 domain.md에 "포인트 적립 규칙 (0030)" 절로 먼저 추가한다.
- **대안·트레이드오프:** 미정 (적립 기준 금액·쿠폰 판정 방식 답변에 따라 달라짐)
- **파일 계획:** `agents/context/domain.md`(규칙 추가), `src/pricing/points.ts`, `src/pricing/points.test.ts`
- **위험:** 감액·가산 비율과 정수 처리를 추측하면 규칙이 지어낸 값이 된다 → 답변 전 구현 금지.
- **검증 계획:** 규칙마다 테스트 1개 이상, 정수 처리 경계값(예: 99원·100원·12,345원), VIP×쿠폰 조합 4가지, `pnpm check` PASS

## 계획과 달라진 점
없음 (아직 구현 전)

## 검증 결과
(구현 전)
