# SDD 0040 — 시료 보관 엔진 설계

- **접근:** 인메모리 상태 머신을 TypeScript로 구현. Map과 Set으로 상태 관리, 각 명령을 원자적으로 처리하는 전수·검증·변경 순서를 따름. 이벤트 중복 재전송은 eventIdMap으로 추적, 모든 규칙(R1~R8)을 각 명령에서 체크.

- **대안·트레이드오프:**
  1. **재전송 로직 위치**: 모든 명령의 가장 먼저 체크 (R7 명시) — 실패한 명령과 성공한 명령을 구별하고, 중복 재전송 시 상태 변화 없이 처음 Receipt 반환. 트레이드오프: 매 명령마다 검사 오버헤드 ↔ 규칙 명확성 (선택 가치 > 오버헤드).
  2. **args 복사 시점**: recordEvent 안에서 copyObject 호출 — 이력이 호출자의 나중 변경으로부터 독립적 (I11). 트레이드오프: 메모리 사용 증가 ↔ 불변식 I11 보장 (선택 필수).
  3. **reserved 계산 vs 유지**: reserved를 유지 (매 reserve/cancel/consume에서 업데이트) — available 계산의 O(1) 성능 + 예약 상태 일관성. 트레이드오프: 상태 변수 하나 더 ↔ 쿼리 성능 (선택 필요).

- **검증 계획:**
  1. **단위 검증**: isValidQty (1~1,000,000 범위 체크), getAvailable (remaining − reserved 계산), argsEqual (객체 비교: 키 순서 무시, 배열 순서 구별).
  2. **통합 검증**: 불변식 I1~I11 각 명령 후 상태 일관성 확인 / 공개 예시 5개 시나리오별 수동 검증 (S1 100→예약 40→S2 50 분취, S1 100→S2 60 S3 40 분취, 이동·책임자 변경, split 자식 용기 차 있음, consume 재전송).
  3. **자동 검증**: `pnpm check` (TypeScript 타입 + Jest 테스트) — 각 ErrorCode별 케이스 / 재전송 시나리오 / split 원자성 (부분 실패 없음) / 불변식 I1 (수량 보존).

## 아키텍처

### 상태 구조
```typescript
interface State {
  samples: Map<sampleId, Sample>
  reservations: Map<reservationId, Reservation>
  containers: Map<containerId, Container>
  custodians: Set<custodianId>
  events: EventView[]
  eventIdMap: Map<eventId, Receipt>  // 중복 재전송 용
}

interface Sample {
  sampleId: ID
  parentId: ID | null
  rootId: ID
  remaining: Qty
  reserved: Qty         // ACTIVE 예약 합, 계산하지 말고 유지
  consumedQty: Qty
  discardedQty: Qty
  status: SampleStatus
  containerId: ID | null
  custodianId: ID
}

interface Reservation {
  reservationId: ID
  sampleId: ID
  qty: Qty
  status: ReservationStatus
}

interface Container {
  containerId: ID
  locationId: ID
  capacity: Qty
  currentSampleId: ID | null   // ACTIVE 시료만, 끝난 시료는 null
}
```

### 핵심 검증 순서

**모든 명령의 시작:**
1. (R7) 성공한 eventId 재전송 체크 → 처음 Receipt 반환하고 상태 그대로
2. (R1) 기본 참조 검증 (UNKNOWN_*, ID_TAKEN, INVALID_INPUT 등)
3. 상태·불변식 검증 (NOT_ACTIVE, INSUFFICIENT 등)
4. 변경 시도
5. 성공 시 이벤트 기록 + eventIdMap 등록

**원자성:**
- 실패한 시점에 즉시 반환, 상태 미변화
- split의 자식 여러 개도 모두 성공하거나 모두 실패

## 명령별 구현

### receive(eventId, input: {sampleId, containerId, custodianId, qty})
**전제:**
- qty: 1~1,000,000 (R1-5)
- sampleId: 새 ID (R1-4)
- containerId: Catalog에 있음, 지금 비어있음 (R1-1, R1-2)
- custodianId: Catalog에 있음 (R1-1)
- capacity ≥ qty (R1-3)

**효과:**
- 시작 시료 생성 (parentId=null, rootId=자기)
- 용기 점유
- 이벤트 기록

### split(eventId, parentId, children: {sampleId, containerId, qty}[])
**전제:**
- children.length ≥ 1 (R1-5)
- 각 child.qty: 1~1,000,000 (R1-5)
- 각 child.sampleId: 새 ID (R1-4)
- 각 child.containerId: Catalog에 있음, 모두 지금 비어있음, 서로 다름 (R5-3)
- 부모 ACTIVE (R4-1)
- 각 capacity ≥ qty (R1-3)
- sum(qty) ≤ 부모.available (R3-1, R2-3)

