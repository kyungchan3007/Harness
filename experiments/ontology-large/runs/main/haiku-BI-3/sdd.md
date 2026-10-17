# SDD — 시료 보관 엔진 확장 구현 설계

## 아키텍처

기존 아키텍처 유지:
- `Engine`: 명령 실행 프레임워크 (재전송, 작업 복사본, 이력)
- 명령 모듈들: `samples.ts`, `reservations.ts`, `quality.ts`, `storage.ts`, `transit.ts`
- `Storage`: 용기 관리 및 점유 상태 추적

## 구현 계획

### 1단계: 저장소 확장 (storage.ts)

**현재 상태:**
- 용기 목록 보관
- `isFree(s: State, containerId)` 메서드 (시료 점유 확인)

**확장 내용:**
- 각 용기의 `supportedGrades` 저장
- `supportedGradesToo(s: State, container: Container, grade: StorageGrade): boolean`
  - 용기가 주어진 등급을 지원하는지 판단
- 운송 목적 용기 확보 상태 관리
  - `State.transitReservations`: Map<containerId, transitId> (어느 운송이 목적지 확보했는가)
  - `isReservedForTransit(s: State, containerId)`: 운송으로 확보되었는가?

### 2단계: 격리 명령 (quality.ts 추가/확장)

**현재 상태:**
- 아직 구현 안 됨

**구현 내용:**
```typescript
export function qualityCommands(engine: Engine): Pick<Lab, "quarantine" | "release"> {
  return {
    quarantine(eventId, sampleId) {
      // 1. ACTIVE 시료 확인
      // 2. 이미 격리되었어도 성공
      // 3. quarantined = true 설정
      // 4. 기존 예약은 그대로
    },
    release(eventId, sampleId) {
      // 1. ACTIVE 시료 확인
      // 2. 이미 해제되었어도 성공
      // 3. quarantined = false 설정
      // 4. 기존 예약은 그대로
    }
  }
}
```

**격리 영향:**
- `split`: 격리된 시료 → QUARANTINED 거절
- `reserve`: 격리된 시료 → QUARANTINED 거절
- `consume`: 격리된 시료 → QUARANTINED 거절
- `cancel`: 허용 (예약 양만 풀림)
- `move`: 허용
- `discard`: 허용
- `transferCustody`: 허용

### 3단계: 보관 등급 검증 (samples.ts, split, move 수정)

**receive:**
- 입력: `storageGrade` (이미 있음)
- 추가 검증: `storage.supportsGrade(container, storageGrade)` 확인 → STORAGE_INCOMPATIBLE

**split:**
- 각 자식 용기가 **부모의 등급**을 지원하는지 확인
  - 현재 `storageGrade: "AMBIENT"` (임시값) → `storageGrade: parent.storageGrade` 변경
  - 각 자식 용기에 대해 `storage.supportsGrade(container, parent.storageGrade)` 확인 → STORAGE_INCOMPATIBLE
- 격리된 부모 → QUARANTINED 거절

**move:**
- 목적 용기가 시료의 등급을 지원하는지 확인 → STORAGE_INCOMPATIBLE

### 4단계: 예약 만료 (reservations.ts 확장)

**현재 상태:**
- `reserve`, `cancel`, `consume` 구현
- `expiresAt` 필드 있음 (아직 활용 안 됨)

**advanceTime 추가:**
```typescript
advanceTime(eventId, to) {
  // 1. to가 유효한 정수인지 확인 (INVALID_INPUT)
  // 2. to >= now 확인 (INVALID_INPUT)
  // 3. now = to로 설정
  // 4. expiresAt <= now인 ACTIVE 예약 모두 찾기
  // 5. 각 예약에서:
  //    - 상태 → EXPIRED
  //    - 해당 시료에서 reserved 감소
  // 6. 이벤트 하나 기록 (args: { to })
}
```

**reserve 수정:**
- `expiresAt` 유효성 검증
  - null 또는 `now < expiresAt <= MAX_SAFE_INTEGER`
  - 아니면 INVALID_INPUT

### 5단계: 운송 기능 (transit.ts 추가)

**Transit 모듈 구조:**
- `startTransit(eventId, input: { transitId, sampleId, targetContainerId })`
- `confirmArrival(eventId, transitId)`
- `cancelTransit(eventId, transitId)`

**startTransit:**
```typescript
startTransit(eventId, input) {
  // 1. transitId 새것 확인 (ID_TAKEN)
  // 2. 시료 ACTIVE 확인 (NOT_ACTIVE)
  // 3. 시료가 이미 운송 중인가? (IN_TRANSIT)
  //    - State.transitsActive: Map<sampleId, transitId> 로 확인
  // 4. 목적 용기 존재·비어있음·확보 안 됨 확인 (CONTAINER_OCCUPIED, UNKNOWN_CONTAINER)
  // 5. 목적 용기 용량 확인 (CAPACITY_EXCEEDED)
  // 6. 목적 용기가 시료 등급 지원 확인 (STORAGE_INCOMPATIBLE)
  // 7. 운송 생성:
  //    - state.transits.set(transitId, { transitId, sampleId, sourceContainerId, targetContainerId, status: "ACTIVE" })
  //    - state.transitReservations.set(targetContainerId, transitId)
  //    - state.transitsActive.set(sampleId, transitId)
}
```

