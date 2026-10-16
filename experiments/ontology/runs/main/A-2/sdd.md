# SDD 0040 — 연구실 시료 보관 엔진 설계

- **접근:** 메모리 기반 이벤트 소싱으로 구현. 각 명령은 상태 변경 + 이벤트 기록. eventId → Receipt 매핑으로 멱등성. 모든 검증을 실행 전에 완료하고, 검증 실패 시 상태 변화 없음(원자성).

- **대안·트레이드오프:**
  - Option A(이벤트 리플레이) vs Option B(현재 상태만): A는 재계산·감사 추적 완벽이나 느림, B는 빠르고 간단 → **선택 B**(메모리 기반, 한 호출만)
  - 검증 순서: INVALID_INPUT → UNKNOWN_* → ID_TAKEN → CONTAINER_OCCUPIED → ... 순서로 일관되게 적용

- **검증 계획:**
  - 단위: 각 명령 성공/실패 경로(에러 코드별)
  - 통합: 명령 순서 상호작용(분취→예약→소비, 이동 중 예약 유지)
  - 멱등성: eventId 재시도 3회 → 첫 번째와 동일한 결과
  - 불변식: 모든 명령 후 "받은 양 = remaining 합 + consumed 합 + discarded 합" 검증
  - 용기: ACTIVE 시료는 containerId 유효, DEPLETED/DISCARDED는 null

## 아키텍처

메모리 기반 엔진으로, 다음 데이터 구조를 유지합니다:

```ts
// 내부 저장소
{
  samples: Map<sampleId, SampleRecord>,
  containers: Map<containerId, ContainerRecord>,
  reservations: Map<reservationId, ReservationRecord>,
  events: EventRecord[],
  eventIdToReceipt: Map<eventId, Receipt>,
  seq: number
}
```

### 1. SampleRecord (내부 표현)

```ts
{
  sampleId: ID
  parentId: ID | null
  rootId: ID
  remaining: Qty
  reserved: Qty  // ACTIVE 예약 양의 합
  consumedQty: Qty
  discardedQty: Qty
  status: SampleStatus
  containerId: ID | null
  custodianId: ID
}
```

### 2. ContainerRecord

```ts
{
  containerId: ID
  locationId: ID
  capacity: Qty
  sampleId: ID | null  // 담긴 시료, null이면 비어있음
}
```

### 3. ReservationRecord

```ts
{
  reservationId: ID
  sampleId: ID
  qty: Qty
  status: ReservationStatus
}
```

### 4. EventRecord

```ts
{
  seq: number
  eventId: ID
  op: string
  args: unknown  // 깊은 복사본
}
```

## 핵심 알고리즘

### 멱등성 처리 (R7)

**모든 명령 시작:**
1. eventId가 eventIdToReceipt에 있는가?
   - YES → 비교: 저장된 args와 현재 args가 같은가?
     - YES → 저장된 Receipt 반환
     - NO → `EVENT_CONFLICT` 반환
   - NO → 다음으로 진행

### 검증 공통 단계

**명령별로 진행 전:**
1. 모든 참조(sampleId, containerId, custodianId, reservationId)가 유효한가? → R1
2. ID 중복이 있는가? (새 ID가 기존 것과 겹치는가?) → R1 (ID_TAKEN)
3. 용기 용량/상태 조건? → R5
4. 시료 상태 조건? (ACTIVE vs DEPLETED/DISCARDED) → R4
5. 예약 상태 조건? → R3

**검증 실패** → 상태 변화 없이 `{ ok: false, code }` 반환

**검증 성공** → 상태 변경 및 이벤트 기록

### 명령별 구현

#### receive(eventId, { sampleId, containerId, custodianId, qty })

```
검증:
  - sampleId 미사용, qty 유효 (1~1M)
  - containerId/custodianId 존재
  - containerId 비어있음
  - qty ≤ 용기 용량

실행:
  - sample 생성: remaining=qty, reserved=0, parentId=null, rootId=자신, status=ACTIVE
  - container.sampleId = sampleId
  - 이벤트 기록: op="receive", args={sampleId, containerId, custodianId, qty}
  - seq++, Receipt 반환
```

#### split(eventId, parentId, children)

