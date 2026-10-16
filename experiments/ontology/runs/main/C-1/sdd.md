# 0040 — 연구실 시료 보관 엔진 — SDD

## 설계
- **접근:** 메모리 내 불변 맵 기반 상태 관리. `Lab` 클래스가 samples/reservations/events/eventIdMap을 메서드마다 업데이트. 각 메서드는 **R7 이벤트 중복 검사**를 가장 먼저, **오류 발생 시 상태 불변** 보장. `EventView.args`는 받을 때 깊은 복사로 호출자 수정 방지. `split` 같은 다중 작업은 검사 후 원자적 실행 (중간 실패 시 롤백 불가 → 모두 성공하거나 모두 실패)
- **대안·트레이드오프:** Map 기반 상태 (vs. 배열): O(1) 조회로 R1 검증 효율 높음, 계보 탐색은 배열보다 느림 | 깊은 복사 args (vs. 얕은 복사): R8.2 호출자 수정 방지 명시적 보장, JSON 직렬화 오버헤드 | 먼저 모두 검사 후 실행 (vs. 온라인): R8.2 원자성 보장, 검사 결과 보관 메모리 필요 | eventIdMap 분리 (vs. 통합): R7 중복 검사 O(1)과 코드 명확성, 추가 맵 메모리
- **검증 계획:** 단위 테스트: R1 각 UNKNOWN_*/ID_TAKEN, R2 parentId/rootId/수량보존, R3 이용가능량, R4 상태전환/containerId null, R5 move 검증, R6 책임자 추적, R7 eventId 중복 시 Receipt 동일/상태불변, R8 실패 시 상태불변/seq 미증가 | 공개 예시: E1 예약+분취(remaining 50/reserved 40), E2 분취 완료 후 DEPLETED/containerId null, E3 move+transferCustody+consume 체인, E4 분취 실패 시 원자성, E5 eventId 중복 시 Receipt 동일 | 엣지 케이스: children 배열 순서 구별, eventId 인자 키 순서 무시, reserve 최대값 정확 계산

## 아키텍처
단일 `Lab` 인스턴스 (메모리 내 상태 관리, 메서드 호출마다 원자적 처리)

### 상태 (내부)
```typescript
samples: Map<sampleId, Sample>
  + sampleId, parentId, rootId, remaining, reserved
  + consumedQty, discardedQty, status, containerId, custodianId

reservations: Map<reservationId, Reservation>
  + reservationId, sampleId, qty, status

events: EventView[]
  + seq (1부터 시작)

eventIdMap: Map<eventId, { op, args, receipt }>
  + R7 이벤트 중복 검사용

catalog: Catalog (불변)
  + locationIds 검증용
  + custodianIds 검증용
  + containers (Map<containerId, { locationId, capacity }>) 검증용
  + containerStatus: Map<containerId, { occupied: bool, occupiedBy: sampleId }>
```

## 각 메서드 알고리즘

### receive(eventId, { sampleId, containerId, custodianId, qty })
**검사 순서:**
1. R7: eventId 중복 & 다른 인자 → EVENT_CONFLICT
2. R7: eventId 중복 & 같은 인자 → Receipt 반환
3. R5.5: qty 범위 1..1,000,000 → INVALID_INPUT
4. R1: sampleId 미사용 → ID_TAKEN
5. R1: containerId 존재 → UNKNOWN_CONTAINER
6. R1: custodianId 존재 → UNKNOWN_CUSTODIAN
7. R1, R5: containerId 빔 → CONTAINER_OCCUPIED
8. R3: qty ≤ containerId.capacity → CAPACITY_EXCEEDED

**실행:**
- Sample 생성: remaining=qty, reserved=0, consumedQty=0, discardedQty=0, status=ACTIVE, containerId, custodianId, parentId=null, rootId=sampleId
- EventView 기록, seq 증가
- Receipt 반환

### split(eventId, parentId, children: [{sampleId, containerId, qty}, ...])
**검사 순서:**
1. R7: eventId 중복 검사
2. R2: children 비어있음 → INVALID_INPUT
3. R1: parentId 존재 → UNKNOWN_SAMPLE
4. R4: parentId ACTIVE → NOT_ACTIVE
5. R2.1: 모든 children.sampleId 미사용, containerId 유효, qty 유효
   (병렬 검사 가능하지만 순서대로 처리해서 첫 오류 반환)
6. R5: 모든 children.containerId 빔 + parentId 용기 ≠ children 용기
7. R3, R2.3: 총 children.qty ≤ parent.remaining - parent.reserved (이용 가능량)
   → INSUFFICIENT

