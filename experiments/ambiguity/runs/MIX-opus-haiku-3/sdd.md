# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md) · 규칙: [domain.md "포인트 적립 규칙 (0030)"](../../context/domain.md)

## 설계
- **읽은 문서:** [domain.md](../../context/domain.md), [architecture.md](../../context/architecture.md), `src/pricing/price-cart.ts`, `src/money.ts`
- **접근:** `priceCart`와 같은 방식의 순수 함수 하나를 `src/pricing/points.ts`에 둔다. 상태·I/O 없음.

  ```ts
  import type { PriceBreakdown } from "./price-cart.js";

  export type MemberGrade = "VIP" | "NORMAL";
  export interface Member { grade: MemberGrade }
  /** 적립 포인트. 항상 0 이상의 정수 (domain.md 포인트 규칙) */
  export type Points = number;

  export function calculateEarnedPoints(breakdown: PriceBreakdown, member: Member): Points;
  ```

  계산 순서:
  1. **검증 (규칙 8):** `assertWon(breakdown.subtotal, "subtotal")`, `assertWon(breakdown.discount, "discount")`, `discount > subtotal`이면 `RangeError`. `member.grade`가 `"VIP"`·`"NORMAL"`이 아니면 `RangeError` (TS 타입이 있어도 런타임 입력은 JS에서 올 수 있으므로 검사). `shipping`·`total`은 쓰지 않으므로 검증하지 않는다.
  2. **기준 금액 (규칙 1):** `base = subtotal − discount`.
  3. **적립률 (규칙 2~5):** 소수 대신 **천분율(‰) 정수**로 다룬다. `rate = 10` → VIP면 `rate *= 2` → `discount > 0`이면 `rate /= 2`. 결과는 항상 10·5·20·10 중 하나로 정수다(나눗셈이 나누어떨어짐). 순서는 규칙 5대로 VIP 먼저.
  4. **내림 (규칙 6·7):** `points = ⌊base × rate / 1000⌋`. `base × rate`가 `Number.MAX_SAFE_INTEGER`를 넘으면 정밀도가 깨지므로 다음처럼 쪼개 계산한다:
     `Math.floor(base / 1000) * rate + Math.floor((base % 1000) * rate / 1000)`
     (`base = 1000q + r`이면 `⌊(1000q + r)·rate/1000⌋ = q·rate + ⌊r·rate/1000⌋`, 두 항 모두 안전 범위의 정수 연산). 곱셈 결과는 `base`의 2% 이하라 반환값도 안전 정수.
  5. 반환. `base = 0`이면 자연히 0 (빈 장바구니는 `priceCart`가 `{0,0,0,0}`을 돌려줌).

- **대안·트레이드오프:**
  - 소수 적립률(`0.01`)로 `Math.floor(base * 0.01)`: 부동소수점 오차로 경계에서 틀린다 (예: `base * 0.005` 계열, `0.1+0.2` 문제). → 기각. 천분율 정수.
  - 단계마다 내림(VIP 2배 후 내림 → 쿠폰 절반 후 내림): 결과가 마지막 1회 내림과 달라질 수 있고 규칙 6에 어긋남. → 기각.
  - `PriceBreakdown`에 `points` 필드 추가 / `priceCart` 안에서 계산: 금액 계산과 회원 정책이 섞이고, 회원 정보가 `priceCart` 인자로 들어가야 함. 요청자가 입력을 "priceCart 결과 + 회원 정보"로 지정. → 기각. 별도 함수.
  - 기준 금액으로 `total − shipping` 사용: 값은 같지만 `total`의 정합성까지 믿어야 함. → 기각. `subtotal − discount`를 직접 쓴다.
  - Q8 범위(에이전트 결정): 잔액·사용·취소 회수는 저장소·주문 상태(0005)가 없어 지금 정의할 근거가 없고, 상한·최소 금액은 요청에 없는 정책을 새로 만드는 것. → 계산만, 상한·최소 없음. 필요해지면 새 태스크.
- **파일 계획:**
  - `src/pricing/points.ts` (신규) — 위 시그니처
  - `src/pricing/points.test.ts` (신규) — 테스트 이름에 `규칙 N:` (architecture.md 관례)
  - `agents/context/domain.md` — 포인트 규칙 1~8, 용어 3개 (이 태스크 DEFINE에서 반영 완료)
  - `agents/context/architecture.md` — `src/pricing/` 행에 `calculateEarnedPoints()` 추가 (반영 완료)
  - `src/pricing/price-cart.ts` — **변경 없음**
