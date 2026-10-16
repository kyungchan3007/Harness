# 0040 — 연구실 시료 보관 엔진 — SDD

## 아키텍처 개요
메모리 내 이벤트 소싱 패턴:
- **Catalog** (불변): location, custodian, container 정의
- **State** (가변): samples, reservations, eventId → seq 매핑
- **Events** (불변): 성공한 명령 이력, seq 누적

## 내부 데이터 구조

### Catalog (입력, 불변)
```typescript
interface Catalog {
  locationIds: ID[]
  custodianIds: ID[]
  containers: Array<{ containerId: ID; locationId: ID; capacity: Qty }>
}
```
- 존재 확인: `Set<ID>` 3개 (locationIds, custodianIds, containerIds)

### State
```typescript
interface LabState {
  samples: Map<ID, SampleRecord>
  reservations: Map<ID, ReservationRecord>
  containerToSample: Map<ID, ID>  // 용기 → 시료 (역참조, ACTIVE만)
  usedIds: {
    sampleIds: Set<ID>
    reservationIds: Set<ID>
  }
  eventLog: Map<ID, LogEntry>  // eventId → { seq, op, args, result }
  nextSeq: number
}

interface SampleRecord {
  sampleId: ID
  parentId: ID | null
  rootId: ID
  remaining: Qty
  reserved: Qty  // ACTIVE 예약의 합
  consumedQty: Qty
  discardedQty: Qty
  status: SampleStatus
  containerId: ID | null
  custodianId: ID
}

interface ReservationRecord {
  reservationId: ID
  sampleId: ID
  qty: Qty
  status: ReservationStatus
}

interface LogEntry {
  seq: number
  eventId: ID
  op: string
  args: unknown  // 명령 시점의 복사본
}
```

## 명령 처리 흐름

### 1. Idempotency 검사 (R7-1, R7-2, R7-3)
```
if (eventId in eventLog) {
  if (op·args 같음 → return first Receipt (상태 변화 없음)
  else → return EVENT_CONFLICT
}
```
- args 비교: 객체는 키 순서 무시, 배열은 순서 구별
- 함수: `argsEqual(a1, a2): boolean`

### 2. 사전 검증 (각 명령별)
- R1 검사: ID 존재 확인 (UNKNOWN_*)
- R1-5 검사: qty 범위 [1, 1000000], 자식 목록 비어있지 않음 (INVALID_INPUT)
- R3-4 검사: reserve는 available >= qty (INSUFFICIENT)

### 3. 상태 변경 (원자성, R8-2)
- 모든 변경을 임시 변수에 수행
- 실패 시 즉시 return (원본 state 미변경)
- 성공 시에만 state에 반영 + eventLog 기록

### 4. Receipt 반환 (R8-1)
```typescript
{ ok: true, value: { eventId, seq: nextSeq++ } }
```

## 명령별 구현 상세

### receive (R1-1, R2-1)
**검증**
1. sampleId 미사용 (ID_TAKEN)
2. containerId 존재 (UNKNOWN_CONTAINER)
3. custodianId 존재 (UNKNOWN_CUSTODIAN)
4. qty 범위 (INVALID_INPUT)
5. container 비어 있음 (CONTAINER_OCCUPIED)
6. remaining <= capacity (CAPACITY_EXCEEDED)

**상태 변경**
1. samples[sampleId] 생성
   - parentId = null, rootId = sampleId
   - remaining = qty, reserved = 0, consumedQty = 0, discardedQty = 0
   - status = ACTIVE, containerId = containerId, custodianId = custodianId
2. containerToSample[containerId] = sampleId
3. usedIds.sampleIds.add(sampleId)

### split (R2-2, R2-3, R2-4, R5-3, R8-2)
**검증**
1. 자식 목록 비어있지 않음 (INVALID_INPUT)
2. 부모 존재 (UNKNOWN_SAMPLE)
3. 부모 ACTIVE (NOT_ACTIVE)
4. 자식 sampleId 모두 미사용 & 서로 다름 (ID_TAKEN)
5. 자식 containerId 모두 존재 & 비어 있음 & 서로 다름 (UNKNOWN_CONTAINER, CONTAINER_OCCUPIED)
   - 부모의 containerId도 "차 있는 용기"이므로 자식과 겹치면 CONTAINER_OCCUPIED