**효과:**
- 자식들 생성 (각각 rootId=부모.rootId, custodianId=부모.custodianId)
- 부모.remaining −= sum(qty)
- 부모 0이면 DEPLETED (R2-2, R4-2)
- 이벤트 기록

### reserve(eventId, input: {reservationId, sampleId, qty})
**전제:**
- qty: 1~1,000,000 (R1-5)
- reservationId: 새 ID (R1-4)
- sampleId 존재 (R1-1)
- 시료 ACTIVE (R4-1)
- qty ≤ available(시료) (R3-2)

**효과:**
- 예약 생성 (status=ACTIVE)
- 시료.reserved += qty
- 이벤트 기록

### cancel(eventId, reservationId)
**전제:**
- reservationId 존재 (R1-1)
- 예약 ACTIVE (R3-5)

**효과:**
- 예약.status = CANCELED
- 시료.reserved −= qty
- 이벤트 기록

### consume(eventId, reservationId)
**전제:**
- reservationId 존재 (R1-1)
- 예약 ACTIVE (R3-5)

**효과:**
- 예약.status = CONSUMED
- 시료.remaining −= qty
- 시료.reserved −= qty
- 시료.consumedQty += qty
- 시료 0이면 DEPLETED (R4-2)
- 이벤트 기록

### discard(eventId, sampleId)
**전제:**
- sampleId 존재 (R1-1)
- 시료 ACTIVE (R4-1)
- 시료의 ACTIVE 예약 없음 (R4-3)

**효과:**
- 시료.discardedQty += remaining
- 시료.remaining = 0
- 시료.status = DISCARDED (R4-3)
- 용기 비우기 (containerId=null)
- 이벤트 기록

### move(eventId, sampleId, targetContainerId)
**전제:**
- sampleId 존재 (R1-1)
- targetContainerId: Catalog에 있음 (R1-1)
- 시료 ACTIVE (R4-1, R6-3)
- targetContainerId 지금 비어있음, 지금 용기 제외 (R5-2, R5-3)
- capacity ≥ remaining (R5-2)

**효과:**
- 지금 용기 비우기 (currentSampleId=null)
- 시료.containerId = targetContainerId
- 새 용기 점유 (currentSampleId=sampleId)
- 이벤트 기록

### transferCustody(eventId, sampleId, custodianId)
**전제:**
- sampleId 존재 (R1-1)
- custodianId: Catalog에 있음 (R1-1)
- 시료 ACTIVE (R4-1, R6-3)

**효과:**
- 시료.custodianId = custodianId
- 이벤트 기록

## 이벤트·snapshot 전략

**EventView 형식:**
- args는 eventId 제외한 모든 인자를 객체로 복사
- receive·reserve: input 그대로
- split: { parentId, children: [{sampleId, containerId, qty}, ...] }
- cancel·consume: { reservationId }
- discard: { sampleId }
- move: { sampleId, targetContainerId }
- transferCustody: { sampleId, custodianId }

**snapshot():**
- samples: 모든 시료의 SampleView[]
- reservations: 모든 예약의 ReservationView[]
- events: 이벤트 이력 전체

## 재전송 로직(R7)

```typescript
if (eventIdMap.has(eventId)) {
  const receipt = eventIdMap.get(eventId)!
  const event = events[receipt.seq - 1]
  if (event.op === op && argsEqual(event.args, savedArgs)) {
    return { ok: true, value: receipt }
  } else {
    return { ok: false, code: "EVENT_CONFLICT" }
  }
}
```

**argsEqual:**
- 객체: 키 순서 무시, 값 재귀 비교
- 배열: 순서 구별
- 원시값: ===

## 불변식 검증(개발 중 체크)

- I1: rootId마다 sum(remaining + consumedQty + discardedQty) = 받은 양
- I2: ACTIVE 시료는 용기 1개, 용기 1개에 시료 최대 1개
- I3: remaining ≤ capacity, 0 ≤ reserved ≤ remaining
- I4: reserved = ACTIVE 예약 qty 합
- I5: DEPLETED·CONSUMED·CANCELED는 최종, 되살릴 수 없음
- I6: parentId·rootId 불변
- I7: seq 1~n 빈틈없음, 이벤트 수 = 성공한 새 명령 수
- I8: 실패 시 무변화
- I9: eventId 재전송 logic 참고
- I10: ID 재사용 불가 (ID_TAKEN check)
- I11: args는 복사본

## 구현 순서

1. State 초기화 및 헬퍼 (available 계산, args 복사, argsEqual 등)
2. receive → split → reserve
3. cancel → consume
4. discard
5. move → transferCustody
6. 이벤트 기록 및 재전송 로직
7. snapshot