**실행 (원자적):**
- 모든 자식 Sample 생성: parentId=parent.id, rootId=parent.rootId, custodian=parent.custodian
- parent.remaining -= 총 children.qty
- parent.status = parent.remaining==0 ? DEPLETED : ACTIVE
- parent.status==DEPLETED → containerId=null
- EventView 기록, seq 증가

### reserve(eventId, { reservationId, sampleId, qty })
**검사 순서:**
1. R7: eventId 중복 검사
2. R5.5: qty 범위 1..1,000,000 → INVALID_INPUT
3. R1: reservationId 미사용 → ID_TAKEN
4. R1: sampleId 존재 → UNKNOWN_SAMPLE
5. R4: sampleId ACTIVE → NOT_ACTIVE
6. R3: qty ≤ sample.remaining - sample.reserved (이용 가능량) → INSUFFICIENT

**실행:**
- Reservation 생성: status=ACTIVE
- sample.reserved += qty
- EventView 기록

### cancel(eventId, reservationId)
**검사 순서:**
1. R7: eventId 중복
2. R1: reservationId 존재 → UNKNOWN_RESERVATION
3. R3.5: reservation.status==ACTIVE → RESERVATION_CLOSED

**실행:**
- reservation.status = CANCELED
- sample.reserved -= qty
- EventView 기록

### consume(eventId, reservationId)
**검사 순서:**
1. R7: eventId 중복
2. R1: reservationId 존재 → UNKNOWN_RESERVATION
3. R3.5: reservation.status==ACTIVE → RESERVATION_CLOSED

**실행:**
- qty = reservation.qty
- sample.remaining -= qty
- sample.reserved -= qty
- sample.consumedQty += qty
- sample.status = sample.remaining==0 ? DEPLETED : ACTIVE
- sample.status==DEPLETED → containerId=null
- reservation.status = CONSUMED
- EventView 기록

### discard(eventId, sampleId)
**검사 순서:**
1. R7: eventId 중복
2. R1: sampleId 존재 → UNKNOWN_SAMPLE
3. R4: sampleId ACTIVE → NOT_ACTIVE
4. R4.3: sample.reserved==0 → HAS_RESERVATION

**실행:**
- qty = sample.remaining
- sample.discardedQty += qty
- sample.remaining = 0
- sample.status = DISCARDED
- containerId = null
- EventView 기록

### move(eventId, sampleId, targetContainerId)
**검사 순서:**
1. R7: eventId 중복
2. R1: sampleId 존재 → UNKNOWN_SAMPLE
3. R4: sampleId ACTIVE → NOT_ACTIVE
4. R1: targetContainerId 존재 → UNKNOWN_CONTAINER
5. R5: targetContainerId ≠ sample.containerId → CONTAINER_OCCUPIED
6. R5.1: targetContainerId 용량 ≥ sample.remaining → CAPACITY_EXCEEDED

**실행:**
- 지금 담긴 용기 비우기 (containerStatus)
- sample.containerId = targetContainerId
- targetContainerId 차있음으로 표시

### transferCustody(eventId, sampleId, custodianId)
**검사 순서:**
1. R7: eventId 중복
2. R1: sampleId 존재 → UNKNOWN_SAMPLE
3. R4: sampleId ACTIVE → NOT_ACTIVE
4. R1: custodianId 존재 → UNKNOWN_CUSTODIAN

**실행:**
- sample.custodianId = custodianId
- EventView 기록

## 오류 검사 우선순위
모든 메서드에서:
1. **R7: 이벤트 중복** (가장 먼저, 상태 확인 전)
2. **기본 검증:** 범위, ID 존재 여부 (INVALID_INPUT, UNKNOWN_*, ID_TAKEN)
3. **참조 검증:** 상태, 관계 (NOT_ACTIVE, CONTAINER_OCCUPIED, etc.)
4. **양 검증:** 용량, 수량 보존 (CAPACITY_EXCEEDED, INSUFFICIENT, etc.)

## 핵심 불변식
- `sample.remaining + sample.reserved ≤ container.capacity` (R3, R5)
- `rootId 추적: 계보 그래프 DAG (부모 단일, 순환 불가)` (R2)
- `수량 보존: root.qty == Σ(samples.remaining + consumedQty + discardedQty)` (R2)
- `상태 전환: ACTIVE → {DEPLETED, DISCARDED} (일방향)` (R4)
- `eventId 재사용: 같은 receipt 반환, 상태 불변` (R7)

## 구현 고려사항
- **복사:** args는 받을 때 JSON.parse(JSON.stringify(args))로 깊은 복사
- **null 비교:** containerId가 null이면 용기 비워짐 (R4.5, R5.5)
- **배열 순서:** children 배열 순서 구별 (R7.3), eventId 반복 시 객체 키 순서 무시 (R7.3)
- **트랜잭션:** split 같은 다중 자식은 모두 성공하거나 모두 실패 (R8.2)
