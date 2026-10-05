# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** request.md(원문), AGENTS.md, harness/loop.md, harness/commit-and-issue.md, context/domain.md, 0002 prd, `src/money.ts`·`src/cart/cart.ts`·`src/pricing/price-cart.ts`.
- **현재 코드 확인:** `Won`·`assertWon`(money.ts), `priceCart(...).total`(결제 금액)은 있다. **쿠폰 사용 여부와 VIP 개념은 코드에 없다**(쿠폰은 0003, `PriceOptions.discount`는 금액일 뿐 "쿠폰을 썼다"는 뜻이 아님). 따라서 `calculatePoints`는 세 값을 모두 입력으로 받는 순수 함수이고, `priceCart`와 연결하지 않는다.

- **접근:** (모든 숫자는 **잠정** — prd Q1~Q5, 사용자 확인 필요)
  - 적립률은 소수(0.01) 대신 **bps(1/10,000)** 정수로 둔다. 부동소수 오차를 피한다.
  - 정책 상수 한 곳:
    ```ts
    export type Bps = number; // 1bps = 0.01%
    export interface PointPolicy {
      general: Bps;           // 일반, 쿠폰 미사용      100 (1%)   원문
      generalWithCoupon: Bps; // 일반, 쿠폰 사용         50 (0.5%) 잠정 Q1
      vip: Bps;               // VIP, 쿠폰 미사용       200 (2%)   잠정 Q2
      vipWithCoupon: Bps;     // VIP, 쿠폰 사용         100 (1%)   잠정 Q3
    }
    export const DEFAULT_POINT_POLICY: PointPolicy = { general: 100, generalWithCoupon: 50, vip: 200, vipWithCoupon: 100 };
    ```
  - 시그니처:
    ```ts
    export type Point = number; // 0 이상의 정수, 1포인트 단위
    export interface PointInput {
      total: Won;          // 결제 금액 = priceCart().total
      usedCoupon: boolean; // 쿠폰 사용 여부 (판별은 0003 몫)
      isVip: boolean;      // VIP 여부 (판별은 이 태스크 범위 밖)
    }
    export function calculatePoints(input: PointInput, policy: PointPolicy = DEFAULT_POINT_POLICY): Point;
    ```
  - 계산: `assertWon(total, "total")` → 정책에서 bps 선택(vip × usedCoupon 4칸 중 하나) → **내림** 곱셈.
  - 반올림(잠정 Q4, **내림**): 중간값이 `Number.MAX_SAFE_INTEGER`를 넘지 않도록 나눠서 계산한다.
    `Math.floor(total / 10000) * bps + Math.floor(((total % 10000) * bps) / 10000)` — 수학적으로 `floor(total × bps / 10000)`과 같고 정수 연산만 쓴다.
  - 정책 값 검증: 각 bps는 0 이상의 안전한 정수가 아니면 `RangeError` (잘못된 정책이 조용히 잘못된 포인트를 만들지 않게).
  - 순서 관계(쿠폰 < 일반 < VIP)는 기본 정책 값으로만 보장하고 코드로 강제하지 않는다(정책을 바꿀 자유 유지). 기본 정책에 대해서만 테스트한다.
- **대안·트레이드오프:**
  - 소수 적립률(`0.01`) + `Math.floor(total * rate)`: 간단하나 `0.07 * 100` 같은 부동소수 오차로 경계값이 틀릴 수 있어 기각.
  - 반올림/올림: 원문이 "정수 단위"만 말해 미정. 내림은 과다 적립을 막는 보수적 선택이고 테스트하기 쉬워 잠정 채택. 바꾸려면 sdd·domain·테스트 함께 수정.
  - 쿠폰 감산을 "배율(×0.5)"로 표현: 4칸 표보다 간결하나, 조합 값을 따로 조정할 수 없어 4칸 표를 택함. 표의 기본값은 배율 규칙(쿠폰이면 절반)과 일치.
  - 쿠폰 여부를 `discount > 0`으로 추정: 쿠폰 외 할인이 생기면 틀리므로 기각, 명시적 boolean 입력.
  - `priceCart` 결과에 포인트 필드 추가: 0002 계약과 테스트를 건드리므로 비목표. 호출자가 `calculatePoints({ total: priceCart(...).total, ... })`로 조합.
- **파일 계획:**
  - 신규 `src/pricing/points.ts`, `src/pricing/points.test.ts` (builder)
  - 기존 `src/money.ts`는 `assertWon`만 import, 수정 없음
  - 문서: 이 폴더 prd·sdd·trace, `agents/context/domain.md`, `agents/orchestration/TASKS.md` (designer)
- **위험:**
  - 잠정 값(Q1~Q5)이 사용자 의도와 다를 수 있다. 상수·문서 한 곳 수정으로 대응 가능하게 설계했다.
  - 경계값: 곱셈 오버플로·부동소수 오차 → 분할 정수 연산과 `MAX_SAFE_INTEGER` 테스트로 방어.
  - 배송비 포함 total 기준이므로, 배송비를 사 주는 금액에 포인트를 주는 것이 의도와 다를 수 있다(Q5).
  - `assertWon` 메시지는 "total은(는) …"로 나온다. 메시지 문구는 테스트하지 않고 `RangeError` 타입만 확인한다.
- **검증 계획:** `src/pricing/points.test.ts` (vitest, 기존 테스트와 같은 방식). 테스트 케이스:

  | # | 입력 (total, 쿠폰, VIP) | 기대 |
  | --- | --- | --- |
  | 1 | 10,000 / X / X | 100 |
  | 2 | 50,000 / X / X | 500 |
  | 3 | 12,345 / X / X | 123 (내림) |
  | 4 | 99 / X / X | 0 |
  | 5 | 199 / X / X | 1 |
  | 6 | 10,000 / O / X | 50 |
  | 7 | 12,345 / O / X | 61 (61.725 내림) |
  | 8 | 199 / O / X | 0 (0.995 내림) |
  | 9 | 10,000 / X / O | 200 |
  | 10 | 12,345 / X / O | 246 (246.9 내림) |
  | 11 | 99 / X / O | 1 (1.98 내림) |
  | 12 | 10,000 / O / O | 100 |
  | 13 | 12,345 / O / O | 123 (123.45 내림) |
  | 14 | 10,000 기준 쿠폰 < 일반 < VIP | 50 < 100 < 200 |
  | 15 | 0 / 네 조합 | 모두 0 |
  | 16 | -1, 1.5, NaN, Infinity, MAX_SAFE_INTEGER+1 | `RangeError` |
  | 17 | MAX_SAFE_INTEGER / X / X | 90071992547409 (오차 없음) |
  | 18 | 반환값 `Number.isInteger` && ≥ 0 (여러 입력) | true |
  | 19 | 정책 인자 `{...DEFAULT, vip: 300}`, 10,000 / X / O | 300 |
  | 20 | 잘못된 정책(`general: -1`, `50.5`) | `RangeError` |
  | 21 | 입력 객체 불변, 같은 입력 반복 호출 동일 결과 | true |
  | 22 | `priceCart` 결과 `total`을 입력으로 연결(1개 상품 20,000원, 배송비 3,000원 → total 23,000 → 230) | 230 |

  케이스 22로 배송비 포함 기준(Q5)을 못 박는다. 사용자가 Q5를 뒤집으면 이 케이스를 먼저 고친다.

## 계획과 달라진 점
(구현 후 builder가 작성. 아직 없음)

## 검증 결과
(구현·판정 후 작성)
