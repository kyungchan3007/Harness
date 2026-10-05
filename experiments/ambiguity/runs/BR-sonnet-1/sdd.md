# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md) · 규칙의 단일 소스: [domain.md "포인트 규칙 (0030)"](../../../context/domain.md)

## 설계
- **읽은 문서:** request.md(원문), AGENTS.md, domain.md(결제 금액·배송비 규칙), `src/pricing/price-cart.ts`(`ShippingPolicy` 패턴, `PriceBreakdown`), `src/money.ts`(`Won`, `assertWon`), 0002 sdd.md
- **접근:**
  - **별도 순수 함수.** `src/pricing/points.ts`에 `calculatePoints(price, options)`를 둔다. `priceCart`/`PriceBreakdown`은 건드리지 않는다. 입력은 `priceCart`가 낸 결과 중 `total`, `discount`만 쓰므로 `Pick<PriceBreakdown, "total" | "discount">`로 받는다(그냥 `priceCart(...)` 결과를 넘기면 된다).
  - **요율은 정책 객체.** `ShippingPolicy`처럼 `PointsPolicy`를 인자로 주입하고 기본값 `DEFAULT_POINTS_POLICY`를 둔다. 숫자는 이 상수 한 곳에만 있고 계산 로직에는 없다(단위 상수 `BP_DENOMINATOR = 10_000`만 예외).
  - **요율은 만분율 정수(bp).** 1% = 100. 부동소수점(`0.01`) 곱셈은 `total × 0.01`에서 오차가 날 수 있어 쓰지 않는다.
  - **(등급, 쿠폰 여부) 표 직접 조회.** 곱셈/가산 조합 규칙을 두지 않아 "VIP+쿠폰" 우선순위가 정책 값 하나로 드러난다(domain.md 규칙 4).
  - **쿠폰 여부 = `discount > 0`.** (domain.md 규칙 5, 가정)
  - **정수 연산만, 내림.** `total = 10000·q + r`로 쪼개 `points = q·rate + floor(r·rate / 10000)`. 수학적으로 `floor(total·rate/10000)`와 같고(`q·rate`가 정수이므로), `total·rate`가 `MAX_SAFE_INTEGER`를 넘는 큰 금액에서도 정확하다.
- **시그니처(그대로 구현):**
  ```ts
  import type { PriceBreakdown } from "./price-cart.js";
  import { assertWon, type Won } from "../money.js";

  /** 포인트. 0 이상의 정수 (domain.md 포인트 규칙 1) */
  export type Points = number;

  /** 회원 등급. 판정은 엔진 밖 (원문에 등급 이름 없음 — 설계 결정) */
  export type MemberTier = "regular" | "vip";

  /** 적립률: 만분율 정수. 1% = 100 */
  export type RateBp = number;

  export interface TierRates {
    /** 쿠폰을 쓰지 않은 주문 */
    standard: RateBp;
    /** 쿠폰 주문 (discount > 0) */
    withCoupon: RateBp;
  }

  export interface PointsPolicy {
    rates: Record<MemberTier, TierRates>;
  }

  /** 값은 domain.md "포인트 규칙 (0030)" 표와 같아야 한다. regular.standard만 원문 확정, 나머지는 가정 */
  export const DEFAULT_POINTS_POLICY: PointsPolicy = {
    rates: {
      regular: { standard: 100, withCoupon: 50 },
      vip: { standard: 200, withCoupon: 100 },
    },
  };

  export interface PointsOptions {
    /** 기본 "regular" */
    tier?: MemberTier;
    /** 기본 DEFAULT_POINTS_POLICY */
    policy?: PointsPolicy;
  }

  /** 정책이 domain.md 규칙 6·8을 지키는지 검사. 위반 시 RangeError */
  export function assertPointsPolicy(policy: PointsPolicy): void;

  export function calculatePoints(
    price: Pick<PriceBreakdown, "total" | "discount">,
    options?: PointsOptions,
  ): Points;
  ```
- **`calculatePoints` 동작 순서:**
  1. `const { tier = "regular", policy = DEFAULT_POINTS_POLICY } = options`
  2. `assertWon(price.total, "total")`, `assertWon(price.discount, "discount")` (잘못되면 `RangeError`)
  3. `tier`가 `policy.rates`에 없는 키면 `RangeError`(런타임 검사: JS 호출·`as` 우회 대비. `Object.hasOwn` 사용)
  4. `assertPointsPolicy(policy)`
  5. `rate = price.discount > 0 ? rates.withCoupon : rates.standard`
  6. 위 `q`/`r` 분해로 계산해 반환
