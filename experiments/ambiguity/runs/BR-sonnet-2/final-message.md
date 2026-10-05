포인트 적립 기능을 만들었고, 판정은 1차에서 approved(반려 0회)입니다. 판정자가 `pnpm check`를 직접 돌려 ALL PASS(128 테스트)를 확인했습니다. 아직 커밋하지 않았고, `JOURNAL.md`도 아직 쓰지 않았습니다.

원문에 적립률 숫자가 없어서 설계자가 아래 값을 가정했습니다. 맞는지 확인해 주세요. 값은 `src/pricing/points.ts`의 `POINT_RATES_BP` 한 곳과 `domain.md` 표만 고치면 바뀝니다.

| 구분 | 가정한 값 |
| --- | --- |
| 일반 회원 | 1% (원문) |
| 일반 회원 + 쿠폰 | 0.5% |
| VIP | 2% |
| VIP + 쿠폰 | 1% |

- **계산:** 배송비를 포함한 결제 금액 `total` 기준이고, 소수점은 내림합니다.
- **입력:** 쿠폰 여부는 호출자가 넘기는 `couponUsed` 플래그로 받습니다. 등급은 `"NORMAL" | "VIP"`입니다.
- **오류:** 음수나 정수가 아닌 금액은 `RangeError`입니다.

산출물은 `src/pricing/points.ts`와 `points.test.ts`, 그리고 `agents/intent/specs/0030-points/` 아래 `prd.md`, `sdd.md`, `trace.md`, `verdict.md`입니다. `domain.md`와 `TASKS.md`도 고쳤습니다.
