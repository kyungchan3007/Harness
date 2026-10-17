# 0040 — 시료 보관 엔진 확장 — PRD

## 개요
기존 시료 보관 엔진(`src/lab/`)의 기능을 그대로 유지하면서 격리·보관 등급·예약 만료·운송을 추가합니다.

- **이슈:** #1

## 요구사항

### 1. 격리(Quarantine)
- **quarantine / release**: ACTIVE 시료의 격리 여부를 설정합니다. 이미 같은 상태여도 성공합니다.
- **제약**: 격리된 시료는 분취·새 예약·예약 소비를 `QUARANTINED`으로 거절합니다.
- **독립성**: 격리는 기존 예약을 건드리지 않고, 격리 중에도 예약 취소·이동·폐기·책임자 변경은 가능합니다.

### 2. 보관 등급(Storage Grade)
- 시료마다 요구 등급(`storageGrade`)을 정하고, 용기마다 지원 등급 목록(`supportedGrades`)이 있습니다.
- **적용**: 받기·분취·이동·운송의 목적 용기가 시료 요구 등급을 정확히 지원해야 합니다. 아니면 `STORAGE_INCOMPATIBLE`.
- **불변**: 시료의 요구 등급은 만들어진 뒤 바뀌지 않습니다. 분취 자식은 부모의 등급을 상속합니다.
- **무관 관계**: 등급 사이에는 대체·상하 관계가 없습니다(예: FROZEN을 지원해도 CHILLED는 못 받음).

### 3. 예약 만료(Reservation Expiry)
- 논리 시각은 0에서 시작하고 `advanceTime(eventId, to)`로만 진행합니다.
- **만료 조건**: `expiresAt <= now`인 ACTIVE 예약은 모두 `EXPIRED`로 전환됩니다.
- **신규 예약**: `expiresAt`은 null(기한 없음) 또는 현재보다 미래여야 합니다. 아니면 `INVALID_INPUT`.
- **효과**: 만료는 예약 양을 풀지만, 실제 남은 양·소비·폐기는 바꾸지 않습니다. 만료된 예약은 기록에 남습니다.
- **독립성**: 만료는 격리·운송 확보를 바꾸지 않고, 격리 중·운송 중인 시료의 예약도 똑같이 만료됩니다.

### 4. 운송(Transit)
- **2단계**: `startTransit` → `confirmArrival`(도착) 또는 `cancelTransit`(취소).
- **상태**: 운송 ACTIVE → ARRIVED 또는 CANCELED.
- **점유**: 운송 시작 시 출발 용기는 계속 점유하고, 목적 용기는 배타적으로 확보됩니다.
- **도착**: 시료를 목적 용기로 옮기고 운송을 ARRIVED로 합니다.
- **취소**: 시료를 출발 용기에 둔 채 운송을 CANCELED로 하고 목적 확보를 풉니다.
- **운송 중 금지**: 분취·소비·폐기·직접 이동·추가 운송(IN_TRANSIT).
- **운송 중 허용**: 새 예약·예약 취소·책임자 변경·격리·해제·시각 진행.

## 계약
- 공개 인터페이스: `src/lab/types.ts`는 고치지 않습니다.
- 구현: `src/lab/` 안의 모듈들을 수정합니다.
- 기존 규칙: [engine.md](../../context/engine.md)·[quality.md](../../context/quality.md)·[storage.md](../../context/storage.md)·[reservations.md](../../context/reservations.md)·[transit.md](../../context/transit.md)를 따릅니다.
- 진입점: `createLab(catalog: Catalog): Lab`
- 실패: 예외가 아니라 `{ ok: false, code }`.

## 애매한 곳·가정
- 없음 — 정책 문서가 이미 명확하게 정의했습니다.

## Acceptance
- [ ] 격리(`quarantine`/`release`) 기능 구현
  - [ ] ACTIVE 시료만 처리 가능
  - [ ] 이미 같은 상태여도 성공
  - [ ] 격리된 시료는 split/reserve/consume 거절
- [ ] 보관 등급 검사 구현
  - [ ] 모든 용기 배정 시점에서 `supports()` 호출
  - [ ] 불일치하면 `STORAGE_INCOMPATIBLE` 거절
  - [ ] split 자식이 부모 등급 상속
- [ ] 예약 만료 기능 구현
  - [ ] `advanceTime` 구현: 시각 진행, 만료된 예약 EXPIRED 처리
  - [ ] `reserve` 시 `expiresAt` 유효성 검사
  - [ ] `expiresAt ≤ now` 예약은 ACTIVE가 될 수 없음
- [ ] 운송 기능 구현
  - [ ] `startTransit`: 운송 개시, 목적 용기 확보
  - [ ] `confirmArrival`: 도착 확정, 시료 이동
  - [ ] `cancelTransit`: 운송 취소, 확보 해제
  - [ ] 운송 중 금지: split/consume/discard/move/startTransit
- [ ] 온톨로지 검사 통과 (`pnpm onto:check`)
- [ ] 타입·테스트·린트 통과 (`pnpm check`)
