# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, [loop.md](../../../harness/loop.md), [guardrails.md](../../../harness/guardrails.md), [domain.md](../../context/domain.md), [architecture.md](../../context/architecture.md), `src/pricing/price-cart.ts`, `src/money.ts`
- **접근:** 순수 함수 `calculatePoints(breakdown: PriceBreakdown, member: Member): number`를 `src/pricing/points.ts`에 둔다. `Member = { grade: "VIP" | "NORMAL" }`. 적립률은 정수 퍼센트(`NORMAL` 1, `VIP` 3)로 두고, `NORMAL`이면서 `discount > 0`이면 0을 돌려준다. 반올림은 정수 연산 `Math.floor((subtotal × rate + 50) / 100)`으로 한다.
- **대안·트레이드오프:**
  - `Math.round(subtotal * 0.01)` — 짧다. `0.01`·`0.03`이 2진수로 정확하지 않아 오차가 걱정됐지만, 0~2천만 원 전수 대조에서는 정수 연산과 결과가 같았다(trace 참고). 그래도 정수 연산은 오차 걱정 자체가 없어 정수 연산을 택했다.
  - 정책 객체 주입(`ShippingPolicy`처럼) — 요구에 정책 변경이 없고 Q7 범위가 계산만이라 지금은 상수로 둔다(YAGNI). 필요해지면 옵션 인자로 추가.
  - `PriceBreakdown` 전체를 받는 이유 — Q6·Q8 답이 입력을 이렇게 정했다. 실제로 쓰는 필드는 `subtotal`·`discount`뿐.
- **파일 계획:** `src/pricing/points.ts`, `src/pricing/points.test.ts`, `agents/context/domain.md`(포인트 규칙 절), `agents/context/architecture.md`(모듈 표)
- **위험:** 0003에서 쿠폰이 아닌 할인이 `discount`로 들어오면 쿠폰으로 오판정된다(Q8 답에 따른 의도된 판정, 0003에서 재검토). 런타임에 잘못된 `grade`·금액이 들어오면 조용히 틀리지 않도록 `RangeError`로 거부한다.
- **검증 계획:** 규칙 1~6 테스트(이름에 규칙 번호), 반올림 경계 149/150원(일반)·16/17·49/50원(VIP), 끝자리 5·50원과 큰 금액, 4가지 조합, 잘못된 입력 거부, `pnpm check`.

## 계획과 달라진 점
- 처음 설계에 "`1005 * 0.01 = 10.049999…`"라는 부동소수 함정 예시를 적었는데, 실행해 보니 틀렸다(`10.05`). 0~2천만 원 전수 대조에서도 단순 곱셈과 정수 연산이 결과가 같았다. 정수 연산은 유지하되, 테스트 이름에서 "부동소수 함정" 표현을 빼고 대안 설명을 사실대로 고쳤다.

## 검증 결과
- `src/pricing/points.test.ts` 12개 테스트 추가, 전체 117개 통과
- 규칙 1~6 각각 테스트 있음, 4가지 조합, 반올림 경계, 0~2,000원 정수·비음수 확인
- `pnpm check` ALL PASS (Typecheck · Unit tests · lockfile · Task records)
