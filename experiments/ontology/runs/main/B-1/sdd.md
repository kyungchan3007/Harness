# 0040 — 연구실 시료 보관 엔진 — SDD

## 개요

- **접근:**
  - 메모리 내 상태 관리. Map 기반 레지스트리로 O(1) 조회.
  - 순차 이벤트 기록 (immutable 이력)
  - EventId 캐시로 idempotency 보장
  - 각 명령마다 원자적 성공/실패 처리

## 아키텍처

```
Lab (공개 인터페이스)
 ├─ EventStore (eventId → Receipt·args 캐시)
 ├─ SampleRegistry (sampleId → SampleState)
 ├─ ReservationRegistry (reservationId → ReservationState)
 ├─ ContainerRegistry (containerId → { sampleId, remaining } 또는 empty)
 └─ EventLog (seq, events[])
```

## 핵심 데이터 구조

### SampleState (내부)
```typescript
{
  sampleId: ID;
  parentId: ID | null;      // 부모 시료 ID
  rootId: ID;               // 계보 루트 ID
  remaining: Qty;           // 용기에 남은 양
  reserved: Qty;            // ACTIVE 예약 양의 합
  consumedQty: Qty;         // 누적 소비량
  discardedQty: Qty;        // 누적 폐기량
  status: SampleStatus;     // ACTIVE|DEPLETED|DISCARDED
  containerId: ID | null;   // 현재 용기 (끝나면 null)
  custodianId: ID;          // 보관 책임자
}
```

### ReservationState (내부)
```typescript
{
  reservationId: ID;
  sampleId: ID;
  qty: Qty;
  status: ReservationStatus;  // ACTIVE|CANCELED|CONSUMED
}
```

## 알고리즘 (명령별)

### receive(eventId, { sampleId, containerId, custodianId, qty })

**검사** (순서 중요):
1. R7: eventId 중복 캐시 확인 → 캐시 있으면 Receipt 반환
2. R1.1: sampleId 미사용 확인 (ID_TAKEN)
3. R1.1: containerId ∈ catalog.containers (UNKNOWN_CONTAINER)
4. R1.1: custodianId ∈ catalog.custodianIds (UNKNOWN_CUSTODIAN)
5. R5.1: 해당 container 비어있는지 확인 (CONTAINER_OCCUPIED)
6. R1.2: qty ∈ [1, 1M] (INVALID_INPUT)
7. R1.3: container.capacity ≥ qty (CAPACITY_EXCEEDED)

**성공 시**:
- SampleState 생성: remaining=qty, reserved=0, consumedQty=0, discardedQty=0, status=ACTIVE, parentId=null, rootId=sampleId
- ContainerRegistry: containerId → { sampleId, remaining: qty }
- SampleRegistry에 추가
- EventLog 기록 (seq++)

**반환**: { ok: true, value: { eventId, seq } } 또는 { ok: false, code }

---

### split(eventId, parentId, children)

**검사**:
1. R7: eventId 중복 확인
2. R1.1: parentId ∈ SampleRegistry (UNKNOWN_SAMPLE)
3. R4: 부모 status = ACTIVE (NOT_ACTIVE)
4. INVALID_INPUT: children 배열 비어있음 또는 qty < 1
5. **각 자식마다**:
   - sampleId 미사용 (ID_TAKEN)
   - containerId ∈ catalog, 비어있음 (CONTAINER_OCCUPIED)
   - qty ∈ [1, 1M] (INVALID_INPUT)
   - container.capacity ≥ qty (CAPACITY_EXCEEDED)
   - **서로 다른 containerId 확인** (CONTAINER_OCCUPIED if 같음)
6. **합계 검사**: children.reduce(c => c.qty) ≤ parentAvailable (R3.1)

**성공 시 (원자적)**:
- 각 자식마다:
  - SampleState 생성: remaining=qty, reserved=0, status=ACTIVE, parentId, rootId=parent.rootId
  - ContainerRegistry에 배정
  - SampleRegistry에 추가
- 부모: remaining -= 자식들의 합
- 부모 상태: remaining=0이면 DEPLETED + containerId=null
- EventLog 기록 (seq++)

**반환**: { ok, value, code }

---

### reserve(eventId, { reservationId, sampleId, qty })

**검사**:
1. R7: eventId 중복
2. INVALID_INPUT: qty ∉ [1, 1M]
3. R1.1: reservationId 미사용 (ID_TAKEN)
4. R1.1: sampleId ∈ SampleRegistry (UNKNOWN_SAMPLE)
5. R4: 시료 status = ACTIVE (NOT_ACTIVE)
6. R3.2: available = remaining - reserved, available ≥ qty (INSUFFICIENT)

**성공 시**:
- ReservationState 생성: status=ACTIVE
- SampleState.reserved += qty
- EventLog 기록

**반환**: { ok, value, code }

---

