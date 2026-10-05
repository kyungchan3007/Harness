# 0030 — 포인트 적립 — PRD

## 요약

주문 결제 시 포인트를 적립하는 기능. 기본 적립률 1%이며, VIP 회원은 2배, 쿠폰 사용 시 절반.

- **이슈:** #1

## Acceptance

- [x] `src/pricing/points.ts`에 포인트 계산 함수 구현
- [x] 유닛 테스트로 모든 규칙 검증 (규칙 번호 1~5)
- [x] `pnpm check` PASS

## 규칙

| # | 설명 | 예시 |
| --- | --- | --- |
| 1 | 적립률은 기본 1% | 결제금액 10,000원 → 100포인트 |
| 2 | VIP는 적립률 2배 | VIP, 10,000원 → 200포인트 |
| 3 | 쿠폰 사용 시 적립률 절반 | 쿠폰 사용, 10,000원 → 50포인트 |
| 4 | VIP + 쿠폰: VIP 2배 먼저, 쿠폰 절반 | VIP+쿠폰, 10,000원 → (1% × 2 ÷ 2) = 100포인트 |
| 5 | 1포인트 미만은 버림(floor) | 12,345원 × 1% = 123.45 → 123포인트 |

## 입력·출력

**입력:**
- `breakdown: PriceBreakdown` - priceCart 결과 (subtotal, discount, shipping, total)
- `user: { grade: "VIP" | "NORMAL" }` - 회원 정보

**적립 기준 금액:**
- `subtotal - discount` (배송비는 제외)

**쿠폰 판별:**
- `breakdown.discount > 0` 이면 쿠폰 사용

**출력:**
- 정수 포인트

## 컨텍스트

- [domain.md](../../context/domain.md): 금액 단위, PriceBreakdown 정의
- [architecture.md](../../context/architecture.md): 모듈 구조
