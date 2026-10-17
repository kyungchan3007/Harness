## AI

격리·보관 등급·예약 만료·운송 기능을 모두 구현했고, `pnpm check`가 전부 통과했습니다(타입체크, 테스트 144개, 작업 기록 검사 포함). 커밋과 `pnpm issue-sync`는 아직 하지 않았습니다.

- **격리:** `quarantine`·`release`는 ACTIVE 시료에만 적용되고, 이미 그 상태여도 성공합니다. 격리된 시료의 분취·새 예약·예약 소비는 `QUARANTINED`로 거절합니다. 기존 예약은 건드리지 않습니다.
- **보관 등급:** 받기·분취·이동·운송 목적지에서 용기의 지원 목록에 시료 등급이 정확히 있어야 하고, 아니면 `STORAGE_INCOMPATIBLE`입니다. 분취 자식은 부모 등급을 이어받습니다(기존 임시값 `AMBIENT` 제거).
- **예약 만료:** `advanceTime`은 절대 시각을 받고, 과거나 잘못된 시각은 `INVALID_INPUT`입니다. `expiresAt <= now`인 ACTIVE 예약은 한 이벤트로 `EXPIRED`가 되며, 예약 양만 풀리고 남은 양·소비량·폐기량은 그대로입니다. `reserve`의 `expiresAt`은 `null`이거나 현재보다 커야 합니다.
- **운송:** 목적 용기를 기존 점유 맵에 넣어서, 받기·분취·이동·다른 운송이 모두 `CONTAINER_OCCUPIED`로 막힙니다. 운송 중에는 분취·소비·폐기·이동·추가 운송이 `IN_TRANSIT`입니다. 끝난 운송은 `TRANSIT_CLOSED`, 없는 운송은 `UNKNOWN_TRANSIT`, 운송 ID 재사용은 `ID_TAKEN`입니다.
- **기존 규칙:** 모든 새 명령은 기존 실행 경로를 거치므로 재전송·원자성·이력 규칙이 그대로 적용됩니다.

PRD에 가정으로 적어 둔 판단이 세 가지 있습니다.
- **`advanceTime`:** `to`가 현재와 같아도 성공으로 처리합니다.
- **`expiresAt`:** 현재 시각과 같은 값은 즉시 만료라서 "미래"가 아니라고 보고 거절합니다.
- **`receive`:** `storageGrade`가 세 값 중 하나가 아니면 `INVALID_INPUT`입니다.

작업 중 코드 수정이 hook에 한 번 막혔습니다. PRD의 가정 줄에 `(가정)` 표시가 빠져 있었고, 표시를 채운 뒤 진행했습니다.

- **코드:** `src/lab/` 안의 `quality.ts`, `transit.ts`, `samples.ts`, `reservations.ts`, `state.ts`를 고쳤습니다. `types.ts`는 그대로입니다.
- **테스트:** `src/lab/lab.test.ts`(16개)를 새로 추가했습니다.
- **기록:** `agents/intent/specs/0040-lab/`에 prd·sdd·trace를 만들었고, `TASKS.md`는 done으로, `JOURNAL.md`는 한 줄 추가했습니다.
