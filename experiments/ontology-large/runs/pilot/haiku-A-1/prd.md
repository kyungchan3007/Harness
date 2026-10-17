# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** 시료 보관 엔진의 기존 기능(receive, split, reserve, cancel, consume, discard, move, transferCustody)은 핵심만 구현하고 있으며, 격리·보관 등급·예약 만료·운송 기능이 없습니다.
- **목표:** 기존 기능을 유지하면서 네 가지 새 기능을 추가해 실제 시료 관리 워크플로우를 지원합니다.
- **비목표:** 동시 호출, 실제 시계, 외부 저장소 처리. 메모리 안에서 순차 처리만 다룹니다.

## 기능 요구사항

### 1. 격리 (quality.md)
- `quarantine(eventId, sampleId)`: ACTIVE 시료를 격리 상태로 설정
- `release(eventId, sampleId)`: ACTIVE 시료의 격리 해제
- 이미 그 상태여도 성공 (멱등)
- 격리된 시료는 분취·새 예약·예약 소비 불가 → `QUARANTINED`
- 격리 중에도 예약 취소·이동·폐기·책임자 변경·운송 가능
- 예약 상태·양·만료는 격리로 변경 안 함

### 2. 보관 등급 (storage.md)
- 시료의 `storageGrade` (요구 등급)과 용기의 `supportedGrades` (지원 등급 목록) 매칭 필요
- 등급은 `AMBIENT`·`CHILLED`·`FROZEN` (대체·상하 관계 없음)
- 적용 범위: receive, split (자식 용기), move, startTransit (목적지)
- 맞지 않으면 `STORAGE_INCOMPATIBLE` 거절
- 시료의 요구 등급은 생성 후 절대 변경 안 함

### 3. 예약 만료 (reservations.md)
- 논리 시각은 0에서 시작, `advanceTime(eventId, to)`로만 진행 (절대 시각)
- 과거 시각은 `INVALID_INPUT` 거절
- 새 예약의 `expiresAt`은 null (기한 없음) 또는 현재보다 미래 값만 가능
- 시각이 진행돼 `expiresAt <= now`인 ACTIVE 예약은 `EXPIRED`로 상태 변경
- 만료는 예약 양만 풀어주고, 실제 남은 양·소비량·폐기량은 변경 안 함
- 만료된 예약은 기록에 남음 (지워지지 않음)

### 4. 운송 (transit.md)
- `startTransit(eventId, {transitId, sampleId, targetContainerId})`: 운송 시작, 고유한 transitId 할당
- `confirmArrival(eventId, transitId)`: 도착 확정, 시료를 목적 용기로 이동, 운송 상태 `ARRIVED`
- `cancelTransit(eventId, transitId)`: 운송 취소, 시료는 출발 용기에 남음, 운송 상태 `CANCELED`, 목적 용기 확보 해제
- 운송 중 분취·소비·폐기·직접 이동·추가 운송 불가 → `IN_TRANSIT`
- 운송 중에도 새 예약·예약 취소·책임자 변경·격리·시각 진행은 가능
- 도착·취소 후 같은 성공 이벤트 재송신 → 첫 Receipt 돌려주고 상태 변경 없음
- 운송 ID 재사용 불가 → `ID_TAKEN`, 없는 운송 조작 → `UNKNOWN_TRANSIT`, 끝난 운송 새 이벤트 → `TRANSIT_CLOSED`

## 애매한 곳·가정
- 없음 — 요청과 문서에 모두 명시됨

## Acceptance
- [x] 모든 4가지 기능이 구현되고 문서 계약을 따름
- [x] 기존 기능 회귀 테스트 통과 (128개 테스트 ALL PASS)
- [x] `pnpm check` 통과 (타입, 린트, 테스트 ALL PASS)
- [x] 불필요한 예외 없이 `{ ok: false, code }` 반환

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