- **위험:**
  - **쿠폰 판정이 `discount > 0`에 묶임 (규칙 4).** 지금은 할인 = 쿠폰뿐이라 맞지만, 0003 이후 쿠폰 아닌 할인(등급 할인·이벤트 등)이 `discount`에 섞이면 쿠폰을 안 써도 적립이 반으로 준다. 그때는 규칙 4를 고치고 입력에 쿠폰 여부를 따로 받아야 한다 → 0003 spec에서 재확인.
  - VIP+쿠폰과 NORMAL(무쿠폰)이 같은 1%라, 테스트가 한쪽만 보면 순서 버그(쿠폰 먼저 등)를 못 잡는다. 지금 비율에선 순서가 결과에 영향이 없지만 규칙 5는 문서대로 구현한다.
- **검증 계획:** `pnpm check` + 아래 단위 테스트 (구현자가 최소한 이 표를 테스트로 옮긴다).

  | 규칙 | grade | subtotal | discount | shipping | 기대 포인트 | 보는 것 |
  | --- | --- | --- | --- | --- | --- | --- |
  | 1 | NORMAL | 10,000 | 0 | 3,000 | 100 | 배송비 제외 (130 아님) |
  | 1 | NORMAL | 10,000 | 0 | 0 | 100 | 배송비만 달라도 같은 값 |
  | 1·4 | NORMAL | 10,000 | 1,000 | 3,000 | 45 | 기준 9,000 × 0.5% |
  | 2·6 | NORMAL | 99 | 0 | 3,000 | 0 | 내림 경계 |
  | 2·6 | NORMAL | 100 | 0 | 3,000 | 1 | 내림 경계 |
  | 2·6 | NORMAL | 12,345 | 0 | 3,000 | 123 | 123.45 → 123 |
  | 3 | VIP | 49 | 0 | 3,000 | 0 | 0.98 → 0 |
  | 3 | VIP | 50 | 0 | 3,000 | 1 | 2% 경계 |
  | 3 | VIP | 10,000 | 0 | 3,000 | 200 | 2% |
  | 4 | NORMAL | 2,000 | 1 | 3,000 | 9 | 할인 1원도 쿠폰 주문 (1,999 × 0.5% = 9.995) |
  | 4·6 | NORMAL | 200 | 1 | 3,000 | 0 | 199 × 0.5% = 0.995 → 0 |
  | 4·6 | NORMAL | 201 | 1 | 3,000 | 1 | 200 × 0.5% = 1 |
  | 5 | VIP | 10,000 | 1,000 | 3,000 | 90 | 9,000 × 1% |
  | 5·6 | VIP | 1,099 | 1,000 | 3,000 | 0 | 99 × 1% → 0 |
  | 7 | NORMAL·VIP | 0 | 0 | 0 | 0 | 빈 장바구니 (`priceCart([])`) |
  | 7 | VIP | 1,000 | 1,000 | 3,000 | 0 | 전액 할인 → 기준 0 |
  | 8 | NORMAL | -1 / 1.5 | 0 | — | `RangeError` | 금액 검증 |
  | 8 | NORMAL | 1,000 | 1,001 | — | `RangeError` | 할인 > 합계 |
  | 8 | `"GOLD"` | 1,000 | 0 | — | `RangeError` | 알 수 없는 등급 |
  | 6 | VIP | `MAX_SAFE_INTEGER` | 0 | 0 | `⌊(2^53−1)/50⌋ = 180143985094819` | 큰 금액 정밀도 |

  - 4조합 요약 테스트: 기준 10,000에서 NORMAL 100 · NORMAL+쿠폰(할인 있는 경우는 기준이 바뀌므로 `subtotal`을 맞춰 기준 10,000) 50 · VIP 200 · VIP+쿠폰 100.
  - 가능하면 `priceCart`로 만든 실제 `PriceBreakdown`을 넣는 통합 테스트 1개 이상.

## 계획과 달라진 점
- 없음. 설계대로 천분율 정수 방식 구현, 분해 계산으로 큰 금액 정밀도 확보.
- 테스트는 계획보다 많음: 경계값 표 18개 + 4조합 5개 + 통합 3개 = 26개 (포인트만).

## 검증 결과
- ✅ `pnpm check` ALL PASS (typecheck·vitest·task records)
- ✅ 규칙별 테스트:
  - 규칙 1: 배송비 제외 (subtotal - discount만 사용) ✓
  - 규칙 2~5: 적립률 4조합 (1%·0.5%·2%·1%) ✓
  - 규칙 6·7: 내림 경계값 (99/100, 199/200, 49/50, 1099) ✓
  - 규칙 8: 음수·소수·할인초과·미정의 등급 RangeError ✓
- ✅ 큰 금액: MAX_SAFE_INTEGER에서 ⌊(2^53−1)/50⌋ = 180143985094819 정확 ✓
- ✅ 통합: priceCart 실제 PriceBreakdown 3개 시나리오 통과 ✓
- ⚠️ 위험 미해결: 쿠폰 판정 = discount > 0 (0003에서 재확인 필요)
