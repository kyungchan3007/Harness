# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, context/domain.md, pricing/price-cart.ts
- **접근:**
  - `src/pricing/points.ts`: 포인트 계산 함수. PriceBreakdown(priceCart 결과)과 회원 정보를 받아 정수 포인트를 반환한다.
  - 입력: `{ priceBreakdown: PriceBreakdown, member: { grade: "VIP" | "NORMAL" } }`
  - 출력: `Won` (0 이상의 정수)
  - 계산 흐름: 할인 후 상품 금액(subtotal − discount) → 기본 적립률 1% 적용 → VIP 여부에 따라 배율 조정 → 쿠폰 여부에 따라 적립률 절반 → 내림 처리
- **대안·트레이드오프:**
  - 회원 정보 타입: 단순 `{ grade: "VIP" | "NORMAL" }` vs. enum/union type. → 단순 객체로 시작, 필요하면 0031에서 회원 모델 정의.
  - 적립 기준 금액: subtotal − discount vs. total (배송비 포함). → 요구사항대로 배송비 제외. 배송비는 상품 구매 가치와 무관.
  - 적립률 조합 순서: VIP 먼저 vs. 쿠폰 먼저. → 요구사항: VIP 2배 먼저 적용, 그 다음 쿠폰 절반. 직관적이고 VIP 혜택을 우선함.
- **파일 계획:** `src/pricing/points.ts`(+test), `agents/context/domain.md` 포인트 규칙 추가
- **위험:** 적립 기준 금액이 음수일 수 없으므로 추가 검증은 불필요 (priceCart에서 이미 discount ≤ subtotal 확인).
- **검증 계획:** 규칙별 단위 테스트(5개), 조합 테스트(VIP + 쿠폰, 무쿠폰, 일반회원), 내림 경계값, `pnpm check`

## 검증 결과
(작성 후 기록)