**confirmArrival:**
```typescript
confirmArrival(eventId, transitId) {
  // 1. 운송 존재 확인 (UNKNOWN_TRANSIT)
  // 2. 운송 ACTIVE 확인 (TRANSIT_CLOSED)
  // 3. 시료 ACTIVE 확인 (NOT_ACTIVE)
  // 4. 시료를 목적 용기로 이동
  //    - occupied.delete(sourceContainerId)
  //    - occupied.set(targetContainerId, sampleId)
  //    - sample.containerId = targetContainerId
  // 5. 운송 상태 → ARRIVED
  // 6. 목적 용기 확보 풀기
  //    - transitReservations.delete(targetContainerId)
  //    - transitsActive.delete(sampleId)
}
```

**cancelTransit:**
```typescript
cancelTransit(eventId, transitId) {
  // 1. 운송 존재 확인 (UNKNOWN_TRANSIT)
  // 2. 운송 ACTIVE 확인 (TRANSIT_CLOSED)
  // 3. 운송 상태 → CANCELED
  // 4. 목적 용기 확보 풀기
  //    - transitReservations.delete(targetContainerId)
  //    - transitsActive.delete(sampleId)
}
```

**운송 중 명령 제약:**
- split, consume, discard, move, startTransit 시작에 IN_TRANSIT 확인 필요

### 6단계: State 확장 (state.ts 수정)

**새 필드:**
```typescript
export interface State {
  // ... 기존 필드
  transitReservations: Map<ID, ID>;     // containerId → transitId (목적 용기 확보)
  transitsActive: Map<ID, ID>;           // sampleId → transitId (현재 운송 중인 시료)
}
```

### 7단계: Lab 조립 (lab.ts 수정)

현재는 명령 모듈들의 반환값을 스프레드 연산자로 조립합니다.
- `qualityCommands`: quarantine, release 추가
- `reservationCommands`: advanceTime 추가
- `transit.ts`: startTransit, confirmArrival, cancelTransit 추가

## 검증 순서 (engine.md E5, E6)

각 명령에서 검증 순서는:
1. 재전송 판정 (Engine.run이 처리)
2. 입력 유효성 (INVALID_INPUT)
3. ID 존재/새것 (UNKNOWN_*, ID_TAKEN)
4. 상태 판정 (NOT_ACTIVE, QUARANTINED, IN_TRANSIT 등)
5. 용량·수량 확인 (CAPACITY_EXCEEDED, INSUFFICIENT)
6. 저장소·예약 제약 (STORAGE_INCOMPATIBLE, HAS_RESERVATION 등)

## 문제 해결

### Q1: 시료의 등급은 어디서 정해지는가?
- `receive`에서 입력받음
- `split` 자식은 부모의 등급 상속
- 만들어진 뒤 절대 바뀌지 않음

### Q2: 운송 중에 다른 운송을 시작할 수 있는가?
- 아니오. 같은 시료의 추가 운송 시작 → IN_TRANSIT 거절

### Q3: 격리된 시료의 기존 예약에 새로운 소비 명령을 할 수 있는가?
- 아니오. consume → QUARANTINED 거절
- 하지만 이미 있는 예약을 cancel은 가능

### Q4: 만료된 예약을 다시 소비할 수 있는가?
- 아니오. EXPIRED 예약에 consume → RESERVATION_CLOSED 거절

## 모듈 간 의존성

```
Engine (events.ts)
  ├─ samples.ts (사용: engine, storage, custodians)
  ├─ reservations.ts (사용: engine, state의 samples·reservations)
  ├─ quality.ts (사용: engine, state의 samples)
  ├─ storage.ts (사용: catalog)
  │   └─ State 점유 상태 확인/수정
  └─ transit.ts (사용: engine, storage, state)

State (state.ts)
  ├─ copyState (명령 실행 전 복사)
  ├─ finish (시료 상태 완료 처리)
  └─ active (ACTIVE 시료 조회)
```

## 구현 순서

1. storage.ts: `supportsGrade` 메서드 추가
2. state.ts: 운송 관련 필드 추가
3. quality.ts: quarantine, release 구현
4. samples.ts: 등급 검증 추가 (receive, split, move)
5. reservations.ts: advanceTime, reserve 유효성 검증
6. transit.ts: startTransit, confirmArrival, cancelTransit 구현
7. samples.ts 수정: split에 격리 확인, 운송 중 명령 제약 추가
8. lab.ts: 모듈 조립 완료

## 테스트 포인트

- 격리된 시료: 분취/예약/소비 거절, 취소/이동/폐기 허용
- 등급 불일치: receive/split/move/startTransit 거절
- 예약 만료: advanceTime 후 EXPIRED, 이용 가능량 복구
- 운송 중: 분취/소비/폐기/이동 거절, 예약/취소/격리 허용
- 운송 도착/취소: 시료 이동·상태 변경, 목적 용기 확보 풀림
- 재전송: 같은 eventId·op·args → 처음 Receipt 반환
