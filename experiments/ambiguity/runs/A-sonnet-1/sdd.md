# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, domain.md, architecture.md, loop.md, guardrails.md, `src/money.ts`, `src/pricing/price-cart.ts`(+테스트). 쿠폰·VIP·포인트는 코드와 문서 어디에도 없음을 grep으로 확인.
- **접근:**
  - `calcPoints({ total, tier, couponUsed }, policy = DEFAULT_POINT_POLICY): Points`. 순수 함수, `priceCart`와 분리(architecture.md의 "할인은 인자로 받는다"와 같은 결).
  - 적립률은 **베이시스 포인트(1% = 100bp)** 정수로 보관하고 `Math.floor(total * bp / 10_000)`로 계산한다. `total * 0.01` 같은 부동소수 곱을 쓰면 `0.07 * 100` 류의 오차로 경계값이 틀어질 수 있다.
  - 정책 타입 `PointPolicy = { rateBp: Record<MemberTier, { default: number; withCoupon: number }> }`. 기본값은 prd의 가정 표 그대로.
  - `MemberTier = "regular" | "vip"`. `total`은 `assertWon`으로 검증(0 이상 정수).
  - domain.md에 "포인트 적립 규칙 (0030)"과 용어 행(포인트)을 추가한다. 코드가 문서를 따른다.
- **대안·트레이드오프:**
  - 쿠폰 사용을 `discount > 0`으로 추정: 인자가 줄지만 쿠폰 외 할인이 생기면 오판 → 명시적 `couponUsed` 채택.
  - 부동소수 비율(0.01)로 계산 후 `Math.floor`: 코드는 짧지만 오차 위험 → bp 정수 연산 채택.
  - 반올림: 사용자가 방식을 말하지 않았고 과지급 쪽 실수가 더 나쁘다고 보아 내림. 확정되면 정책 한 줄이 아니라 함수 한 줄 변경이다(prd 가정 표에 표기).
  - 수치를 사용자에게 먼저 묻기: 가능하지만 요청이 일괄 처리형이라, 임시 값 + 정책 주입 + 가정 명시로 진행하고 확인을 요청하는 쪽을 택했다.
- **파일 계획:**
  - 신규 `src/pricing/points.ts`, `src/pricing/points.test.ts`
  - 수정 `agents/context/domain.md`(규칙 추가), `agents/context/architecture.md`(모듈 표 1행)
- **위험:**
  - 가정 값이 실제 의도와 다를 수 있다 → 정책 주입 + prd에 미확정 표기 + 최종 보고에서 확인 요청.
  - "결제 금액"에 배송비가 들어가는 해석 차이 → 입력을 `total` 그대로 받으므로 호출 쪽에서 `subtotal − discount`를 넘기면 바뀐다(코드 수정 불필요).
- **검증 계획:**
  - 단위 테스트: 적립률 4칸, 내림 경계(예: 일반 99원→0, 100원→1, 199원→1), 쿠폰 0.5%(199원→0, 200원→1), 0원→0, 음수·소수 금액 RangeError, 정책 주입, 결과가 항상 정수.
  - 테스트 이름에 domain.md 규칙 번호를 붙인다(architecture.md 규칙).
  - `pnpm check` ALL PASS.

## 계획과 달라진 점
- 계산식을 `floor(total × bp / 10_000)` 한 줄에서 `floor(total / 10_000) × bp + floor((total % 10_000) × bp / 10_000)`로 바꿨다. 한 줄 식은 `total × bp`가 큰 금액에서 안전 정수 범위를 넘기 때문이다(BigInt 대조 테스트 추가).
- 그 외 없음.

## 검증 결과
- `pnpm check` ALL PASS — 타입체크, 테스트 118개(신규 `points.test.ts` 13개), lockfile, 태스크 기록.
- 신규 테스트: 적립률 4칸, 내림 경계(99/100/199, 199/200), 정수성, 부동소수 오차(700→7, 2,900→29), `MAX_SAFE_INTEGER` BigInt 대조, 0원, 음수·소수·NaN 거부, 정책 주입.
- 미검증: 가정 값(쿠폰 0.5%·VIP 2%·VIP+쿠폰 1%·배송비 포함·내림)이 실제 의도와 맞는지는 사용자 확인 전이다. 이슈 #1 본문과 동기화(`pnpm issue-sync`)는 이 세션에서 `gh` 실행이 승인되지 않아 하지 못했다.
