## AI

격리, 보관 등급, 예약 만료, 운송 기능을 `src/lab/` 안에 구현했고, 최종 `pnpm check`가 ALL PASS입니다. 전체 테스트는 144개이고, 이 중 `src/lab/lab.test.ts`에 새로 추가한 것이 16개입니다. `types.ts`는 건드리지 않았습니다.

커밋과 `pnpm issue-sync`는 아직 하지 않았습니다. 커밋 메시지의 `[허점]`·`[보완]`·`[컨텍스트·토큰]` 섹션은 요청하시면 작성하겠습니다.

- **격리:** `quarantine`·`release`는 ACTIVE 시료에만 동작하고, 이미 그 상태여도 성공합니다. 격리된 시료의 분취·새 예약·소비는 `QUARANTINED`로 거절합니다. 예약 취소·이동·폐기·책임자 변경·운송은 막지 않고, 기존 예약도 건드리지 않습니다.
- **보관 등급:** 받기·분취·이동·운송 목적지는 용기의 `supportedGrades`에 시료 등급이 정확히 들어 있을 때만 허용합니다. 아니면 `STORAGE_INCOMPATIBLE`입니다. 분취 자식은 부모 등급을 상속합니다.
- **시각·만료:** `advanceTime`이 시각을 올리면서 `expiresAt <= now`인 ACTIVE 예약을 한 이벤트로 `EXPIRED` 처리하고 예약 양만 풉니다. 새 예약의 `expiresAt`은 `null`이거나 현재보다 미래여야 하고, 아니면 `INVALID_INPUT`입니다.
- **운송:** 시작하면 목적 용기를 그 시료가 점유해, 다른 시료의 받기·분취·이동과 다른 운송의 목적지를 모두 막습니다. 운송 중 분취·소비·폐기·이동·추가 운송은 `IN_TRANSIT`입니다. 끝난 운송은 기록과 ID가 남고, `ID_TAKEN`·`UNKNOWN_TRANSIT`·`TRANSIT_CLOSED`를 돌려줍니다.
- **재전송·원자성:** 모든 새 명령이 기존 `Engine.run`을 거치므로 재전송, `EVENT_CONFLICT`, 실패 시 무변경, 이력 규칙이 그대로 적용됩니다.

문서가 정하지 않은 부분은 PRD에 `(가정)`으로 적어 두었습니다.
- 현재와 같은 시각으로 `advanceTime`을 호출하면 유효하고, 이벤트를 하나 남깁니다.
- 세 등급(`AMBIENT`·`CHILLED`·`FROZEN`) 밖의 값으로 받기를 하면 `INVALID_INPUT`입니다.
- 시각 값은 0 이상 `MAX_SAFE_INTEGER` 이하의 정수여야 합니다.

기록은 `agents/intent/specs/0040-lab/`의 `prd.md`·`sdd.md`·`trace.md`로 남겼고, `TASKS.md`(0040 done)와 `JOURNAL.md`도 갱신했습니다.
