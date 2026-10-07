# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, context/domain.md, context/architecture.md, `src/pricing/price-cart.ts`, `src/money.ts`, 0002 sdd
- **접근:**
  - `src/pricing/points.ts`에 순수 함수 `calculatePoints(breakdown: PriceBreakdown, member: Member): number`와 `Member = { grade: "VIP" | "NORMAL" }`를 둔다. `priceCart`는 건드리지 않는다(architecture: 가격 계산에 정책을 섞지 않는다).
  - 적립률은 만분율(basis points)로 표현한다: NORMAL 100, VIP 200이 기본이고, 쿠폰(`discount > 0`)이면 절반(`/ 2`). 모든 조합이 정수(100·50·200·100)로 떨어진다.
  - 포인트 = `⌊기준금액 × bp / 10,000⌋`. 정수 곱과 나머지 연산(`x - x % 10000) / 10000`)으로 내림해 부동소수점 오차를 피한다.
  - 기준금액 = `subtotal − discount`. `shipping`·`total`은 사용하지 않는다.
  - 입력 경계에서 `assertWon`으로 `subtotal`·`discount` 검증, `discount > subtotal`이면 `RangeError`(`priceCart`와 같은 규칙).
  - 0포인트는 그대로 반환한다(요청자 미정 → 에이전트 결정, prd에 명시).
- **대안·트레이드오프:**
  - 적립률을 `0.01` 같은 실수로 곱하기: 0.5%·2% 곱셈에서 `12_350 * 0.01`류 부동소수점 오차로 내림 경계가 틀어질 수 있다. → 기각. 만분율 정수.
  - `total`(배송비 포함) 기준: 구현은 쉽지만 요청자가 배송비 제외로 확정. → 기각.
  - `priceCart`가 포인트까지 반환: 호출부는 편하지만 가격 계산과 회원 정책이 섞이고 `priceCart`의 반환 형태가 바뀌어 기존 테스트가 깨진다. → 기각. 별도 함수.
  - 쿠폰 여부를 별도 불리언 입력으로: 요청자가 `discount > 0`으로 확정, 입력이 이중화되어 모순 가능. → 기각.
  - 등급 외 문자열 런타임 검사: 타입이 `"VIP" | "NORMAL"`로 막고 있어 추가 검사는 하지 않는다. 타입 밖 값이 들어오는 경계(JSON 파싱 등)는 이 모듈 범위 밖.
- **파일 계획:** `src/pricing/points.ts`(+`points.test.ts`), `agents/context/domain.md`(완료), architecture.md 모듈 표에 한 줄 추가
- **위험:**
  - `discount`가 0이 아닌 1원이어도 쿠폰 사용으로 취급해 절반이 된다 → 요청자 결정대로이며 경계 테스트로 고정.
  - 큰 금액에서 `기준금액 × 200`이 안전 정수 범위를 넘을 수 있다 → 곱셈 결과도 `Number.isSafeInteger`로 확인해 넘으면 거부.
- **검증 계획:** 규칙 1~7별 단위 테스트(이름에 규칙 번호), 4가지 등급·쿠폰 조합 표 테스트, 내림 경계(예: 99원/100원 → 0/1포인트, 12,350원 → 123포인트), `discount` 0/1 경계, 배송비가 결과에 영향 없음, 잘못된 입력 거부, `pnpm check`

## 검증 결과
- `pnpm check`: ALL PASS (Typecheck, 단위 테스트 117개 중 포인트 12개, lockfile, task records)
- 규칙 1~7: 테스트 이름에 규칙 번호를 붙여 domain.md와 1:1로 추적
- 4가지 조합: NORMAL 1% / NORMAL+쿠폰 0.5% / VIP 2% / VIP+쿠폰 1%
- 경계: discount 0원(쿠폰 아님) / 1원(쿠폰), 99·100원(0/1포인트), 12,350원 → 123, 10조원대에서 내림 오차 없음, `MAX_SAFE_INTEGER` 입력 거부
- 공백: 테스트가 만든 `priceCart` 결과만 입력으로 쓰므로 `total`이 `subtotal − discount + shipping`과 어긋난 입력은 검사하지 않는다(적립은 `total`을 쓰지 않음)
