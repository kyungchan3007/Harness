# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md) · 규칙: [domain.md 포인트 적립 규칙 (0030)](../../context/domain.md#포인트-적립-규칙-0030)

> 이 문서만 보고 구현할 수 있도록 시그니처·계산식·검증·테스트 기대값을 모두 고정한다. 규칙이 이 문서와 domain.md가 다르면 domain.md가 우선이다.

## 설계
- **읽은 문서:** AGENTS.md, agents/context/domain.md, agents/context/architecture.md, agents/harness/loop.md, src/pricing/price-cart.ts, src/money.ts
- **접근:**
  - `priceCart`와 같은 순수 함수 1개. 상태·I/O 없음.
  - **공개 API** (`src/pricing/points.ts`):
    ```ts
    import type { PriceBreakdown } from "./price-cart.js";

    /** 적립 포인트. 항상 0 이상의 정수 (domain.md 포인트 적립 규칙) */
    export type Points = number;
    export type MemberGrade = "VIP" | "NORMAL";
    export interface Member { grade: MemberGrade }

    export function calculatePoints(breakdown: PriceBreakdown, member: Member): Points;
    ```
  - **계산 순서:**
    1. 검증: `assertWon(breakdown.subtotal, "subtotal")`, `assertWon(breakdown.discount, "discount")` (`src/money.ts` 재사용). `discount > subtotal`이면 `RangeError`. `member.grade`가 `"VIP"`·`"NORMAL"`이 아니면 `RangeError` (JS 호출자·잘못된 데이터 방어).
    2. 기준 금액 `base = subtotal − discount` (규칙 1). `shipping`·`total`은 **읽지도 검증하지도 않는다**.
    3. 적립률을 **정수 basis point**(1% = 100bp, 분모 10,000)로 구한다 (규칙 2~5):
       `rateBp = 100 × (VIP ? 2 : 1) ÷ (discount > 0 ? 2 : 1)` → 결과는 항상 100 / 50 / 200 / 100 중 하나(정수).
       순서는 VIP 2배 → 쿠폰 절반(규칙 5). 정수 곱·나눗셈이라 순서를 바꿔도 결과는 같지만, 코드는 규칙 순서대로 쓴다.
    4. 버림 1회 (규칙 6): `product = base × rateBp`; `points = (product − product % 10_000) / 10_000`.
       부동소수 나눗셈 후 `Math.floor`를 쓰지 않는다 — `0.01`·`0.005` 같은 소수 요율이나 큰 수의 나눗셈 반올림 오차를 원천 차단하려는 것. `product`가 `Number.isSafeInteger`가 아니면 `RangeError`.
    5. 상한 없음, `base = 0`이면 자연히 0 (규칙 7).
  - 상수는 모듈 내부 `const`(`BASE_RATE_BP = 100`, `VIP_MULTIPLIER = 2`, `COUPON_DIVISOR = 2`, `BP_DENOMINATOR = 10_000`)로 둔다. 정책 객체 인자는 만들지 않는다(요구 없음, YAGNI).
- **대안·트레이드오프:**
  - *요율을 소수(0.01)로 곱하고 `Math.floor`* — 짧지만 `0.005 × 200 = 1.0000000000000002` 류 오차 가능 → 정수 bp 채택.
  - *쿠폰 여부를 별도 플래그로 받기* — 의미는 분명하지만 요청자가 `discount > 0`으로 판단하라고 확정(Q4) → 플래그 없음. 쿠폰 외 할인이 생기면 이 판단을 바꿔야 함(위험 참고).
  - *`total`을 기준으로 쓰기* — 원문 "결제 금액" 표현과 맞지만 요청자가 Q1에서 배송비 제외로 확정 → `subtotal − discount`.
  - *`PriceBreakdown` 정합성(`total = subtotal − discount + shipping`) 검사* — 쓰지 않는 필드를 검증하면 책임이 섞임 → 하지 않음.