### cancel(eventId, reservationId)

**검사**:
1. R7: eventId 중복
2. R1.1: reservationId ∈ ReservationRegistry (UNKNOWN_RESERVATION)
3. R3.5: status = ACTIVE (RESERVATION_CLOSED)

**성공 시**:
- ReservationState.status = CANCELED
- SampleState.reserved -= qty
- EventLog 기록

**반환**: { ok, value, code }

---

### consume(eventId, reservationId)

**검사**:
1. R7: eventId 중복
2. R1.1: reservationId ∈ ReservationRegistry (UNKNOWN_RESERVATION)
3. R3.5: status = ACTIVE (RESERVATION_CLOSED)

**성공 시**:
- reservation = ReservationRegistry[reservationId]
- sample = SampleRegistry[reservation.sampleId]
- sample.remaining -= reservation.qty
- sample.reserved -= reservation.qty
- sample.consumedQty += reservation.qty
- sample.status: remaining=0이면 DEPLETED + containerId=null
- ReservationState.status = CONSUMED
- EventLog 기록

**반환**: { ok, value, code }

---

### discard(eventId, sampleId)

**검사**:
1. R7: eventId 중복
2. R1.1: sampleId ∈ SampleRegistry (UNKNOWN_SAMPLE)
3. R4: status = ACTIVE (NOT_ACTIVE)
4. R4.3: ACTIVE 예약 개수 = 0 (HAS_RESERVATION)

**성공 시**:
- sample.discardedQty += sample.remaining
- sample.remaining = 0
- sample.status = DISCARDED
- sample.containerId = null
- EventLog 기록

**반환**: { ok, value, code }

---

### move(eventId, sampleId, targetContainerId)

**검사**:
1. R7: eventId 중복
2. R1.1: sampleId ∈ SampleRegistry (UNKNOWN_SAMPLE)
3. R5.2: targetContainerId ∈ catalog (UNKNOWN_CONTAINER)
4. R4: status = ACTIVE (NOT_ACTIVE)
5. R5.2: targetContainerId 비어있음 & capacity ≥ sample.remaining (CONTAINER_OCCUPIED|CAPACITY_EXCEEDED)
6. R5.2: 지금 containerId와 targetContainerId 다름 (CONTAINER_OCCUPIED)

**성공 시**:
- 기존 container 비우기
- targetContainer에 배정
- sample.containerId = targetContainerId
- EventLog 기록

**반환**: { ok, value, code }

---

### transferCustody(eventId, sampleId, custodianId)

**검사**:
1. R7: eventId 중복
2. R1.1: sampleId ∈ SampleRegistry (UNKNOWN_SAMPLE)
3. R1.1: custodianId ∈ catalog (UNKNOWN_CUSTODIAN)
4. R4: status = ACTIVE (NOT_ACTIVE)

**성공 시**:
- sample.custodianId = custodianId
- EventLog 기록

**반환**: { ok, value, code }

---

### snapshot()

**반환**: { samples: [...], reservations: [...], events: [...] }

## EventId 캐시 (R7)

```typescript
eventCache: Map<ID, {
  receipt: { eventId, seq },
  args: any  // 호출 인자 (eventId 제외)
}>
```

**비교 로직**:
- 객체: 키 순서 무시, 값 deep-equal
- 배열: 순서 구별

**실패한 명령**: eventCache에 기록 안 함 (재시도 가능)

## Validation 전용

- qty: 1 이상 1,000,000 이하, 정수
- ID: string (형식 검사 없음)
- 용기 용량: Qty (정수)

## 불변식 체크 (테스트용)

```typescript
invariant(samples, reservations, rootId) {
  const root = samples.find(s => s.rootId === rootId);
  const received = root?.remaining || 0;  // 루트가 받은 양
  const total = samples
    .filter(s => s.rootId === rootId)
    .reduce((sum, s) => sum + s.remaining + s.consumedQty + s.discardedQty, 0);
  return total === received;
}
```

- **대안·트레이드오프:**
  - Map 기반: O(1) 조회 vs Array 순회
  - deepEqual 직접 구현: 외부 라이브러리 최소화 vs lodash·fast-deep-equal
  - EventCache에 실패 미기록: R7 재시도 가능 vs 메모리 추적 비효율

- **검증 계획:**
  - 단위 테스트: receive (ID 유일성, 용기, 용량, qty), split (부모 상태, 자식 용기 중복, 수량), reserve/cancel/consume (예약 상태), discard (ACTIVE 예약), move (용기, 용량), transferCustody (custodian)
  - 통합 테스트: 공개 예시 4개 (예약 후 이용 가능, 분취 후 부모 DEPLETED, move+transferCustody+consume, 원자성)
  - 엣지 케이스: idempotency (같은 eventId·인자), EVENT_CONFLICT (같은 eventId·다른 인자), NOT_ACTIVE, 계보 무결성
