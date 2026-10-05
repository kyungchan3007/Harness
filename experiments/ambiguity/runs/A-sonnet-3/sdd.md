# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, harness/loop.md, harness/guardrails.md, harness/commit-and-issue.md, context/domain.md, context/architecture.md, 0002 prd·sdd, `src/pricing/price-cart.ts`(+test), `src/money.ts`
- **접근:**
  - `src/pricing/points.ts`에 순수 함수 `calcPoints({ total, couponUsed, isVip }, policy = DEFAULT_POINTS_POLICY): number`.
  - 적립률은 정수 bp(1bp = 0.01%)로 둔 4칸 표 `{ normal: 100, coupon: 50, vip: 200, vipCoupon: 100 }`. `ShippingPolicy`와 같은 방식으로 주입 가능하게 하고 기본값을 둔다.
  - 계산은 정수 연산만: `floor(total / 10000) * bp + floor((total % 10000) * bp / 10000)`. `total * bp`가 안전 정수를 넘는 큰 금액에서도 정확하다.
  - 입력 `total`은 `assertWon`으로 검증(0 이상 정수). 0원이면 0포인트.
  - `priceCart`는 건드리지 않는다. 호출자가 `priceCart(...).total`을 넘긴다.
- **대안·트레이드오프:**
  - 소수 적립률(`0.01`)로 `total * 0.01` 후 `Math.floor`: 부동소수점 오차로 `floor(2900 * 0.01)` 같은 경계에서 틀릴 수 있다. → 기각, 정수 bp.
  - 쿠폰·VIP를 배수로 합성(VIP ×2, 쿠폰 ×½): 확장은 쉽지만 조합 결과가 암묵적이다. → 기각, 4칸 표로 칸마다 따로 바꿀 수 있게 함.
  - `discount > 0`을 쿠폰 사용으로 추정: 인자가 줄지만 쿠폰 외 할인이 생기면 오적용. → 기각, `couponUsed` 명시.
  - `priceCart`에 적립을 합침: 한 번에 얻는 값은 편하지만 가격 계산이 회원 정보에 의존하게 된다. → 기각(비목표), architecture.md의 "순수 함수·인자 주입" 방침 유지.
  - 요구가 불명확하니 구현을 멈추고 질문: 가능하나, 값이 정책 객체 한 곳이라 틀려도 수정 비용이 작다. → 잠정값 + 명시 보고로 진행.
- **파일 계획:** `src/pricing/points.ts`(+`points.test.ts`), `agents/context/domain.md`(용어·포인트 규칙), `agents/context/architecture.md`(모듈 표 한 줄)
- **위험:**
  - 잠정 수치(0.5%·2%·1%)와 기준 금액(배송비 포함)이 실제 의도와 다를 수 있다. → prd에 가정 표로 노출, domain.md에 "잠정" 표시, 최종 보고에 포함.
  - 쿠폰 사용 여부를 호출자가 잘못 넘기면 오적립. 0003에서 쿠폰 모듈이 생기면 그 결과에서 파생하도록 연결해야 한다.
  - 취소·환불 시 회수 규칙이 없다(비목표). 적립만 있고 회수가 없으면 어뷰징 여지.
- **검증 계획:** 규칙 번호를 붙인 단위 테스트(기본 1%, 쿠폰, VIP, VIP+쿠폰, 버림 경계 99/100원, 0원, 입력 검증, 정책 주입, 큰 금액 정확성), `pnpm check`

## 계획과 달라진 점
없음. (테스트 기대값은 구현 전에 손으로 계산해 두었고, 큰 금액 케이스는 몫·나머지 식과 별개로 자릿수를 따로 계산해 맞췄다.)

## 검증 결과
- `pnpm check`: ALL PASS (Typecheck, 단위 테스트 117개 중 `points.test.ts` 12개, lockfile, 태스크 기록)
- 규칙 1~6은 테스트 이름에 규칙 번호를 붙여 domain.md와 대응. 규칙 1(배송비 포함 결제 금액)은 마지막 테스트에서 `priceCart().total` 52,999 → 529포인트로 확인
- 경계값: 99원(0P) / 100원(1P) / 199원(1P), 쿠폰 199원(0P) / 299원(1P), 안전 정수 최댓값(90,071,992,547,409P)
- 미검증: 잠정 수치가 실제 의도와 맞는지(사람 확인 필요), 실제 주문 흐름 연결(비목표)
- 공백: 게이트는 domain.md의 "잠정" 표시가 남아 있는 규칙을 알려주지 못한다. 확정 전까지는 사람이 기억해야 한다.
