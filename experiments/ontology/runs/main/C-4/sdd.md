# SDD — 시료 보관 엔진 설계

- **접근:** 메모리 기반 단일 호출 처리 엔진으로, 모든 상태를 Map으로 관리하고, 각 명령을 원자적 단위로 처리한다. (1) 입력 검증 단계: qty, ID 고유성, 참조 존재성, 상태 체크, (2) 연산 단계: 조건부 통과 시만 상태 변경, (3) 기록 단계: eventId 캐싱 + 이벤트 로깅, (4) 중복 제거: eventId로 이전 Receipt 반환 (R7)

## 설계 상세

### 데이터 구조

### 1. 내부 저장소
```typescript
type InternalState = {
  samples: Map<ID, {
    sampleId: ID
    parentId: ID | null
    rootId: ID
    remaining: Qty
    reserved: Qty  // ACTIVE 예약 양 합
    consumedQty: Qty
    discardedQty: Qty
    status: SampleStatus
    containerId: ID | null
    custodianId: ID
  }>
  
  reservations: Map<ID, {
    reservationId: ID
    sampleId: ID
    qty: Qty
    status: ReservationStatus
  }>
  
  containerToSample: Map<ID, ID | null>  // containerId → sampleId (또는 null)
  
  events: Array<EventView>
  
  usedEventIds: Map<ID, Receipt & { args: unknown }>  // idempotency 캐시
  
  seq: number  // 1부터 시작
}
```

### 2. Catalog 검증
- locationIds, custodianIds, containers 는 모두 존재해야 함
- containers의 모든 containerId는 고유
- containers의 locationId는 모두 valid
- capacity는 모두 양수

### 알고리즘

### 공통 검증
모든 명령의 첫 스텝:
```
1. eventId 중복 확인
   - usedEventIds에 있으면:
     - 같은 op + 같은 args → 저장된 Receipt 반환
     - 다른 op or 다른 args → EVENT_CONFLICT
   - 없으면 진행
2. (이후 모든 실패는 상태 변화 없음 + eventId 미기록)
```

### receive(eventId, {sampleId, containerId, custodianId, qty})

```
1. 공통 검증
2. 입력 검증
   - qty ∉ [1, 1,000,000] → INVALID_INPUT
   - sampleId 이미 사용 → ID_TAKEN
3. 참조 검증
   - custodianId not in catalog.custodianIds → UNKNOWN_CUSTODIAN
   - containerId not in catalog.containers → UNKNOWN_CONTAINER
4. 용기 상태 확인
   - containerToSample[containerId] ≠ null → CONTAINER_OCCUPIED
5. 용량 확인
   - qty > container.capacity → CAPACITY_EXCEEDED
6. 생성 및 기록
   - samples[sampleId] = {
       parentId: null,
       rootId: sampleId,
       remaining: qty,
       reserved: 0,
       consumedQty: 0,
       discardedQty: 0,
       status: "ACTIVE",
       containerId,
       custodianId
     }
   - containerToSample[containerId] = sampleId
   - seq++, event 기록
   - usedEventIds[eventId] = Receipt + args
   - return { ok: true, value: { eventId, seq: 이전값 } }
```

### split(eventId, parentId, children: [{sampleId, containerId, qty}, ...])

```
1. 공통 검증
2. 입력 검증
   - children.length = 0 → INVALID_INPUT
   - 각 qty ∉ [1, 1,000,000] → INVALID_INPUT
   - 각 sampleId 이미 사용 → ID_TAKEN
   - children에서 containerId 중복 → CONTAINER_OCCUPIED
3. 부모 검증
   - parentId not in samples → UNKNOWN_SAMPLE
   - parent.status ≠ "ACTIVE" → NOT_ACTIVE
4. 용기 검증
   - parent.containerId 이미 차 있음 (당연)
   - 각 child의 containerId:
     - not in catalog.containers → UNKNOWN_CONTAINER
     - containerToSample[containerId] ≠ null → CONTAINER_OCCUPIED
     - qty > container.capacity → CAPACITY_EXCEEDED
5. 이용 가능량 확인
   - availableQty = parent.remaining - parent.reserved
   - Σ(child.qty) > availableQty → INSUFFICIENT
6. 원자적 생성
   - 위 검증 모두 통과한 후:
   - parent.remaining -= Σ(child.qty)
   - 각 child에 대해:
     - samples[childId] 생성
     - parent.remaining = 0 → status "DEPLETED", containerId null
     - containerToSample 업데이트
   - seq++, event 기록
   - usedEventIds[eventId] = Receipt + args
   - return Receipt
```