6. 각 자식 qty 범위 (INVALID_INPUT)
7. 각 자식 remaining <= 용기 capacity (CAPACITY_EXCEEDED)
8. 자식 qty 합 <= 부모 available (INSUFFICIENT)

**상태 변경** (원자성: 모두 성공 또는 모두 실패)
1. 자식마다:
   - samples[sampleId] 생성
     - parentId = parentId, rootId = parent.rootId
     - remaining = qty, reserved = 0
     - status = ACTIVE, containerId = containerId, custodianId = parent.custodianId
   - containerToSample[containerId] = sampleId
   - usedIds.sampleIds.add(sampleId)
2. 부모 상태 변경:
   - parent.remaining -= 합
   - parent.status = (parent.remaining === 0) ? DEPLETED : ACTIVE
   - if (DEPLETED) containerToSample.delete(parent.containerId), parent.containerId = null

### reserve (R3-1, R3-2)
**검증**
1. reservationId 미사용 (ID_TAKEN)
2. sampleId 존재 (UNKNOWN_SAMPLE)
3. 시료 ACTIVE (NOT_ACTIVE)
4. qty 범위 (INVALID_INPUT)
5. qty <= available (INSUFFICIENT)

**상태 변경**
1. reservations[reservationId] 생성
   - sampleId, qty, status = ACTIVE
2. samples[sampleId].reserved += qty
3. usedIds.reservationIds.add(reservationId)

### cancel (R3-3)
**검증**
1. reservationId 존재 (UNKNOWN_RESERVATION)
2. 예약 ACTIVE (RESERVATION_CLOSED)

**상태 변경**
1. reservations[reservationId].status = CANCELED
2. samples[sampleId].reserved -= qty

### consume (R3-4, R4-2)
**검증**
1. reservationId 존재 (UNKNOWN_RESERVATION)
2. 예약 ACTIVE (RESERVATION_CLOSED)

**상태 변경**
1. reservations[reservationId].status = CONSUMED
2. sample = samples[reservation.sampleId]
   - sample.remaining -= qty
   - sample.reserved -= qty
   - sample.consumedQty += qty
   - if (remaining === 0) {
       - sample.status = DEPLETED
       - containerToSample.delete(sample.containerId)
       - sample.containerId = null
     }

### discard (R4-3, R4-5)
**검증**
1. sampleId 존재 (UNKNOWN_SAMPLE)
2. 시료 ACTIVE (NOT_ACTIVE)
3. ACTIVE 예약 없음 (HAS_RESERVATION)
   - 조건: sample.reserved === 0

**상태 변경**
1. sample.discardedQty += sample.remaining
2. sample.remaining = 0
3. sample.status = DISCARDED
4. containerToSample.delete(sample.containerId)
5. sample.containerId = null

### move (R5-2, R5-4)
**검증**
1. sampleId 존재 (UNKNOWN_SAMPLE)
2. 시료 ACTIVE (NOT_ACTIVE)
3. targetContainerId 존재 (UNKNOWN_CONTAINER)
4. 대상 용기 비어 있음 (CONTAINER_OCCUPIED)
   - 현재 containerId와 같으면 CONTAINER_OCCUPIED
5. remaining <= 대상 용기 capacity (CAPACITY_EXCEEDED)

**상태 변경**
1. containerToSample.delete(sample.containerId)
2. sample.containerId = targetContainerId
3. containerToSample[targetContainerId] = sampleId

### transferCustody (R6-2, R6-3)
**검증**
1. sampleId 존재 (UNKNOWN_SAMPLE)
2. 시료 ACTIVE (NOT_ACTIVE)
3. custodianId 존재 (UNKNOWN_CUSTODIAN)

**상태 변경**
1. sample.custodianId = custodianId

## snapshot() 구현
```typescript
snapshot(): Snapshot {
  return {
    samples: [...samples.values()],
    reservations: [...reservations.values()],
    events: [...eventLog.values()]
      .sort((a, b) => a.seq - b.seq)
  }
}
```

## 불변식 검증 (테스트용 헬퍼)
- I1: 계보별로 `root.qty === Σ(remaining + consumedQty + discardedQty)`
- I2: containerToSample 검증
- I3: remaining <= capacity
- I4: reserved === Σ(ACTIVE 예약)
- I7: seq 연속성
- I10: 모든 ID는 종류별 고유
등은 테스트에서 검증

