## AI

격리·보관 등급·예약 만료·운송을 구현했고 `pnpm check`가 ALL PASS입니다. tsc, vitest 158개, 온톨로지 불변식 검사, 태스크 기록 검사를 모두 통과했습니다. 커밋과 `pnpm issue-sync`는 아직 하지 않았습니다. 요청하지 않으셔서 진행하지 않았고, 커밋하면 `[허점]`·`[보완]`·`[컨텍스트·토큰]` 섹션이 필요합니다.

**구현 (`src/lab/`, `types.ts`는 그대로)**
- **격리:** `quarantine`·`release`는 이미 같은 상태여도 성공합니다. 격리된 시료의 분취·새 예약·소비는 `QUARANTINED`로 거절합니다. 예약 취소·이동·폐기·책임자 변경·운송은 허용하고 기존 예약은 건드리지 않습니다.
- **보관 등급:** `receive`·`split`·`move`·`startTransit`이 목적 용기의 지원 목록에 요구 등급이 정확히 있는지만 봅니다. 분취 자식은 부모 등급을 이어받습니다(기존 임시값 AMBIENT 제거).
- **예약 만료:** `advanceTime`은 현재 이상의 유효한 절대 시각만 받고, 과거나 비정수는 `INVALID_INPUT`입니다. `expiresAt ≤ now`인 ACTIVE 예약은 경계 포함해 모두 `EXPIRED`가 되고 이벤트는 하나입니다. 풀리는 것은 예약 양뿐입니다. 새 예약의 `expiresAt`은 `null`이거나 현재보다 큰 유효 시각이어야 합니다.
- **운송:** 목적 용기 확보는 상태에 `held` 맵을 따로 두어 `occupied`와 섞이지 않게 했습니다. `Storage.isFree`가 둘 다 보므로 받기·분취·이동·다른 운송이 같은 판정을 씁니다. 운송 중 분취·소비·폐기·이동·추가 운송은 `IN_TRANSIT`입니다. 끝난 운송은 `ID_TAKEN`, `TRANSIT_CLOSED`, `UNKNOWN_TRANSIT`을 냅니다.
- 재전송·원자성·이력은 기존 `engine.run`을 그대로 거칩니다.

**테스트:** `src/lab/lab.test.ts`에 16개를 추가했습니다. 정확 일치 등급, 만료 경계, 배타 확보, 재전송을 포함합니다.

**문서가 정하지 않아 가정한 값**(PRD "애매한 곳"에 기록)
- `receive`의 잘못된 등급 값과 Tick 범위 밖 값은 `INVALID_INPUT`입니다.
- 운송 용량 검사는 `move`와 같게 남은 양 대비 목적 용기 용량입니다.
- 목적 용기가 출발 용기와 같으면 `CONTAINER_OCCUPIED`입니다.

**기록:** `agents/intent/specs/0040-lab/`에 `prd.md`·`sdd.md`·`trace.md`를 만들었습니다. TASKS는 done으로, JOURNAL은 한 줄 추가했습니다.

이슈 #1 연결과 `task/0040-lab` 브랜치는 이미 준비돼 있다고 하셔서 확인하지 않았습니다.
