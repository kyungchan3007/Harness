## AI

격리·보관 등급·예약 만료·운송을 구현했고 `pnpm check`는 ALL PASS입니다. 타입체크, 테스트 145개(`src/lab/lab.test.ts` 포함), lockfile, 태스크 기록 검사를 모두 통과했습니다. 커밋과 `pnpm issue-sync`는 요청이 없어 하지 않았고, 변경은 `task/0040-lab` 브랜치에 커밋 없이 남아 있습니다. 커밋하려면 `[허점]` `[보완]` `[컨텍스트·토큰]` 섹션이 필요합니다.

**기록 (AGENTS.md 순서대로)**
- `agents/intent/specs/0040-lab/`에 `prd.md`·`sdd.md`·`trace.md`를 작성했습니다.
- `TASKS.md`에 0040을 올리고 done으로 바꿨습니다.
- `JOURNAL.md`에 한 줄 남겼습니다.

**구현 (`src/lab/`, `types.ts`는 손대지 않음)**
- **격리:** `quarantine`·`release`는 ACTIVE 시료의 플래그만 바꾸고, 이미 그 상태여도 성공합니다. 격리된 시료의 분취·새 예약·소비는 `QUARANTINED`로 거절합니다. 이미 있는 예약, 이동, 폐기, 운송은 막지 않습니다.
- **보관 등급:** 받기·분취 자식 용기·이동·운송 목적지는 지원 목록에 요구 등급이 정확히 있어야 하고, 아니면 `STORAGE_INCOMPATIBLE`입니다. 분취 자식은 부모 등급을 이어받습니다(기존 임시값 `AMBIENT`를 대체).
- **예약 만료:**
  - `advanceTime`은 현재 이상의 유효한 절대 시각만 받습니다(같은 시각도 성공).
  - `expiresAt <= now`인 ACTIVE 예약을 한 번에 `EXPIRED`로 바꾸고 이벤트는 하나만 남깁니다. 풀리는 것은 예약 양뿐입니다.
  - `reserve`의 `expiresAt`은 `null`이거나 현재보다 미래여야 합니다.
- **운송:** 시작하면 목적 용기를 기존 점유 표(`occupied`)에 넣어 확보하므로, 받기·분취·이동·다른 운송이 `CONTAINER_OCCUPIED`로 막힙니다. 도착은 시료를 목적 용기로 옮기고 출발 용기를 비웁니다. 취소는 시료를 출발 용기에 둔 채 목적 용기 확보만 풉니다. 운송 중 분취·소비·폐기·이동·추가 운송은 `IN_TRANSIT`입니다. `ID_TAKEN`·`UNKNOWN_TRANSIT`·`TRANSIT_CLOSED`도 적용했습니다.
- 재전송, 원자성, 이력은 기존 `Engine.run`을 그대로 쓰므로 새 명령에도 같은 규칙이 적용됩니다.

**가정한 부분 (`prd.md`에 기록)**
- `receive`에 세 등급 외의 `storageGrade`가 오면 `INVALID_INPUT`입니다.
- 운송 목적지가 출발 용기와 같으면 `CONTAINER_OCCUPIED`입니다.

**과정에서 있었던 일**
- 가드 hook이 `prd.md`의 가정 표기 누락을 잡아 코드 작성 전에 문구를 고쳤습니다.
- 첫 게이트 실행은 테스트 파일의 타입 오류로 실패했습니다. 검사를 약화하지 않고 테스트 코드만 고쳐서 통과시켰습니다.
