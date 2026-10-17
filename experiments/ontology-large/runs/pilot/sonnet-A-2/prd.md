# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 시료 보관 엔진에 확장 계약(`types.ts`)의 새 필드·메서드(격리, 보관 등급, 예약 만료/논리 시각, 운송)가 연결돼 있지 않다. `quarantine`·`release`·`advanceTime`·`startTransit`·`confirmArrival`·`cancelTransit`은 미구현이고, `split` 자식의 등급은 임시값이다.
- **목표:** 기존 기능을 유지하며 `docs/`의 다섯 정책 문서(engine·quality·storage·reservations·transit)와 `types.ts` 계약대로 새 기능을 구현한다. 재전송(E5)·원자성·이력(E6) 규칙은 새 명령에도 적용한다.
- **비목표:** `types.ts` 수정, 문서에 없는 실제 연구실 관행 추가, 실제 시계·외부 저장소·동시 호출.

## 애매한 곳·가정
- 분취 자식의 보관 등급 — 부모 등급 상속, 자식 용기가 그 등급을 지원해야 함 (가정: `samples.ts` 정책 주석을 storage.md가 따르라고 함)
- `advanceTime(to)`가 현재와 같은 값 — 유효, 성공하고 이벤트 1개를 남김 (가정: 요청 문장 "현재 이상")
- `to`·`expiresAt`의 "유효 시각" — 0 이상 `MAX_SAFE_INTEGER` 이하 정수, NaN·소수·음수·비숫자는 `INVALID_INPUT` (가정: `types.ts` Tick 정의)
- 알 수 없는 `storageGrade` 값으로 받기 — `INVALID_INPUT` (가정: 세 등급 외 값은 입력 오류)
- 예약 `expiresAt`이 현재와 같음 — 미래가 아니므로 `INVALID_INPUT` (가정: 요청 문장 "현재보다 미래")
- 여러 규칙을 동시에 어기는 경우 — 어느 코드든 허용, 구현은 `IN_TRANSIT` → `QUARANTINED` 순 (가정: engine.md E6-4)
- 운송 시작 검사 순서 — ID_TAKEN → 시료 → 운송 중 → 용기 존재 → 점유 → 용량 → 등급, 출발=목적 용기는 `CONTAINER_OCCUPIED` (가정: E6-4로 순서 자유)
- 운송 ID는 시료·예약 ID와 따로 고유 (가정: engine.md E1-4 "ID는 종류마다 따로")
## Acceptance
- [x] `quarantine`·`release`: ACTIVE 시료만, 멱등 성공. 격리 시 분취·새 예약·소비는 `QUARANTINED`, 예약 취소·이동·폐기·책임자 변경·운송은 막지 않음, 기존 예약 불변
- [x] 보관 등급: 받기·분취·이동·운송 목적지가 `supportedGrades` 정확 포함일 때만 허용, 아니면 `STORAGE_INCOMPATIBLE`. 분취 자식은 부모 등급 상속
- [x] `advanceTime`·예약 만료: 과거·무효 시각 `INVALID_INPUT`, `expiresAt <= now` ACTIVE 예약은 `EXPIRED`로 양 해제(이벤트 1개), 실제 양 불변. 새 예약 `expiresAt`은 null 또는 now 초과
- [x] 운송: 시작·도착·취소, 목적 용기 배타 확보, 끝난 운송 기록·ID 유지(`ID_TAKEN`·`UNKNOWN_TRANSIT`·`TRANSIT_CLOSED`), 운송 중 분취·소비·폐기·이동·추가 운송은 `IN_TRANSIT`
- [x] 재전송·`EVENT_CONFLICT`·실패 시 무변경이 새 명령에도 적용됨 (단위 테스트)
- [x] `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