- **`assertPointsPolicy` 검사:** 모든 등급·두 요율이 `Number.isInteger`이고 0 이상 10,000 이하 / 각 등급에서 `withCoupon < standard` / 각 쿠폰 여부에서 `vip > regular`(`vip.standard > regular.standard`, `vip.withCoupon > regular.withCoupon`). 위반하면 어느 값이 문제인지 적은 `RangeError`.
- **대안·트레이드오프:**
  - 요율을 `number`(0.01)로: 읽기 쉽지만 부동소수점 오차 위험(`0.07 × 100` 류). → 기각, bp 정수.
  - 쿠폰 감산과 VIP 가산을 곱셈 조합(`base × couponFactor × vipFactor`): 요율 수가 적고 일반적이지만 "VIP+쿠폰"이 의도치 않은 값이 될 수 있고 비정수 요율이 생긴다. → 기각, 4칸 표를 직접 조회(우선순위가 값으로 명시됨). 대가: 등급이 늘면 칸이 늘어난다.
  - `Math.floor(total * rate / 10000)`: 단순하지만 `total × rate`가 큰 금액에서 안전 정수를 넘는다. → 기각, `q`/`r` 분해(코드가 3줄 더 길 뿐).
  - 반올림/올림: 소액 주문에 포인트가 생기지만 총 적립이 결제액의 1%를 넘을 수 있다(회사 부담). → 기각, 내림(가정, 질문 5). 정책에 `rounding` 옵션을 넣는 것은 요구에 없어 과설계라 보류.
  - `couponUsed: boolean`을 입력으로: 판정이 명시적이지만 호출자가 `discount`와 모순된 값을 줄 수 있다. → 기각, `discount > 0`에서 파생. 쿠폰 외 할인이 생기면 이 판정을 바꾼다(질문 3).
  - 등급 판정을 `src/`에서: 원문에 판정 기준이 없다. → 기각, 입력으로 받는다.
  - `PriceBreakdown`에 `points` 필드 추가: 한 번에 얻지만 0002 테스트·시그니처를 깨고 정책 결합이 생긴다. → 기각.
- **파일 계획:**
  - `src/pricing/points.ts` — 위 시그니처 구현 (신규)
  - `src/pricing/points.test.ts` — 테스트 (신규). 기존 `price-cart.ts`·`cart.ts`는 수정하지 않는다.
  - `agents/context/domain.md` 포인트 규칙 (설계자가 작성 완료). 구현 중 규칙이 틀리면 builder는 코드가 아니라 trace에 적어 designer에게 넘긴다.
- **위험:**
  - 요율·감산·내림·배송비 포함·`discount > 0` 판정이 전부 가정이라 요청자 답에 따라 값이 바뀔 수 있다. → 정책 분리 + 테스트가 정책 값을 domain.md 표와 대조. 값이 바뀌면 상수·표·경계 테스트 입력만 갱신.
  - `discount > 0`이 쿠폰이 아닌 할인까지 쿠폰 주문으로 본다. → 현재 쿠폰 외 할인은 없고 domain.md 규칙 5에 전제를 명시.
  - 테스트가 가정값을 하드코딩하면 정책을 바꿀 때 깨진다. → 기본 정책을 쓰는 규칙 테스트와, 정책을 직접 주입하는 테스트(동작 자체 검증)를 분리.
- **검증 계획:**
  - `points.test.ts`에서 테스트 이름에 domain.md 규칙 번호를 붙여 1:1 추적(0002 방식).
  - 규칙 1·3 기본 요율/내림 경계: `total` 99→0, 100→1, 199→1, 200→2, 10,000→100
  - 규칙 7: `total` 0 → 모든 등급·쿠폰 조합에서 0
  - 규칙 4·5·6 쿠폰: `discount` 0 → 일반 요율(100), 1 → 쿠폰 요율. 10,000→50, 199→0, 200→1
  - 규칙 4·6 VIP: 10,000→200, 49→0, 50→1. VIP+쿠폰: 10,000→100, 99→0, 100→1
  - 규칙 2 배송비 포함: `priceCart([{unitPrice 40_000, qty 1}])`(`total` 43,000)→430, `{discount: 1_000}`(`total` 42,000)→210, 무료배송 경계 `subtotal` 50,000(`total` 50,000)→500
  - 규칙 9 정확성: `total` 9007199254740991 → 90071992547409. 여러 입력에서 `Number.isInteger(result) && result >= 0`
  - 규칙 8 검증: `total` −1 / 1.5 / NaN / `2**53`, `discount` 동일, 알 수 없는 `tier` → `RangeError`
  - 정책 주입: 커스텀 정책으로 요율 변경 반영, `assertPointsPolicy` 위반 케이스(범위 밖 요율, 소수 요율, `withCoupon >= standard`, `vip <= regular` 각각) → `RangeError`
  - `DEFAULT_POINTS_POLICY`가 domain.md 표(100/50/200/100)와 같음을 단언
  - `pnpm check` ALL PASS (Typecheck, 기존 테스트 포함 전체)

## 계획과 달라진 점
(구현 후 builder/verifier가 trace.md 기준으로 채움. 현재: 없음)

## 검증 결과
(구현·검증 후 기록)