- **파일 계획:**
  - `src/pricing/points.ts` — 신규, 위 API
  - `src/pricing/points.test.ts` — 신규, 아래 검증 계획
  - `agents/context/domain.md` — 용어 4개 + "포인트 적립 규칙 (0030)" 절 (이 태스크에서 이미 반영)
  - `agents/context/architecture.md` — 모듈 표에 `points.ts` 한 줄 (이미 반영)
  - `price-cart.ts`는 **수정하지 않는다** (`PriceBreakdown` 타입만 import)
- **위험:**
  - 쿠폰(0003)이 아직 없다. 0003에서 쿠폰 외 할인(예: 회원 할인)이 `discount`에 섞이면 "discount > 0 = 쿠폰" 판단이 틀어진다 → 그때 domain.md 용어 "쿠폰 사용 주문"을 먼저 고친다.
  - Q5·Q9·Q10은 요청자가 위임해 에이전트가 정했다(prd.md 표). 바뀌면 domain.md 규칙 1·6·7과 해당 테스트만 고친다.
- **검증 계획:** `points.test.ts`에 아래를 모두 넣는다. 테스트 이름에 `포인트 규칙 N:`을 붙인다. 입력은 `PriceBreakdown` 객체를 직접 만든다(`priceCart` 호출 불필요). `shipping`/`total`은 예시처럼 일관되게 채운다.

  **대표 예시 (규칙 1~5)**

  | # | grade | subtotal | discount | shipping | total | 기준 | 적립률 | 기대 포인트 | 규칙 |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | E1 | NORMAL | 30,000 | 0 | 3,000 | 33,000 | 30,000 | 1% | **300** (330 아님 — 배송비 제외) | 1·2 |
  | E2 | NORMAL | 30,000 | 5,000 | 3,000 | 28,000 | 25,000 | 0.5% | **125** | 1·4 |
  | E3 | VIP | 30,000 | 0 | 3,000 | 33,000 | 30,000 | 2% | **600** | 3 |
  | E4 | VIP | 30,000 | 5,000 | 3,000 | 28,000 | 25,000 | 1% | **250** | 5 |

  **버림 (규칙 6)** — 기준 금액 12,345

  | # | grade | subtotal | discount | 정확한 값 | 기대 |
  | --- | --- | --- | --- | --- | --- |
  | R1 | NORMAL | 12,345 | 0 | 123.45 | **123** |
  | R2 | NORMAL | 12,445 | 100 | 61.725 | **61** |
  | R3 | VIP | 12,345 | 0 | 246.9 | **246** |
  | R4 | VIP | 12,445 | 100 | 123.45 | **123** |

  **경계값 (규칙 6)** — 기준 금액 = 아래 값

  | # | grade·쿠폰 | 기준 → 기대 |
  | --- | --- | --- |
  | B1 | NORMAL·미사용 | 99 → 0, 100 → 1, 199 → 1, 200 → 2 |
  | B2 | NORMAL·사용 (`discount=1`, `subtotal=기준+1`) | 199 → 0, 200 → 1, 399 → 1, 400 → 2 |
  | B3 | VIP·미사용 | 49 → 0, 50 → 1, 99 → 1, 100 → 2 |
  | B4 | VIP·사용 (`discount=1`) | 99 → 0, 100 → 1 |

  **배송비 무관 (규칙 1)**
  - S1: NORMAL, subtotal 40,000, discount 0 — shipping 3,000/total 43,000과 shipping 0/total 40,000이 둘 다 **400**.

  **0원·상한 (규칙 7)**
  - Z1: 빈 장바구니 `{0,0,0,0}`, NORMAL·VIP 모두 **0**.
  - Z2: 전액 할인 subtotal 10,000, discount 10,000 (쿠폰 사용), VIP → **0**.
  - Z3: 상한 없음 — NORMAL, subtotal 100,000,000, discount 0 → **1,000,000**.

  **입력 거부 (RangeError)**
  - V1: subtotal −1 / subtotal 100.5 / discount −1 / discount 0.5
  - V2: discount 10,001 > subtotal 10,000
  - V3: `grade: "GOLD"` (`as unknown as Member`로 캐스팅해 넣음)

  **게이트:** `pnpm check` ALL PASS.

## 계획과 달라진 점
(구현 전)

## 검증 결과
(구현 전)
