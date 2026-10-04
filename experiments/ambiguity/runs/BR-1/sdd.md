# 0030 — 포인트 적립 기능 — SDD

요구사항: [prd.md](prd.md)

## 설계

- **읽은 문서:** AGENTS.md, domain.md, architecture.md, 0002 spec (cart-pricing)

- **접근:**
  - 위치: `src/pricing/points.ts`에 `earnPoints(total, options)` 순수 함수 구현.
  - 입력: `total` (결제 금액, Won 정수), `options.isCouponUsed` (쿠폰 사용 여부, boolean), `options.isVip` (VIP 회원 여부, boolean).
  - 출력: 적립 포인트 (정수, 0 이상).
  - 계산: `basePoints = floor(total * 0.01)` → 쿠폰 곱하기(0.5 또는 1.0) → VIP 곱하기(1.5 또는 1.0) → `floor` 처리로 정수화.
  - 검증: 입력 경계에서 `total`은 0 이상 정수만 허용. 음수나 비정수면 `RangeError` 또는 `TypeError`.

- **대안·트레이드오프:**
  - 쿠폰 감소율: 요청 "좀 줄여 주세요"는 명확하지 않음. 설계 결정: 50%. (30%, 70% 등도 가능하지만 50%는 직관적이고 명확)
  - VIP 배수: 요청 "더 많이"는 명확하지 않음. 설계 결정: 1.5배 (50% 증가). (2배, 1.2배 등도 가능하지만 1.5배는 VIP의 가치 표현이 적당)
  - 적용 순서: 쿠폰과 VIP를 곱하기로 결합 (순서 무관). base=100 → 쿠폰(×0.5)→50 → VIP(×1.5)→75와 base=100 → VIP(×1.5)→150 → 쿠폰(×0.5)→75는 동일.
  - 반올림: `Math.floor` (내림). 정수 제약이지 고객 손해가 아니므로 공정함.
  - VIP+쿠폰 중복: 요청에서 명확하지 않음. 설계 결정: 중복 적용 가능 (비즈니스 로직상 합리적).

- **파일 계획:**
  - `src/pricing/points.ts`: `earnPoints(total, options)` 함수 + 입력 검증.
  - `src/pricing/points.test.ts`: 규칙 1~4 각 1개 이상 + 경계값 테스트.
  - `agents/context/domain.md`: 포인트 규칙 1~4 추가.
  - `agents/intent/specs/0030-points/trace.md`: 과정 기록 (이미 작성).

- **위험:**
  - 부동점 오차: `total * 0.01`에서 발생 가능. → `Math.floor`로 정수화하면서 제거됨.
  - 음수 금액: 입력 검증에서 차단. 위험 없음.

- **검증 계획:**
  - 규칙 1 (1% 기본 적립): 100원→1포인트, 99원→0포인트, 1000원→10포인트.
  - 규칙 2 (쿠폰 50% 감소): 100원 기본→1포인트, 쿠폰→0포인트(내림 후 50%=0.5→0).
  - 규칙 3 (VIP 1.5배): 100원 기본→1포인트, VIP→1포인트(내림 후 1.5→1), 150원 기본→1포인트(내림 후 1.5→1), VIP→2포인트(내림 후 2.25→2).
  - 규칙 4 (정수): 모든 결과가 Number.isInteger() 통과.
  - 경계값: 0원, 1원, 99원, 100원, 149원, 150원, 쿠폰+VIP 조합.
  - 입력 검증: 음수, 비정수 시 예외 발생.
  - `pnpm check` ALL PASS.
