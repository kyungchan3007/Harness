# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, domain.md, architecture.md, 0002 SDD (금액 계산 패턴 참고)
- **접근:**
  - `src/pricing/points.ts`: `calculatePoints(total, options)` 순수 함수. 옵션은 `{ hasCoupon?: boolean, isVip?: boolean }`
  - 적립률 계산: 기본 1%, 쿠폰 0.5%, VIP 50% 증가(기본 1.5%, 쿠폰 0.75%), 최종은 `Math.floor`로 정수화
  - 입력 검증: `total`은 0 이상 정수, 옵션은 부분적 제공 가능
- **대안·트레이드오프:**
  - 적립률을 상수로 정의: 매직 넘버 대신 `POINT_RATE_BASE = 0.01`, `POINT_RATE_COUPON = 0.005`, `VIP_MULTIPLIER = 1.5`
  - VIP 승수를 곱하는 순서: 기본율 또는 쿠폰율에 먼저 VIP 승수를 적용. (불명확하면 기본율부터 상향) → 해석: 기본 1% → VIP 1.5%, 쿠폰 0.5% → VIP 0.75%
  - 함수 이름: `calculatePoints`로 명확하게 금액 → 포인트 변환 의도를 드러냄
- **파일 계획:** `src/pricing/points.ts`(+test), `agents/context/domain.md` (포인트 규칙 추가), 기존 타입 재사용 (금액은 `number`)
- **위험:** VIP와 쿠폰 조합 시 우선순위 불명확 → 규칙: 쿠폰 할인은 구독 상태와 독립적이므로, VIP 승수는 현재 적립률(쿠폰 적용 후)에 곱한다.
- **검증 계획:** 
  - 기본 1% 테스트 (100원 → 1포인트, 1,000원 → 10포인트)
  - 소수점 버림 테스트 (99원 → 0포인트, 150원 → 1포인트)
  - 쿠폰 0.5% 테스트 (100원 → 0포인트, 200원 → 1포인트)
  - VIP 1.5% 테스트 (100원 → 1포인트, 67원 → 1포인트, 66원 → 0포인트)
  - VIP + 쿠폰 0.75% 테스트 (200원 → 1포인트)
  - 0원 주문 → 0포인트
  - `pnpm check` ALL PASS

## 계획과 달라진 점
없음. 설계와 구현이 일치했습니다.

## 검증 결과
- `pnpm check`: ALL PASS (Typecheck, 단위 테스트 14개, lockfile, spec records)
- 포인트 규칙 1~5: 테스트 이름에 규칙 번호를 붙여 domain.md와 1:1 추적
  - 기본 1% 테스트: 100원→1포인트, 1,000원→10포인트, 99원→0포인트
  - 쿠폰 0.5% 테스트: 200원→1포인트, 150원→0포인트
  - VIP 1.5% 테스트: 67원→1포인트, 66원→0포인트
  - VIP + 쿠폰 0.75% 테스트: 134원→1포인트, 133원→0포인트
  - 0원 주문: 0포인트 (모든 옵션 조합)
- 입력 검증: 음수·소수·unsafe integer 거부
- `calculatePoints`는 순수 함수이고, `hasCoupon·isVip` 옵션으로 유연한 적립률 제어 가능