```
검증:
  - parentId 존재 & ACTIVE
  - children 배열 비지 않음
  - 각 child: sampleId 미사용, qty 유효, containerId 비어있고 다름
  - children 양의 합 ≤ parent의 이용 가능량
  - parent 용기는 차 있음 (부모의 containerId 제외)

실행 (원자성 - 모두 성공하거나 모두 실패):
  - 각 child별:
    - sample 생성: remaining=qty, reserved=0, parentId, rootId=parent.rootId
    - container.sampleId = childId
  - parent.remaining -= children 양의 합
  - parent의 남은 양이 0 → DEPLETED로 변경, containerId=null
  - 이벤트: op="split", args={parentId, children}
  - seq++

  부모가 DEPLETED되면 용기 비우기
```

#### reserve(eventId, { reservationId, sampleId, qty })

```
검증:
  - reservationId 미사용, qty 유효
  - sampleId 존재 & ACTIVE
  - qty ≤ 이용 가능량 (남은 양 - ACTIVE 예약 합)

실행:
  - reservation 생성: status=ACTIVE
  - sample.reserved += qty
  - 이벤트: op="reserve", args={reservationId, sampleId, qty}
  - seq++
```

#### cancel(eventId, reservationId)

```
검증:
  - reservationId 존재 & ACTIVE

실행:
  - reservation.status = CANCELED
  - sample.reserved -= qty
  - 이벤트: op="cancel", args={reservationId}
  - seq++
```

#### consume(eventId, reservationId)

```
검증:
  - reservationId 존재 & ACTIVE

실행:
  - sample.remaining -= qty
  - sample.reserved -= qty
  - sample.consumedQty += qty
  - sample의 남은 양이 0 → DEPLETED, containerId=null
  - reservation.status = CONSUMED
  - 이벤트: op="consume", args={reservationId}
  - seq++
```

#### discard(eventId, sampleId)

```
검증:
  - sampleId 존재 & ACTIVE
  - sample.reserved === 0 (ACTIVE 예약 없음)

실행:
  - sample.discardedQty += remaining
  - sample.remaining = 0
  - sample.status = DISCARDED
  - sample.containerId = null
  - 이벤트: op="discard", args={sampleId}
  - seq++
```

#### move(eventId, sampleId, targetContainerId)

```
검증:
  - sampleId 존재 & ACTIVE
  - targetContainerId 존재 & 비어있음
  - targetContainerId.capacity >= remaining
  - targetContainerId ≠ 현재 containerId (CONTAINER_OCCUPIED)

실행:
  - 현재 container.sampleId = null
  - target container.sampleId = sampleId
  - sample.containerId = targetContainerId
  - 이벤트: op="move", args={sampleId, targetContainerId}
  - seq++
```

#### transferCustody(eventId, sampleId, custodianId)

```
검증:
  - sampleId 존재 & ACTIVE
  - custodianId 존재

실행:
  - sample.custodianId = custodianId
  - 이벤트: op="transferCustody", args={sampleId, custodianId}
  - seq++
```

#### snapshot()

```
메모리 상태를 SampleView[], ReservationView[], EventView[]로 변환해서 반환
```

## 깊은 복사 (R8)

- 받은 인자 객체(receive의 input, split의 children)를 JSON 직렬화 후 역직렬화해서 저장
- 이렇게 하면 호출자가 나중에 인자를 수정해도 이력은 그대로 유지됨

## 에러 코드 우선순위

여러 규칙을 위반하면 어느 것을 반환해도 되지만, 구현 시 검증 순서를 일관되게 유지:

1. `INVALID_INPUT` (ID 유효성, 양 범위, 배열 비어있음)
2. `UNKNOWN_*` (존재성 검사)
3. `ID_TAKEN` (ID 중복)
4. `CONTAINER_OCCUPIED` (용기 상태)
5. `CAPACITY_EXCEEDED` (용량)
6. `NOT_ACTIVE` (시료/예약 상태)
7. `INSUFFICIENT` (수량 부족)
8. `HAS_RESERVATION` (폐기 조건)
9. `RESERVATION_CLOSED` (예약 상태)
10. `EVENT_CONFLICT` (멱등성)

## 테스트 전략

- **단위**: 각 명령 성공/실패 경로
- **통합**: 규칙 간 상호작용 (분취→예약→소비, 이동 중 예약 유지)
- **멱등성**: 같은 eventId 재시도 3회
- **계보**: split 후 자식들의 rootId, 부모의 DEPLETED 전환
- **수량 보존**: 모든 명령 후 이 식이 항상 성립: 받은 양 = remaining 합 + consumed 합 + discarded 합
- **용기**: ACTIVE 시료의 containerId가 항상 유효하고, DEPLETED/DISCARDED 시료의 containerId가 null
