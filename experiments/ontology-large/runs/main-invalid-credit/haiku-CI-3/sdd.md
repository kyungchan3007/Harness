# 0040 — 시료 보관 엔진 확장 — SDD

## 개요
각 명령은 Engine의 `run` 메서드 내에서 상태 변경 로직을 구현합니다. 원자성·재전송·이력은 이미 Engine에서 처리합니다.

- **접근:** Engine의 `run` 메서드를 통해 모든 명령이 원자성·재전송을 처리하므로, 각 명령은 상태 변경 로직만 구현합니다: (1) 유효성 검사 (입력·상태·제약) (2) 상태 변경 (3) 점유 관리 (occupied Map)
- **대안·트레이드오프:** 운송 중 상태 검사는 각 명령에서 `s.transits` 순회하여 ACTIVE 운송을 확인합니다. 별도 인덱스보다 단순하고 운송 수가 적어 성능 영향을 무시할 수 있습니다. 등급은 split 시점에 자식이 부모 등급을 상속하여 호출자는 지정하지 않고 인터페이스가 단순해집니다.
- **검증 계획:** `pnpm onto:check`로 불변식 검사(I8·I9·I12·I13), `pnpm test`로 모듈별 기능 테스트, `pnpm check`로 타입·린트 검사합니다.

## 아키텍처 변경

### 상태 구조 (state.ts)
기존 State에 추가 필드 없음 — 샘플·예약·운송 뷰에서 이미 필요한 필드들이 있습니다.

### 모듈별 구현

#### 1. quality.ts (격리)
새 함수 `qualityCommands(engine)`로 반환:
- `quarantine(eventId, sampleId)`: ACTIVE 시료만, 이미 격리 상태여도 성공
- `release(eventId, sampleId)`: ACTIVE 시료만, 이미 미격리 상태여도 성공

검사 시점:
- `split`: 부모가 격리되면 → `QUARANTINED`
- `reserve`: 시료가 격리되면 → `QUARANTINED`
- `consume`: 시료가 격리되면 → `QUARANTINED`

#### 2. storage.ts (보관 등급)
`supports(id: ID, grade: StorageGrade): boolean` 이미 구현됨.

검사 시점 (샘플·운송 모듈에서 호출):
- `receive`: 용기가 등급 지원 확인
- `split`: 각 자식 용기가 부모 등급 지원 확인
- `move`: 목적 용기가 시료 등급 지원 확인
- `startTransit`: 목적 용기가 시료 등급 지원 확인

#### 3. reservations.ts (예약 만료)
기존 함수 유지:
- `reserve`: `expiresAt` 유효성 검사 추가 (now보다 미래 또는 null)
- 새 함수 `advanceTime(eventId, to)`:
  - `to` 유효성 (현재 이상의 정수)
  - 만료된 예약을 모두 EXPIRED로 전환
  - 예약 양 풀기

#### 4. transit.ts (운송)
새 함수 `transitCommands(engine, storage)`로 반환:
- `startTransit(eventId, input)`: 운송 개시, 목적 용기 확보
- `confirmArrival(eventId, transitId)`: 도착 확정, 시료 이동
- `cancelTransit(eventId, transitId)`: 운송 취소, 확보 해제

운송 중 금지 검사 (다른 명령에서):
- `split`: `IN_TRANSIT` 확인
- `consume`: `IN_TRANSIT` 확인
- `discard`: `IN_TRANSIT` 확인
- `move`: `IN_TRANSIT` 확인
- `startTransit`: `IN_TRANSIT` 확인

#### 5. samples.ts (기존 기능 통합)
- `receive`: `supports()` 호출해 등급 검사 추가
- `split`: 
  - 부모 격리 상태 검사
  - 부모 운송 상태 검사
  - 각 자식 용기 등급 검사
  - 자식 등급 = 부모 등급 (현재는 TODO)
- `discard`: 운송 상태 검사 추가
- `move`: 
  - 등급 검사 추가
  - 운송 상태 검사 추가

### 상태 관리 (events.ts/state.ts)
- 운송 상태: `State.transits: Map<ID, TransitView>`
- 운송 점유: `State.occupied` 확장으로 운송 목적 용기 확보 관리
- `active()` 헬퍼 활용: 상태 검사 후 에러 코드 또는 샘플 반환

## 구현

### 1. samples.ts 수정
- `receive`: 등급 검사 (`storage.supports`)
- `split`: 격리·운송·등급 검사, 등급 상속 (부모 등급 사용)
- `discard`·`move`: 운송 상태 검사
- `move`: 등급 검사

### 2. quality.ts 작성
- `quarantine`·`release` 구현 (ACTIVE 시료만, 같은 상태도 성공)
- split/reserve/consume에서 격리 검사

### 3. reservations.ts 수정
- `reserve`: `expiresAt` 유효성 검사 (null 또는 now보다 미래)
- `advanceTime` 구현: 시각 진행, 만료된 예약 EXPIRED 처리, 예약 양 풀기

### 4. transit.ts 작성
- `startTransit`: 운송 개시, 목적 용기 확보
- `confirmArrival`: 도착, 시료 이동
- `cancelTransit`: 취소, 확보 해제
- split/consume/discard/move/startTransit에서 IN_TRANSIT 검사

### 5. lab.ts 수정
- `qualityCommands`, `transitCommands`, `advanceTime` 조립