### reserve(eventId, {reservationId, sampleId, qty})

```
1. 공통 검증
2. 입력 검증
   - qty ∉ [1, 1,000,000] → INVALID_INPUT
   - reservationId 이미 사용 → ID_TAKEN
3. 시료 검증
   - sampleId not in samples → UNKNOWN_SAMPLE
   - sample.status ≠ "ACTIVE" → NOT_ACTIVE
4. 이용 가능량 확인
   - available = sample.remaining - sample.reserved
   - qty > available → INSUFFICIENT
5. 기록
   - reservations[reservationId] = { ..., status: "ACTIVE" }
   - sample.reserved += qty
   - seq++, event 기록
   - usedEventIds[eventId] = Receipt + args
```

### cancel(eventId, reservationId)

```
1. 공통 검증
2. 예약 검증
   - reservationId not in reservations → UNKNOWN_RESERVATION
   - reservation.status ≠ "ACTIVE" → RESERVATION_CLOSED
3. 취소 처리
   - sample = samples[reservation.sampleId]
   - sample.reserved -= reservation.qty
   - reservation.status = "CANCELED"
   - seq++, event 기록
```

### consume(eventId, reservationId)

```
1. 공통 검증
2. 예약 검증
   - reservationId not in reservations → UNKNOWN_RESERVATION
   - reservation.status ≠ "ACTIVE" → RESERVATION_CLOSED
3. 소비 처리
   - sample = samples[reservation.sampleId]
   - sample.remaining -= reservation.qty
   - sample.reserved -= reservation.qty
   - sample.consumedQty += reservation.qty
   - reservation.status = "CONSUMED"
   - sample.remaining = 0 → status "DEPLETED", containerId null
   - seq++, event 기록
```

### discard(eventId, sampleId)

```
1. 공통 검증
2. 시료 검증
   - sampleId not in samples → UNKNOWN_SAMPLE
   - sample.status ≠ "ACTIVE" → NOT_ACTIVE
3. ACTIVE 예약 확인
   - sample.reserved > 0 → HAS_RESERVATION
4. 폐기 처리
   - sample.discardedQty += sample.remaining
   - sample.remaining = 0
   - sample.status = "DISCARDED"
   - containerToSample[sample.containerId] = null
   - sample.containerId = null
   - seq++, event 기록
```

### move(eventId, sampleId, targetContainerId)

```
1. 공통 검증
2. 시료 검증
   - sampleId not in samples → UNKNOWN_SAMPLE
   - sample.status ≠ "ACTIVE" → NOT_ACTIVE
3. 용기 검증
   - targetContainerId not in catalog.containers → UNKNOWN_CONTAINER
   - targetContainerId = sample.containerId → CONTAINER_OCCUPIED (같은 용기로)
   - containerToSample[targetContainerId] ≠ null → CONTAINER_OCCUPIED
   - sample.remaining > targetContainer.capacity → CAPACITY_EXCEEDED
4. 이동 처리
   - oldContainerId = sample.containerId
   - containerToSample[oldContainerId] = null
   - containerToSample[targetContainerId] = sampleId
   - sample.containerId = targetContainerId
   - seq++, event 기록
```

### transferCustody(eventId, sampleId, custodianId)

```
1. 공통 검증
2. 시료 검증
   - sampleId not in samples → UNKNOWN_SAMPLE
   - sample.status ≠ "ACTIVE" → NOT_ACTIVE
3. 책임자 검증
   - custodianId not in catalog.custodianIds → UNKNOWN_CUSTODIAN
4. 책임자 변경
   - sample.custodianId = custodianId
   - seq++, event 기록
```

