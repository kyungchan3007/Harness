0030 포인트 적립을 designer → builder → verifier 순서로 마쳤고, 판정은 approved(반려 0/2)입니다. verifier가 `pnpm check` ALL PASS(테스트 120건)를 직접 다시 돌려 확인했습니다. 커밋과 푸시는 하지 않았습니다.

- **designer:** `prd.md`(`역할 분리: on` 포함), `sdd.md`, `domain.md`의 "포인트 적립 규칙 (0030)" 절, `TASKS.md`의 0030 행을 작성했습니다.
- **builder:** `src/pricing/points.ts`와 `points.test.ts`를 만들었고, 기존 코드는 수정하지 않았습니다.
- **verifier:** 판정서는 `agents/intent/specs/0030-points/verdict.md`입니다.

원문에 숫자가 없는 부분은 designer가 잠정값으로 정했고, 문서마다 "잠정"으로 표시했습니다. 아래 값이 의도와 맞는지 확인해 주세요.

- 쿠폰을 쓴 주문은 0.5%입니다.
- VIP는 2%입니다.
- VIP이면서 쿠폰을 쓰면 1%입니다.
- 소수는 내림으로 처리합니다.
- 적립 기준은 배송비를 포함한 결제 금액(`total`)입니다.

적립률은 `DEFAULT_POINT_POLICY` 한 곳에서 바꿀 수 있습니다. 쿠폰 사용 여부와 VIP 여부는 현재 코드에 없어서 `calculatePoints({ total, usedCoupon, isVip })`의 입력으로 받습니다.

verifier가 남긴 사소한 점이 하나 있습니다. 잘못된 정책값에 대한 `RangeError` 테스트가 `general` 한 칸만 확인합니다. 나머지 세 칸은 코드에 검증이 있지만 테스트가 없습니다.
