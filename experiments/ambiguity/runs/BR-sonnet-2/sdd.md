# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md) · 원문: [request.md](request.md) · 규칙 단일 소스: [domain.md](../../../context/domain.md)

## 설계
- **읽은 문서:** request.md(원문), AGENTS.md, agents/context/domain.md, `src/money.ts`(`Won`·`assertWon`), `src/pricing/price-cart.ts`(`PriceBreakdown`·`PriceOptions`), 0002 sdd.md(형식·테스트 규칙 번호 추적 관례)
- **접근:**
  - `src/pricing/points.ts`에 순수 함수 `earnPoints`를 둔다. 입력은 결제 금액(`total`)과 `{ couponUsed, grade }`, 출력은 `Points`(0 이상 정수).
  - 적립률은 **베이시스 포인트(bp) 정수 표 하나**(`POINT_RATES_BP`)에 모은다. 요청자가 수치를 바꾸려면 이 표(와 domain.md 표)만 고친다. 계산 함수 안에는 숫자가 없다(분모 `BP_DENOMINATOR = 10_000`은 단위 정의).
  - 정수 계산: `total × bp ÷ 10_000`을 내림. `total × bp`가 안전 정수를 넘을 수 있으므로 `q = ⌊total/10_000⌋`, `r = total % 10_000`로 나눠 `q × bp + ⌊r × bp / 10_000⌋`로 계산한다(수학적으로 정확히 같은 값, 중간값이 안전 정수 안). 부동소수 곱셈(`total * 0.01`) 금지.
  - 쿠폰 사용 여부는 `discount`에서 추론하지 않고 `couponUsed` 플래그로 받는다. `total`만 필요하므로 첫 인자 타입은 `Pick<PriceBreakdown, "total">`이라 `priceCart` 결과를 그대로 넘길 수 있다.
  - 검증은 기존 `assertWon(total, "total")` 재사용, 등급은 런타임 검사(JS 호출자 대비) 후 `RangeError`.
- **공개 API (`src/pricing/points.ts`의 export, 이름·형태를 이대로 구현):**

  ```ts
  import type { PriceBreakdown } from "./price-cart.js";
  import type { Won } from "../money.js";

  /** 포인트. 항상 0 이상의 정수 (1포인트 단위) */
  export type Points = number;
  export type MemberGrade = "NORMAL" | "VIP";

  export interface PointRate {
    /** 쿠폰을 쓰지 않은 주문의 적립률 (bp) */
    standard: number;
    /** 쿠폰을 쓴 주문의 적립률 (bp) */
    withCoupon: number;
  }

  /** 1bp = 0.01%, 100% = 10_000bp */
  export const BP_DENOMINATOR = 10_000;

  /** 적립률의 단일 소스. 수치는 여기서만 바꾼다. domain.md "포인트 적립 규칙 (0030)" 표와 같아야 한다 */
  export const POINT_RATES_BP: Readonly<Record<MemberGrade, Readonly<PointRate>>> = {
    NORMAL: { standard: 100, withCoupon: 50 },
    VIP: { standard: 200, withCoupon: 100 },
  };

  export interface PointOptions {
    /** 쿠폰을 쓴 주문인지 (기본 false). discount 금액에서 추론하지 않는다 */
    couponUsed?: boolean;
    /** 회원 등급 (기본 "NORMAL") */
    grade?: MemberGrade;
  }

  /** @throws RangeError total이 0 이상의 안전한 정수가 아니거나 grade가 알 수 없는 값 */
  export function earnPoints(payment: Pick<PriceBreakdown, "total">, options?: PointOptions): Points;
  ```

  `Points`는 `Won`과 같은 `number` 별칭이다(0002 sdd에서 브랜드 타입을 미룬 결정을 따름). `earnPoints(priceCart(items, { discount }), { couponUsed: true, grade: "VIP" })` 형태로 쓴다.