### snapshot(): Snapshot

```
1. samples → Array<SampleView>
2. reservations → Array<ReservationView>
3. events → Array<EventView>
```

## 이벤트 기록(R8)

각 성공 명령마다:
```typescript
event: {
  seq: ++this.seq,
  eventId,
  op,
  args: <받은 인자 deep copy, eventId 제외>
    // receive: { sampleId, containerId, custodianId, qty }
    // split: { parentId, children }
    // reserve: { reservationId, sampleId, qty }
    // cancel, consume: { reservationId }
    // discard: { sampleId }
    // move: { sampleId, targetContainerId }
    // transferCustody: { sampleId, custodianId }
}
```

args는 **깊은 복사**하여 호출자 변경 후에도 이력 불변.

## 중복 제거(R7)

```typescript
usedEventIds: Map<ID, {
  eventId: ID
  seq: number
  op: string
  args: unknown (deep copy)
}>

candiateReceipt(eventId, op, args) {
  if (usedEventIds.has(eventId)) {
    cached = usedEventIds[eventId]
    if (cached.op === op && deepEqual(cached.args, args)) {
      return { ok: true, value: { eventId, seq: cached.seq } }
    } else {
      return { ok: false, code: "EVENT_CONFLICT" }
    }
  }
  // 계속 진행
}
```

비교 시:
- 객체는 keyOrder 무시, 배열은 순서 구별
- 깊은 비교 사용

## 불변식 보증

### 계보 보존 (R2-4)
```
for each sample with rootId r:
  root.initialQty = Σ(sample.remaining) + Σ(sample.consumedQty) + Σ(sample.discardedQty)
```

실제 검증은 하지 않지만, 모든 연산이 이 불변식을 지킴을 설계.

### 원자성 (R8-2)
split, consume 등 다중 상태 변화:
- 검증 단계: 모든 사전조건 확인 (실패 시 상태 무변화)
- 연산 단계: 한 번에 모든 상태 업데이트
- 기록 단계: event + seq 증가

## 엣지 케이스

1. 자식 qty 합이 정확히 부모 available과 같은 split → OK
2. 부모가 DEPLETED 후 자식은 ACTIVE 유지 → OK
3. DEPLETED 시료에 move 시도 → NOT_ACTIVE
4. 같은 eventId, 다른 명령 → EVENT_CONFLICT

- **대안·트레이드오프:**
  1. 이벤트 저장소: 메모리 내 배열 선택 (프로토타입이므로 간단함 + 요청에서 저장소 무시)
  2. 중복 제거 캐시: Map<ID, CachedEvent> 선택 (O(1) 조회 + eventId는 고유함)
  3. deepCopy 구현: 수동 재귀 선택 (JSON.stringify 회피 — 순환 참조 가능성)
  4. 컨테이너 상태: Map<containerId, sampleId> 선택 (O(1) 점유 확인 + 역인덱싱 필요)
  5. 실패 시 상태 보장: 검증 단계 분리 선택 (연산 전 모든 사전조건 검사 → 원자성 보증)

- **검증 계획:**
  - 단위 테스트: receive (단순 입수, 중복 ID, 미지 용기, 용량 초과), split (단순 분취, 부모 부족, 자식 용기 중복, 부모 DEPLETED), reserve/cancel/consume (예약 생성, 취소, 소비, 중복 cancel), discard (폐기, ACTIVE 예약 있을 때 실패), move (이동, 용기 중복 check, 용량 초과), transferCustody (책임자 변경), Idempotency R7 (같은 eventId 반복, 다른 eventId 충돌)
  - 통합 테스트: 공개 예시 4개 모두 통과 (split 원자성, 중복 제거, custodian 상속), 계보 보존 검증 (receive → split → consume → discard로 sum 검증), eventId 기록 검증 (실패는 미기록, 성공은 기록)
