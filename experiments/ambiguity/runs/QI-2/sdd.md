# 0030 — 포인트 적립 시스템 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, architecture.md, domain.md, 0002의 SDD
- **접근:**
  - `src/pricing/points.ts`: `earnPoints(breakdown: PriceBreakdown, member: { grade: "VIP" | "NORMAL" }): number` 순수 함수
  - 적립률 결정 로직:
    1. 기본 적립률: `1%`
    2. VIP 판정: `grade === "VIP"` → 적립률 2배 (2%)
    3. 쿠폰 판정: `discount > 0` → 적립률 절반 (현재 적립률의 50%)
    4. 계산 순서: VIP 배율 먼저 적용, 그 후 쿠폰 계수 적용
  - 최종 포인트: `Math.floor(total × 적립률 / 100)`로 내림 처리
  - 금액은 `number` 정수, 반환값도 정수
- **대안·트레이드오프:**
  - 포인트를 `bigint`로: 오버플로에 안전하지만 원화 규모에서는 과하다. → 기각. `number` 정수 사용.
  - 회원 정보를 `{ isVip: boolean }` 형태로: 더 단순하지만 향후 다른 등급(GOLD 등) 확장에 불리하다. → 기각. 명시적 등급 열거.
  - 적립률을 상수로 분리할지: 명확성을 위해 함수 내에 명시적으로 작성하면 가독성이 좋다. → 상수 분리는 과하지 않을 시 나중에.
  - VIP 배율 후 쿠폰 감소 vs. 독립 계산: 요구사항에서 순서가 명시됐다. → VIP 먼저, 쿠폰 후.
- **파일 계획:** `src/pricing/points.ts`(+test), `agents/context/domain.md` 포인트 규칙 추가
- **위험:** `total`이 0이거나 음수인 경우 → 0원 이상만 허용하고 위반 시 0 반환
- **검증 계획:** 규칙별 단위 테스트, 모든 조합 케이스(NORMAL/쿠폰/VIP/VIP+쿠폰), 소수점 내림 확인, `pnpm check`

## 검증 결과
(구현 후 작성)