- **대안·트레이드오프:**
  - 적립률을 소수(`0.01`)로 두고 곱한 뒤 `Math.floor`: 읽기 쉽지만 `0.01`이 이진 부동소수로 정확하지 않아 `199 × 0.01` 같은 경계에서 오차가 날 수 있다. → 기각. bp 정수 + 정수 연산.
  - `BigInt`로 계산: 단순하지만 `number` 기반 `Won`과 변환이 섞인다. → 기각. 몫·나머지 분리로 `number` 안에서 정확히 계산.
  - 쿠폰 여부를 `discount > 0`으로 판정: 호출자가 플래그를 안 넘겨도 되지만, 쿠폰이 아닌 할인과 금액 0 쿠폰(배송비 쿠폰 등)을 구분 못 하고 0003의 쿠폰 모델이 정해지지 않았다. → 기각. 명시 `couponUsed`. 호출자 실수 위험(쿠폰을 쓰고도 플래그를 빠뜨림)은 0003/주문 연결 시 한 곳에서 채우도록 넘긴다.
  - VIP를 `isVip: boolean`으로: 더 단순. → 기각. 등급이 늘 가능성이 크고 상수 표가 등급을 키로 하면 확장이 한 곳에서 끝난다. 단, 지금은 두 값뿐이라 과설계가 되지 않게 표 구조만 일반화한다.
  - 기준 금액을 상품 합계나 할인 후 상품 금액(배송비 제외)으로: 배송비로 포인트를 주는 것이 어색할 수 있다. 그러나 원문이 "결제 금액"이라 했고 domain.md의 결제 금액(`total`) 정의가 배송비를 포함한다. → 원문 용어 그대로 `total`. (요청자가 배송비 제외를 원하면 `total` 대신 `total − shipping`을 받도록 규칙 1만 바꾸면 된다.)
  - 반올림/올림: 올림은 적립이 규칙 표보다 커질 수 있고 반올림은 경계 설명이 복잡하다. → 기각. 내림(사업상 보수적, "1포인트 단위"를 "1포인트 미만은 버림"으로 해석). 
  - 쿠폰+VIP 조합: (a) 쿠폰이 VIP 혜택을 무효화해 일반+쿠폰과 동일, (b) VIP가 쿠폰 감산을 무효화해 VIP 2%, (c) 곱셈 합성 1%. (a)는 "VIP는 더 많이"를 쿠폰 주문에서 깬다. (b)는 "쿠폰 쓴 주문은 줄임"을 VIP에서 깬다. → (c) 채택: 두 원문 문장이 모두 성립하는 유일한 안.
- **파일 계획:**
  - 설계자: `agents/intent/specs/0030-points/{prd,sdd,trace}.md`, `agents/context/domain.md`(용어 4행 + "포인트 적립 규칙 (0030)" 절), `agents/orchestration/TASKS.md`(0030 행).
  - 구현자: `src/pricing/points.ts`, `src/pricing/points.test.ts`. 그 외 `src/**` 변경 없음(`priceCart`·`money.ts` 불변).
  - 검사자: `agents/intent/specs/0030-points/verdict.md`.
- **위험:**
  - 가정 값(적립률 3개·내림·배송비 포함·플래그 방식·조합)이 요청자 의도와 다를 수 있다. → prd "가정한 값" 표로 노출, 상수 표 한 곳 + domain.md 한 표만 고치면 되게 설계. 구현자·검사자는 이 값을 "원문이 정한 값"으로 취급하지 않는다.
  - 상수 표를 바꾸면 값 표 테스트가 깨진다. → 테스트를 둘로 나눈다. (1) 원문 문장 테스트: 1%는 원문 확정이라 하드코딩, 쿠폰·VIP는 **표 값에 의존하지 않는 대소 관계**로 검증. (2) 경계값 표 테스트: 가정 값에 묶이며 "상수 변경 시 이 표도 갱신"이라 주석으로 표시.
  - 오버플로: 몫·나머지 분리로 해결, `MAX_SAFE_INTEGER` 테스트로 확인.
  - 구현이 `discount`를 보고 쿠폰으로 판정하거나 `0.01`을 곱하는 우회. → 검사자가 코드 대조(규칙 4, 7, 10).
