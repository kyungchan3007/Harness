# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, harness/loop.md, harness/branch-and-issue.md, context/domain.md, context/architecture.md, 0002 spec, `src/pricing/price-cart.ts`, `src/money.ts`
- **접근:**
  - `src/pricing/points.ts`에 순수 함수 `calcPoints(breakdown, member)`. `breakdown`은 `priceCart`의 `PriceBreakdown`, `member`는 `{ grade: "VIP" | "NORMAL" }`.
  - 적립률은 **천분율(‰) 정수**로 둔다: 일반 10‰, VIP 20‰. 쿠폰 사용 시 절반(`/ 2`, 5‰·10‰은 항상 정수).
  - `points = Math.floor(((subtotal − discount) × 천분율) / 1000)`. 곱셈·나눗셈 모두 정수라 부동소수점 오차(예: `0.01 × 1950`)가 없다.
  - 쿠폰 사용 판정은 `discount > 0` (요청자 확정). `priceCart`가 할인을 쿠폰 외 경로로 받아도 같은 취급이 되는 점은 알려진 한계.
  - 입력 경계에서 `assertWon`으로 `subtotal`·`discount`를 검증하고, `discount > subtotal`·알 수 없는 등급은 `RangeError`.
- **대안·트레이드오프:**
  - 소수 적립률(0.01, 0.005)을 곱하고 `Math.floor`: 간단하지만 `0.01 × 100`류에서 부동소수점 오차로 경계값(예: 99.99999…)이 틀어질 수 있다. → 기각, 천분율 정수 사용.
  - 적립 기준을 `total`에서 배송비를 빼서 구하기: 결국 `subtotal − discount`와 같아 간접적이다. → 기각, 직접 계산.
  - 회원 정보를 `isVip: boolean`으로: 단순하지만 요청자가 `{ grade }` 형태를 확정했고 등급 추가에 열려 있다. → `{ grade }` 채택.
  - 등급별 적립률 표를 `Record<Grade, number>`로: 새 등급이 생기면 컴파일러가 누락을 알려준다. → 채택.
- **파일 계획:** `src/pricing/points.ts`(+`points.test.ts`), `agents/context/domain.md`(포인트 규칙), `agents/context/architecture.md`(모듈 표), TASKS·JOURNAL
- **위험:**
  - "쿠폰 사용 = `discount > 0`"이 쿠폰 모듈(0003) 도입 후 다른 할인(예: 프로모션)과 구분이 필요해질 수 있다 → 그때 입력에 쿠폰 여부를 명시적으로 추가.
  - 규칙 번호↔테스트 대응을 게이트가 검사하지 못한다(0002에서 확인된 공백) → 테스트 이름에 규칙 번호를 붙여 수동 추적.
- **검증 계획:** 규칙별 단위 테스트(경계값: 일반 99/100, VIP 49/50, 쿠폰 일반 199/200, 쿠폰 VIP 99/100), 배송비 무관 테스트, 검증 오류 테스트, 큰 금액 정수성 테스트, `pnpm check`

## 계획과 달라진 점
- 알 수 없는 등급 검사에 `Object.hasOwn`을 썼다. `"toString"` 같은 프로토타입 키가 `Record` 조회를 통과해 `NaN`을 만들 수 있어서(테스트로 고정).
- 그 외 없음.

## 검증 결과
- `pnpm check`: ALL PASS (Typecheck, 단위 테스트 127개 중 `points.test.ts` 22개, lockfile, 태스크 기록)
- domain.md 포인트 규칙 1~5를 테스트 이름의 규칙 번호로 1:1 추적
- 경계값: 일반 99/100, VIP 49/50, 일반+쿠폰 199/200, VIP+쿠폰 99/100, 1,950원 → 19
- 공백: 게이트는 "domain.md의 모든 규칙에 테스트가 있는지"를 여전히 검사하지 못한다(0002와 같은 공백, 수동 추적)
- 공백: `discount > 0` = 쿠폰 사용이라는 가정은 쿠폰 모듈(0003)이 생기면 재검토 필요(다른 할인과 구분 불가)
