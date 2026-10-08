# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, harness/loop.md, context/domain.md, context/architecture.md, `src/pricing/price-cart.ts`, `src/money.ts`
- **접근:** `priceCart`처럼 순수 함수 하나.
  ```ts
  export type MemberGrade = "VIP" | "NORMAL";
  export interface Member { grade: MemberGrade }
  export const POINT_RATE_PERCENT: Record<MemberGrade, number> = { NORMAL: 1, VIP: 3 };
  export function earnPoints(breakdown: PriceBreakdown, member: Member): number
  ```
  1. `subtotal`·`discount`를 `assertWon`으로 검증, 등급이 표에 없으면 RangeError.
  2. `NORMAL`이고 `discount > 0`이면 0.
  3. `Math.floor((subtotal × 퍼센트 + 50) / 100)` — 정수 연산으로 반올림.
- **대안·트레이드오프:**
  - `Math.round(subtotal * 0.01)` → 부동소수점 오차로 x.5 경계가 틀릴 수 있어(예: `1005 * 0.01`) 정수 연산을 택함.
  - `priceCart`에 적립을 넣는 안 → 금액 계산과 적립 규칙이 섞여 제외.
  - 적립률을 정책 인자로 주입 → 지금 요구 없음. 상수 표로만 둔다.
- **파일 계획:** `src/pricing/points.ts`, `src/pricing/points.test.ts`, `agents/context/domain.md`(규칙 추가, 완료), `agents/context/architecture.md`(모듈 표)
- **위험:** 0003에서 쿠폰이 아닌 할인(예: 자동 할인)이 생기면 `discount > 0` = 쿠폰 판정이 틀려진다 → 그때 입력을 바꿔야 함.
- **검증 계획:** 규칙별 단위 테스트 + 경계값(1,050 → 11, 1,049 → 10, 0원), `pnpm check`.

## 계획과 달라진 점
- 등급 검증을 `in` 대신 `Object.hasOwn`으로 함 — `"toString"` 같은 프로토타입 키가 통과하지 않도록(테스트 추가).
- domain.md 수정이 1회 hook에 막힘: prd.md를 같은 턴에 병렬로 쓰는 중이라 hook이 이전 상태를 봄. prd 저장 후 재시도로 해결.

## 검증 결과
- `points.test.ts` 8개(규칙 1~6 + 잘못된 입력). 반올림 경계 10.5→11 / 10.49→10 / 0.5→1 / 0.49→0 / VIP 34.5→35.
- `pnpm check` ALL PASS (테스트 파일 11개, 테스트 113개).
