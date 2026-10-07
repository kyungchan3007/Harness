# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, loop.md, domain.md, `src/pricing/price-cart.ts`, `src/money.ts`
- **접근:** `PriceBreakdown`과 회원 정보를 받아 적립 포인트(정수)를 돌려주는 순수 함수 하나를 만든다. 상태·저장·부수 효과는 없다. 적립률은 부동소수(0.01, 0.005) 대신 **베이시스 포인트(bp, 1% = 100bp) 정수**로 다뤄 `⌊기준 × bp / 10,000⌋`로 한 번만 내림한다. 이렇게 하면 `0.005 × 199`류의 부동소수 오차 없이 정확히 내림된다.
- **인터페이스 (구현자는 이대로 만든다):**

  ```ts
  // src/pricing/points.ts
  import type { PriceBreakdown } from "./price-cart.js";

  export type MemberGrade = "VIP" | "NORMAL";
  export interface Member { grade: MemberGrade; }

  export interface PointsPolicy {
    /** 기본 적립률 (bp, 100 = 1%) */
    baseRateBp: number;      // 100
    /** VIP 배수 */
    vipMultiplier: number;   // 2
    /** 쿠폰 사용 시 나누는 값 */
    couponDivisor: number;   // 2
  }
  export const DEFAULT_POINTS_POLICY: PointsPolicy;

  export function calculatePoints(
    breakdown: PriceBreakdown,
    member: Member,
    policy?: PointsPolicy,   // 기본값 DEFAULT_POINTS_POLICY
  ): number;
  ```

- **계산 순서:**
  1. `assertWon(breakdown.subtotal, "subtotal")`, `assertWon(breakdown.discount, "discount")` — 잘못되면 `RangeError` (prd A8)
  2. `discount > subtotal`이면 `RangeError` (prd A9, `priceCart`와 같은 메시지 형식)
  3. `member.grade`가 `"VIP"`/`"NORMAL"`이 아니면 오류 (prd A10)
  4. `base = subtotal − discount` — `shipping`·`total`은 읽지 않는다 (prd A1, A11)
  5. `rateBp = baseRateBp × (VIP ? vipMultiplier : 1)` → 쿠폰 사용(`discount > 0`)이면 `rateBp / couponDivisor`. 순서는 VIP 먼저, 쿠폰 나중(domain 규칙 3). 결과 bp: NORMAL 100 / NORMAL+쿠폰 50 / VIP 200 / VIP+쿠폰 100
  6. `points = Math.floor(base × rateBp / 10_000)` — 내림은 여기서 한 번만
- **대안·트레이드오프:**
  - 비율을 `0.01` 같은 소수로 곱하기 → 짧지만 부동소수 오차 위험(예: 경계값에서 0.99999… 내림). bp 정수로 선택.
  - 단계마다 내림(1% 포인트를 먼저 정수로 만들고 절반) → 같은 결과가 나오는 경우가 많지만 규칙("내림은 마지막에 한 번")과 어긋나 보이므로 쓰지 않는다.
  - 등급별 비율 표(4칸)를 그대로 상수로 두기 → 단순하지만 요청자가 말한 "VIP 2배 → 쿠폰 절반" 구조가 코드에 안 드러남. 정책 객체(배수·나눔)로 선택, `ShippingPolicy`와 같은 형태.
  - `priceCart`에 포인트를 넣기 → 금액 계산과 회원 정보가 섞임. 별도 파일로 분리.
  - 안전 정수 범위: `base`가 `Number.MAX_SAFE_INTEGER` 이하라도 `base × rateBp`가 넘칠 수 있다. 현실 금액(조 단위 미만)에선 문제없어 별도 처리하지 않는다 — 위험 항목에 기록.
- **파일 계획:**
  - `agents/context/domain.md` — "포인트 적립 규칙 (0030)" 절 추가 (이번 작업에서 작성)
  - `src/pricing/points.ts` — 위 인터페이스 (구현자)
  - `src/pricing/points.test.ts` — prd A1~A11을 그대로 테스트로 (구현자)
- **위험:**
  - 쿠폰(0003)이 생기면 쿠폰 외 할인(예: 등급 할인)도 `discount`에 들어올 수 있다. 그때 "discount > 0 = 쿠폰 사용" 판정이 틀어지므로 0003에서 다시 본다.
  - `base × rateBp`가 `2^53`을 넘는 초대형 금액(약 45조 원 이상)은 정밀도가 깨질 수 있다. 현실 범위 밖이라 범위 밖으로 둔다.
- **검증 계획:** `src/pricing/points.test.ts`에 prd Acceptance A1~A11 기대값을 그대로 단위 테스트로 옮기고, `pnpm check` PASS 확인. verifier가 prd 대비 판정.

## 계획과 달라진 점
(구현 전)

## 검증 결과
(구현 전)
