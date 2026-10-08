# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, agents/context/domain.md, agents/harness/loop.md, src/pricing/price-cart.ts, src/money.ts
- **접근:** `src/pricing/points.ts`에 순수 함수 `calculatePoints(breakdown: PriceBreakdown, member: Member): number`. 적립률은 `PointsPolicy`(`normalPercent: 1`, `vipPercent: 3`) 상수 `DEFAULT_POINTS_POLICY`로 빼서 `ShippingPolicy` 패턴을 따른다. 흐름: 입력 검증(`assertWon`, grade) → NORMAL이고 `discount > 0`이면 0 → `percent = grade별 적립률` → 반올림을 정수 연산 `Math.floor((subtotal * percent + 50) / 100)`로 한 번만 한다(부동소수 `subtotal * 0.01` 오차 회피). 곱이 safe integer를 넘으면 거부.
- **대안·트레이드오프:** (1) `Math.round(subtotal * 0.01)` — 짧지만 부동소수 오차로 x.5 경계가 틀릴 수 있어 기각. (2) `priceCart` 반환에 points 추가 — 회원 등급은 장바구니 금액과 무관한 입력이라 분리. (3) 쿠폰 판별을 별도 플래그로 — 요청자가 `discount > 0`으로 정함.
- **파일 계획:** `src/pricing/points.ts`, `src/pricing/points.test.ts`, `agents/context/domain.md`(포인트 규칙 섹션 — 완료)
- **위험:** 0003에서 쿠폰 외 할인(예: 자동 프로모션)이 discount에 섞이면 "discount > 0 = 쿠폰" 판별이 틀어진다 → 그때 규칙 3을 다시 정해야 함(허점으로 기록).
- **검증 계획:** prd Acceptance 항목마다 단위 테스트 1개 이상, 반올림 경계(149/150, VIP 49/50), 0원, 잘못된 입력. `pnpm check`.

## 계획과 달라진 점
- 첫 PLAN은 질문 대기 중 초안이었고, 답을 받은 뒤 접근을 확정했다(초안 대비 구조는 동일, 수치·분기만 채움).
- domain.md 수정이 가드 hook에 한 번 막혔다: 초안 prd의 제목이 `## Acceptance (잠정 …)`이라 hook이 Acceptance를 빈 것으로 봤다. prd를 확정하며 제목을 `## Acceptance`로 고친 뒤 통과.
- 범위 밖 금액을 막으려고 `subtotal * percent`가 safe integer인지 검사를 넣었다(계획의 "곱이 safe integer를 넘으면 거부" 그대로).

## 검증 결과
- `pnpm check` ✅ ALL PASS — Typecheck, Unit tests 11 files / 116 tests (points.test.ts 11개 신규), lockfile, Task records.
- Acceptance 대응: 1%·반올림 경계(49/50, 149/150) / 배송비 제외 / NORMAL+쿠폰 0 / VIP 3%·경계(16/17, 49/50) / VIP+쿠폰 할인 미차감 / 0원 / 상한 없음 / 음수·소수·알 수 없는 grade·범위 초과 거부.
