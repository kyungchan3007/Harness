# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, domain.md(용어 "결제 금액", Won 정수 규칙), loop.md, guardrails.md, branch-and-issue.md, `src/pricing/price-cart.ts`(PriceBreakdown·주입 가능한 ShippingPolicy 패턴), `src/money.ts`
- **접근:** `earnPoints(total, { couponUsed, vip }, policy?)` 순수 함수. 요율은 만분율 정수 4개(기본·쿠폰·VIP·VIP+쿠폰)를 `PointPolicy`로 두고 `DEFAULT_POINT_POLICY`를 기본값으로 쓴다(배송 정책과 같은 패턴). 계산은 `floor(total/10000)*bp + floor((total%10000)*bp/10000)`로 해서 `total × bp`가 안전 정수 범위를 넘는 큰 금액에서도 정확하다. 입력 검증은 `assertWon(total)`을 재사용한다.
- **대안·트레이드오프:**
  - 요율을 `0.01` 같은 실수로 → 부동소수점 오차(예: 0.07 × 100)로 내림 경계가 틀어질 수 있어 기각, 만분율 정수 채택.
  - 쿠폰 사용을 `PriceBreakdown.discount > 0`으로 추론 → 쿠폰 외 할인과 구분 불가, 호출 한 줄 줄이는 이득보다 오판 위험이 커서 명시 인자 채택.
  - 요율을 곱셈 배수(VIP ×2, 쿠폰 ×0.5)로 → 조합 규칙이 암묵적이 됨. 4칸 표가 정책 변경이 쉽고 읽기 쉬워 채택.
  - `priceCart` 결과에 포인트를 합치기 → 가격 계산의 반환 형태를 바꿔 기존 호출자·테스트에 영향. 별도 함수로 분리.
- **파일 계획:** `src/pricing/points.ts`(신규), `src/pricing/points.test.ts`(신규), `agents/context/domain.md`(포인트 규칙 절 추가). 공통 모듈(`money.ts`)은 건드리지 않는다.
- **위험:** 수치·기준 금액이 모두 잠정 가정이다. 확정 전에 다른 코드가 이 수치에 의존하면 굳는다 → 정책 주입 + domain.md "잠정" 표기 + 사용자 확인 요청으로 완화. VIP 판정과 쿠폰 판정은 호출자 책임이라 둘이 어긋나도 이 함수는 알 수 없다.
- **검증 계획:** 규칙별 단위 테스트(domain.md 번호 인용), 내림 경계(99→0, 100→1, 199→1), 0원, 조합 4종, 정책 주입, 잘못된 입력, 큰 금액. `pnpm check`.

## 계획과 달라진 점
(작업 후 기록)

## 검증 결과
(작업 후 기록)
