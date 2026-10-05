# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

> **보류:** prd의 확인 질문 Q1~Q6 답을 받기 전에는 설계를 확정하지 않는다. 아래는 답과 무관한 뼈대만.

## 설계
- **읽은 문서:** AGENTS.md, domain.md, loop.md, guardrails.md, `src/pricing/price-cart.ts`
- **접근:** (잠정) `src/pricing/points.ts`에 순수 함수 하나. 입력 = `PriceBreakdown` + 회원 등급 + 쿠폰 사용 여부, 출력 = 정수 포인트. 비율은 정책 객체(`PointsPolicy`)로 분리 — `DEFAULT_SHIPPING_POLICY`와 같은 방식. 정수 연산으로 계산해 부동소수점 오차를 피한다.
- **대안·트레이드오프:** 쿠폰·VIP 비율을 지금 임의로 정해 구현 → 빠르지만 요구사항을 지어내는 것(0022 문제). 답을 받을 때까지 보류를 택함.
- **파일 계획:** `src/pricing/points.ts`, `src/pricing/points.test.ts`, `agents/context/domain.md`("포인트 적립 규칙" 절 추가)
- **위험:** 쿠폰 판정 입력이 0003(쿠폰) 설계와 어긋날 수 있음(Q6)
- **검증 계획:** 기본·쿠폰·VIP·VIP+쿠폰·소수점 경계·0원 주문 단위 테스트, `pnpm check`

## 계획과 달라진 점
(작업 후 기록)

## 검증 결과
(작업 후 기록)