## 핵심 구현 포인트
1. **args 복사 (R8-3)**: `JSON.parse(JSON.stringify(args))` 또는 수동 복사
2. **available 계산**: `remaining - reserved` (derived, 저장 안 함)
3. **containerToSample 역참조**: split 검증 시 성능 (O(1) containerId 확인)
4. **원자성**: split에서 첫 자식 검증 실패 시 상태 전혀 변경 안 함
5. **eventId 중복**: Set으로 빠른 확인

## 접근
1. **이벤트 소싱**: 모든 명령을 eventLog에 seq와 함께 기록 → snapshot 재현 가능
2. **상태 분리**:
   - Catalog: createLab 입력 (불변)
   - LabState: samples, reservations, 역참조 맵, 사용된 ID 집합, eventLog, seq
3. **명령 처리 3단계**:
   - Idempotency 검사 (같은 eventId 확인)
   - 사전 검증 (R1~R6 규칙)
   - 상태 변경 + 이력 기록 (원자적)
4. **자료구조**:
   - Map<ID, SampleRecord>: O(1) 시료 조회
   - Map<ID, ReservationRecord>: O(1) 예약 조회
   - Map<ID, ID> (containerToSample): O(1) 용기 중복 확인
   - Set<ID>: usedSampleIds, usedReservationIds (O(1) 재사용 확인)

## 대안·트레이드오프
| 항목 | 채택 | 이유 |
| --- | --- | --- |
| args 복사 | JSON.parse(JSON.stringify) | 간단하고 충분 (R8-3 보증) |
| 계산형 available | remaining - reserved | 저장 비용 절감, 계산 비용 무시 |
| 역참조 containerToSample | Map | split 자식 검증 O(1) (없으면 O(n)) |
| 원자성 구현 | 조건부 단계 후 일괄 반영 | JS 메모리는 단일 스레드 (락 불필요) |
| snapshot 정렬 | seq로 정렬 | 재현성, 일관성 |

## 검증 계획
1. **단위 테스트** (각 명령별)
   - receive: 정상 케이스, UNKNOWN_CONTAINER, CAPACITY_EXCEEDED, CONTAINER_OCCUPIED 등
   - split: 정상, 원자성(실패 시 첫 자식도 없음), 부모 DEPLETED
   - reserve: available 계산, INSUFFICIENT
   - cancel: ACTIVE·CANCELED 상태 확인
   - consume: remaining·reserved·consumedQty 동시 변경
   - discard: ACTIVE 예약 체크, containerId null
   - move: 용기 비어있기, capacity 검사
   - transferCustody: 상태·양 미변경

2. **통합 테스트** (공개 예시 5개)
   - 예1: reserve·consume 흐름
   - 예2: split 원자성
   - 예3: move·transferCustody·consume 연쇄
   - 예4: split 실패
   - 예5: idempotency (같은 eventId 재전송)

3. **불변식 검증** (테스트 후 snapshot 확인)
   - I1: 계보별 수량 보존
   - I2: containerToSample 1:1 대응
   - I3: remaining <= capacity
   - I4: reserved = Σ(ACTIVE 예약)
   - I7: seq 연속성

4. **타입·린트** (pnpm check)
   - tsc: 타입 안전성
   - eslint: 스타일·오류

---

- **접근:** 이벤트 소싱 패턴(모든 명령 기록) + 상태 분리(Catalog/LabState) + 명령 처리 3단계(idempotency 검사/사전 검증/상태 변경) + Map/Set 자료구조(O(1) 조회·검증)
  - Catalog는 createLab 입력으로 불변 유지
  - LabState는 samples, reservations, containerToSample 역참조, usedIds 집합, eventLog, seq 누적
  - 각 명령은 idempotency 확인 후 원자적으로 상태 변경
- **대안·트레이드오프:** 
  - args 복사: JSON.parse(JSON.stringify) 선택 (수동 복사보다 간단, 함수 없다고 가정)
  - available: remaining - reserved 계산형 (저장 비용 절감, 계산 무시할 수 있음)
  - 역참조: containerToSample Map 유지 (split 검증 O(1), 없으면 O(n))
  - 원자성: 조건부 단계 후 일괄 반영 (JS 단일 스레드 메모리에서 락 불필요)
- **검증 계획:** 
  - 단위 테스트 (각 명령별 정상·오류 케이스)
  - 통합 테스트 (공개 예시 5개 재현)
  - 불변식 검증 (I1~I4, I7 snapshot 확인)
  - pnpm check (tsc + eslint)