- **검증 계획:**
  - 단위 테스트(`src/pricing/points.test.ts`)의 이름에 `포인트 규칙 N`을 붙여 domain.md 규칙 1~10과 1:1 추적.
  - 아래 경계값 표를 그대로 케이스로 옮긴다. 검사자는 표·domain.md·코드 상수 표가 서로 같은지 대조한다.
  - 규칙 3(대소 관계)은 `POINT_RATES_BP`에서 읽은 값으로 검증하고, 같은 대소 관계를 실제 `earnPoints` 결과로도 검증(예: total 100,000).
  - 규칙 10: `points.ts`에서 적립률 숫자 리터럴이 `POINT_RATES_BP` 정의 밖에 없는지 검사자가 눈으로 확인.
  - `pnpm check` ALL PASS. 검사자는 prd Acceptance 항목마다 원문 문장 대조.

### 경계값 표 (기본 적립률 가정값 기준, 내림)

일반·쿠폰 미사용 (100bp)

| total | 기대 포인트 | 비고 |
| --- | --- | --- |
| 0 | 0 | 규칙 8 |
| 99 | 0 | 0.99 → 내림 |
| 100 | 1 | 최소 적립 경계 |
| 199 | 1 | 1.99 → 내림 |
| 200 | 2 | |
| 50,000 | 500 | 무료배송 경계 금액 |
| 53,000 | 530 | 임의 대표값 (`total` 그대로 1%) |
| 9,007,199,254,740,991 | 90,071,992,547,409 | `MAX_SAFE_INTEGER`, 정확한 내림 |

일반·쿠폰 사용 (50bp)

| total | 기대 포인트 | 비고 |
| --- | --- | --- |
| 0 | 0 | |
| 199 | 0 | 0.995 → 내림 |
| 200 | 1 | 최소 적립 경계 |
| 399 | 1 | |
| 400 | 2 | |
| 10,001 | 50 | 50.005 → 내림 |
| 100,000 | 500 | 규칙 3 대소 비교용 |

VIP·쿠폰 미사용 (200bp)

| total | 기대 포인트 | 비고 |
| --- | --- | --- |
| 0 | 0 | |
| 49 | 0 | 0.98 → 내림 |
| 50 | 1 | 최소 적립 경계 |
| 99 | 1 | 1.98 → 내림 |
| 100 | 2 | |
| 100,000 | 2,000 | 규칙 3 대소 비교용 |
| 9,007,199,254,740,991 | 180,143,985,094,819 | `MAX_SAFE_INTEGER`, 정확한 내림 |

VIP·쿠폰 사용 (100bp)

| total | 기대 포인트 | 비고 |
| --- | --- | --- |
| 0 | 0 | |
| 99 | 0 | |
| 100 | 1 | |
| 100,000 | 1,000 | 일반·쿠폰 사용(500)보다 크고 VIP·쿠폰 미사용(2,000)보다 작음 |

`priceCart` 연동 (일반 회원)

| 입력 | `total` | couponUsed | 기대 포인트 |
| --- | --- | --- | --- |
| 빈 장바구니 | 0 | false | 0 |
| 상품 20,000원 1개 (배송비 3,000 포함) | 23,000 | false | 230 (배송비 제외라면 200이므로 규칙 1 확인용) |
| 상품 20,000원, 할인 5,000원 | 18,000 | true | 90 |
| 상품 60,000원 (무료배송) | 60,000 | false | 600 |

잘못된 입력 (모두 `RangeError`, 규칙 5·9)

| 입력 | 이유 |
| --- | --- |
| `total: -1` | 음수 |
| `total: 1.5` | 비정수 |
| `total: NaN`, `Infinity` | 유한 정수 아님 |
| `total: 9_007_199_254_740_992` | 안전 정수 초과 |
| `grade: "GOLD"` (타입 우회) | 알 수 없는 등급 |

## 계획과 달라진 점
(trace.md에서 계획과 다르게 간 지점을 요약. 없으면 "없음")

## 검증 결과
