## AI

격리·보관 등급·예약 만료·운송을 모두 구현했고, `pnpm check`가 ALL PASS입니다(테스트 143개, 새로 만든 15개 포함). 커밋과 이슈 동기화는 하지 않았습니다. 지시가 없어서 변경은 `task/0040-lab` 작업 트리에 그대로 있습니다.

- **격리:** `quarantine`·`release`는 ACTIVE 시료에서만 동작하고, 이미 그 상태여도 성공합니다. 기존 예약은 건드리지 않습니다. 격리된 시료의 분취·새 예약·소비는 `QUARANTINED`입니다.
- **보관 등급:** 받기·분취·이동·운송 목적지에서 지원 목록에 요구 등급이 정확히 있어야 하고, 아니면 `STORAGE_INCOMPATIBLE`입니다. 분취 자식은 부모 등급을 상속합니다(`samples.ts` 주석대로).
- **예약 만료:**
  - `advanceTime`은 현재 이상의 유효한 정수 시각만 받고, 아니면 `INVALID_INPUT`입니다.
  - `expiresAt ≤ now`인 ACTIVE 예약은 경계 포함으로 `EXPIRED`가 되며 이벤트는 하나입니다. 예약 양만 풀립니다.
  - 새 예약의 `expiresAt`은 `null`이거나 현재보다 큰 유효 정수여야 합니다.
- **운송:**
  - `startTransit`은 목적 용기를 점유 맵에 올려 확보하므로, 받기·분취·이동·다른 운송이 `CONTAINER_OCCUPIED`로 막힙니다.
  - `confirmArrival`은 시료를 목적 용기로 옮기고 `ARRIVED`로, `cancelTransit`은 시료를 출발 용기에 둔 채 `CANCELED`로 바꿉니다.
  - 운송 중 분취·소비·폐기·이동·추가 운송 시작은 `IN_TRANSIT`입니다.
  - 새 명령도 기존 재전송·원자성·이력 규칙을 그대로 따릅니다.

`types.ts`는 건드리지 않았습니다. 코드는 `src/lab/`의 `quality.ts`·`reservations.ts`·`samples.ts`·`transit.ts`와 `state.ts`(`inTransit` 추가)이고, 테스트는 `src/lab/lab.test.ts`입니다.

`agents/intent/specs/0040-lab/`에 `prd.md`·`sdd.md`·`trace.md`를 만들었고, TASKS(done)와 JOURNAL도 갱신했습니다. 문서에 없는 항목은 `prd.md`에 (가정)으로 적었습니다:
- `receive`의 등급 값이 세 가지가 아니면 `INVALID_INPUT`.
- `advanceTime`의 `to`와 `expiresAt`이 정수가 아니거나 MAX_SAFE_INTEGER를 넘으면 `INVALID_INPUT`.
