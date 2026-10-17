## AI

격리·보관 등급·예약 만료·운송을 구현했고 `pnpm check`가 ALL PASS입니다(타입체크, 테스트 146개 중 새 `src/lab/lab.test.ts` 18개, lockfile 검사, 태스크 기록 검사). 커밋은 하지 않았고, `pnpm issue-sync`와 이슈 #1 동기화도 아직 안 했습니다.

## 구현 (`src/lab/`, `types.ts`는 그대로)
- **격리:** `quarantine`·`release`는 ACTIVE 시료의 `quarantined`만 바꾸고, 같은 값이어도 성공합니다. 분취·새 예약·소비는 `QUARANTINED`로 거절합니다. 예약 취소·이동·폐기·책임자 변경·운송은 막지 않습니다.
- **보관 등급:** 받기·분취 자식 용기·이동·운송 목적지가 시료의 등급을 정확히 지원해야 하고, 아니면 `STORAGE_INCOMPATIBLE`입니다. 분취 자식은 부모 등급을 물려받습니다(기존 임시값 `AMBIENT`는 제거).
- **예약 만료:** `advanceTime`은 현재보다 과거인 시각, 정수가 아니거나 범위를 벗어난 시각을 `INVALID_INPUT`으로 거절하고, 같은 시각은 성공합니다. `expiresAt <= now`인 ACTIVE 예약은 `EXPIRED`가 되며, 예약 양(`reserved`)만 풀고 남은 양·소비량·폐기량은 그대로입니다. 여러 예약이 만료돼도 이벤트는 하나입니다. `reserve`는 `expiresAt`이 `null`이거나 현재보다 미래의 유효 시각일 때만 받습니다.
- **운송:** 시작하면 목적 용기를 점유 맵에 올려, 받기·분취·이동·다른 운송이 `CONTAINER_OCCUPIED`로 막힙니다. 도착은 출발 용기를 비우고 시료를 목적 용기로 옮깁니다. 취소는 목적 확보만 풉니다. 운송 중 분취·소비·폐기·이동·추가 운송은 `IN_TRANSIT`입니다. 끝난 운송의 ID 재사용·없는 운송·끝난 운송 재조작은 각각 `ID_TAKEN`·`UNKNOWN_TRANSIT`·`TRANSIT_CLOSED`입니다.

재전송·`EVENT_CONFLICT`·실패 시 상태 불변·이력은 기존 `Engine.run`을 그대로 거치므로 새 명령에도 적용됩니다.

## 확인해 둘 점
- 다음은 문서에 정해져 있지 않아 PRD에 (가정)으로 적었습니다.
  - `receive`의 등급이 세 값 밖이면 `INVALID_INPUT`.
  - 운송 목적 용기 용량이 시료 남은 양보다 작으면 `CAPACITY_EXCEEDED`.
  - `expiresAt: undefined`는 `INVALID_INPUT`.
- 코드를 처음 고치려 했을 때 guard hook이 막았습니다. PRD의 가정 줄에 `(가정)` 표시가 없었고, "업무 값 없음" 줄이 업무 값 가정으로 오탐됐습니다. 검사를 피하지 않고 표시를 달았고, 의미 없는 그 줄은 지웠습니다.

## 기록
`agents/intent/specs/0040-lab/`에 `prd.md`·`sdd.md`·`trace.md`를 만들었고, TASKS.md(0040 done)와 JOURNAL.md도 갱신했습니다.
