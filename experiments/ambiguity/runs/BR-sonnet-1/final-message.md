포인트 적립을 구현했고, verifier가 1차에서 approved로 판정해 반려는 없었습니다. 판정서는 `agents/intent/specs/0030-points/verdict.md`에 있습니다. verifier가 직접 실행한 `pnpm check`는 ALL PASS(테스트 146개)였습니다.

- **designer:** `prd.md`(`역할 분리: on` 포함)·`sdd.md`·`trace.md`를 만들었고, `domain.md`에 "포인트 규칙 (0030)" 절을 추가했습니다. `TASKS.md`에는 0030 행을 in-progress로 올렸습니다.
- **builder:** `src/pricing/points.ts`와 `src/pricing/points.test.ts`(테스트 41개)를 만들었습니다. 요율은 `DEFAULT_POINTS_POLICY` 한 곳에만 있습니다.

**요율 확인 필요:** 요청에 수치가 없어서 쿠폰·VIP 요율은 가정값입니다. 문서와 코드에 모두 "(가정)"으로 표시돼 있습니다. 아래 값이 맞는지 확인해 주세요.

| | 쿠폰 없음 | 쿠폰 주문 |
| --- | --- | --- |
| 일반 | 1% | 0.5% |
| VIP | 2% | 1% |

- **적립 기준:** 배송비를 포함한 결제 금액입니다.
- **쿠폰 주문 판정:** `discount > 0`일 때입니다.
- **정수화:** 내림입니다(99원 주문은 0포인트).
- **VIP이면서 쿠폰 사용:** 요율을 곱하지 않고 표의 1%를 씁니다.
- **환불·취소 시 적립 회수:** 이번 범위 밖입니다.

**남은 일:** 아직 커밋하지 않았습니다. `sdd.md`의 "계획과 달라진 점"·"검증 결과", `JOURNAL.md` 한 줄, `TASKS.md`를 done으로 바꾸는 일, `pnpm issue-sync`도 남아 있습니다. 직접 수정하지 않는 조율자 역할이라 건드리지 않았으니, 필요하면 알려 주세요.
