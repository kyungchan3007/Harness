# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** domain.md(원 단위·결제 금액·할인), `src/money.ts`(`assertWon`), `src/pricing/price-cart.ts`(`PriceBreakdown`)
- **접근:** `calcPoints(price: PriceBreakdown, member: Member): number` 순수 함수.
  - 기준 금액 `base = subtotal − discount`
  - 정수 연산만 사용: 적립률의 역수 `divisor`(NORMAL 100 · NORMAL+쿠폰 200 · VIP 50 · VIP+쿠폰 100)로 `(base − base % divisor) / divisor`. 부동소수점(0.01, 0.005)과 `base × 2` 곱셈을 쓰지 않아 내림 경계와 큰 금액(안전 정수 근처)에서도 정확하다
  - 모든 조합: NORMAL 1% · NORMAL+쿠폰 0.5% · VIP 2% · VIP+쿠폰 1% (규칙 5의 "2배 먼저, 절반 나중"과 곱셈은 교환 가능하므로 결과 동일)
  - 입력 검증: `subtotal`·`discount`를 `assertWon`, `discount > subtotal`이면 `RangeError`, 모르는 `grade`는 `RangeError`(런타임에서 JS 호출·역직렬화 값 방어)
- **대안·트레이드오프:** (a) 적립률을 `rate = 0.01 * ...`로 곱해 `Math.floor` → 부동소수점 오차로 경계값에서 1P 틀릴 수 있어 기각. (b) 적립 정책 객체(`PointsPolicy`)로 주입 → 지금 규칙이 하나뿐이라 과설계, 정책이 바뀔 때 도입
- **파일 계획:** `src/pricing/points.ts`, `src/pricing/points.test.ts`
- **위험:** `discount > 0`을 쿠폰 사용으로 보는 것은 요청자 결정이다. 쿠폰 외 할인이 생기면 규칙 4를 spec으로 다시 정해야 한다. `shipping`·`total`은 사용하지 않는다(요청자가 입력 형태를 `PriceBreakdown`으로 정함)
- **검증 계획:** 규칙별 단위 테스트(4개 조합, 내림 경계, 배송비 무영향, 0원·빈 장바구니, 잘못된 입력), `priceCart`와 연결한 통합 케이스 1개, `pnpm check`

## 계획과 달라진 점
- 계산식을 `floor(base × vipFactor / …)`에서 `(base − base % divisor) / divisor`로 바꿨다. VIP의 `base × 2`가 안전 정수를 넘을 수 있어서다.
- 입력 타입을 `PriceBreakdown` 전체 대신 `Pick<PriceBreakdown, "subtotal" | "discount">`로 좁혔다(`shipping`·`total`은 쓰지 않음). `PriceBreakdown`을 그대로 넘겨도 호환된다.

## 검증 결과
- `src/pricing/points.test.ts` 10개: 4개 조합, 배송비 무영향, 내림 경계, 안전 정수 근처 큰 금액, 0원, `priceCart` 연결, 잘못된 입력.
- 1차 게이트 실패 1건은 테스트 기대값 계산 오류(기준 49,999 × 0.5% = 249.995 → 249)였고 코드는 규칙대로였다. 수정 후 `pnpm check` ALL PASS(11개 파일, 115 테스트).
