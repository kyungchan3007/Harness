# SDD — 연구실 시료 보관 엔진 (0040-lab)

## 아키텍처 개요

**인메모리 상태 머신:**
- 시료(Sample), 예약(Reservation), 이벤트(Event) 맵/배열
- 명령마다 원자적 검사·업데이트·기록
- eventId 중복 검사로 멱등성 보장

```
┌─────────────────────────────────────────┐
│          Lab State Container            │
├─────────────────────────────────────────┤
│ Map<sampleId, SampleState>              │
│ Map<reservationId, ReservationState>    │
│ Map<eventId, { args, Receipt }>         │
│ Array<EventView> (ordered history)      │
│ Map<containerId, { sampleId?, qty }>    │
│ seq: number                             │
└─────────────────────────────────────────┘
```

---

## 자료 구조

### 내부 Sample 상태
```typescript
interface SampleState {
  sampleId: ID
  parentId: ID | null
  rootId: ID
  remaining: Qty
  reserved: Qty  // ACTIVE 예약 합
  consumedQty: Qty
  discardedQty: Qty
  status: SampleStatus
  containerId: ID | null
  custodianId: ID
}
```

### 내부 Reservation 상태
```typescript
interface ReservationState {
  reservationId: ID
  sampleId: ID
  qty: Qty
  status: ReservationStatus
}
```

### 내부 Container 추적
```typescript
interface ContainerState {
  containerId: ID
  locationId: ID
  capacity: Qty
  occupant: ID | null  // sampleId or null
}
```

### 이벤트 중복 방지
```typescript
Map<eventId, {
  args: unknown  // 검사용 저장 인자
  receipt: Receipt  // 재반환용
}>
```

---

## 검사 단계 (모든 명령 공통)

```
1. 초기 검사 (이미 성공한 eventId인가?)
   ├─ YES: 저장된 Receipt 재반환, 상태 불변
   └─ NO: 다음 단계

2. 입력 유효성
   ├─ qty 범위 (1~1,000,000)
   ├─ 배열 비어있음 (split의 children)
   └─ 결과: INVALID_INPUT

3. 참조 존재 검사
   ├─ containerId → UNKNOWN_CONTAINER
   ├─ custodianId → UNKNOWN_CUSTODIAN
   ├─ sampleId → UNKNOWN_SAMPLE
   ├─ reservationId → UNKNOWN_RESERVATION
   └─ locationId (내부)

4. 상태 조건 검사
   ├─ ACTIVE 여부 (NOT_ACTIVE)
   ├─ 예약 닫힘 여부 (RESERVATION_CLOSED)
   ├─ 용기 점유 여부 (CONTAINER_OCCUPIED)
   └─ 나머지 규칙 (INSUFFICIENT, HAS_RESERVATION 등)

5. 모두 OK → 업데이트 & 이벤트 기록
   ├─ seq +1
   ├─ EventView 추가
   ├─ eventId 기록
   └─ Receipt 반환
```

---

## 명령별 알고리즘

### receive
```
입력: sampleId, containerId, custodianId, qty

1. ID 중복 검사 (sampleId, ACTIVE인 예약 불가)
   → ID_TAKEN
2. containerId, custodianId 참조
   → UNKNOWN_*
3. 용기 빔 & 용량 검사
   → CONTAINER_OCCUPIED, CAPACITY_EXCEEDED
4. 새 Sample 생성
   - status: ACTIVE, remaining: qty, reserved: 0
   - parentId: null, rootId: self
5. 용기에 배정, seq+1, 이벤트 기록
```

### split
```
입력: parentId, children: [{sampleId, containerId, qty}, ...]

1. 부모 존재 & ACTIVE 검사
   → UNKNOWN_SAMPLE, NOT_ACTIVE
2. 자식 배열 비움 검사
   → INVALID_INPUT
3. 각 자식:
   - 새 sampleId 중복 검사 (ID_TAKEN)
   - 새 containerId 참조 & 빔 & 용량 (CAPACITY_EXCEEDED)
   - qty 범위 (INVALID_INPUT)
   - 용기 중복 사용 & 부모 용기 (CONTAINER_OCCUPIED)
4. 이용 가능량 검사
   - sum(qty) ≤ 부모.available (NOT remaining - reserved)
   → INSUFFICIENT
5. 모두 OK → 원자적 업데이트
   - 각 자식 생성 (parentId=부모, rootId=부모.rootId, custodianId=부모.custodianId)
   - 부모.remaining -= sum(qty)
   - 부모 상태 업데이트 (0이면 DEPLETED)
   - seq+1, 이벤트 기록
```

### reserve
```
입력: reservationId, sampleId, qty

1. sampleId 존재 & ACTIVE 검사
   → UNKNOWN_SAMPLE, NOT_ACTIVE
2. reservationId 중복 검사
   → ID_TAKEN
3. qty 범위 검사
   → INVALID_INPUT
4. 이용 가능량 (remaining - reserved) 검사
   → INSUFFICIENT
5. 예약 생성, 시료.reserved += qty
   → seq+1, 이벤트 기록
```

### cancel
```
입력: reservationId

1. 예약 존재 검사
   → UNKNOWN_RESERVATION
2. ACTIVE 여부 검사
   → RESERVATION_CLOSED
3. 예약 상태: CANCELED, 시료.reserved -= qty
4. seq+1, 이벤트 기록
```

### consume
```
입력: reservationId

1. 예약 존재 & ACTIVE 검사
   → UNKNOWN_RESERVATION, RESERVATION_CLOSED
2. 시료 존재 검사 (예약은 항상 유효한 시료를 참조)
3. 양 전체 사용
   - 시료.remaining -= qty
   - 시료.reserved -= qty (예약도 정리)
   - 시료.consumedQty += qty
   - 예약.status = CONSUMED
4. 시료.remaining == 0 → DEPLETED
5. seq+1, 이벤트 기록
```

### discard
```
입력: sampleId

1. 시료 존재 & ACTIVE 검사
   → UNKNOWN_SAMPLE, NOT_ACTIVE
2. ACTIVE 예약 있는지 검사
   → HAS_RESERVATION
3. 폐기
   - 시료.status = DISCARDED
   - 시료.discardedQty += remaining
   - 시료.remaining = 0
   - 시료.containerId = null (용기 비움)
4. seq+1, 이벤트 기록
```

### move
```
입력: sampleId, targetContainerId

1. 시료 존재 & ACTIVE 검사
   → UNKNOWN_SAMPLE, NOT_ACTIVE
2. 목표 용기 참조 & 빔 검사
   → UNKNOWN_CONTAINER, CONTAINER_OCCUPIED
3. 목표 용기 용량 검사 (remaining 이상)
   → CAPACITY_EXCEEDED
4. 현재 용기와 목표 용기가 같은지 검사
   → CONTAINER_OCCUPIED
5. 이동
   - 현재 용기: occupant = null
   - 목표 용기: occupant = sampleId
   - 시료.containerId = targetContainerId
6. seq+1, 이벤트 기록
```

### transferCustody
```
입력: sampleId, custodianId

1. 시료 존재 & ACTIVE 검사
   → UNKNOWN_SAMPLE, NOT_ACTIVE
2. custodianId 참조 검사
   → UNKNOWN_CUSTODIAN
3. 책임자 변경
   - 시료.custodianId = custodianId
4. seq+1, 이벤트 기록
```

---

## 멱등성 구현 (eventId 기반)

```typescript
// 명령 시작 시
if (eventId in executedCommands) {
  const stored = executedCommands[eventId]
  if (argsEqual(stored.args, providedArgs)) {
    return stored.receipt  // 상태 불변
  } else {
    return { ok: false, code: "EVENT_CONFLICT" }
  }
}

// 명령 성공 시
executedCommands[eventId] = {
  args: providedArgs,
  receipt: { eventId, seq }
}
```

**argsEqual 규칙:**
- 객체: 키 순서 무시, 값 깊은 비교
- 배열: 순서 구별
- 프리미티브: === 비교

---

## 불변식 검사

모든 명령 후, 다음을 검사 (테스트·디버그용):

```
∀ sample ∈ root_samples:
  ∑(sample + descendants.remaining) 
  + ∑(consumedQty) 
  + ∑(discardedQty)
  == sample.initial_qty
```

---

- **접근:**
  - Catalog에서 유효한 객체만 참조 (참조 무결성)
  - 모든 상태 변화는 원자적 (all-or-nothing)
  - eventId로 멱등성 보장 (같은 호출 재실행 시 상태 불변)
  - 계보 추적(parentId, rootId)으로 분취 계보 관리
  - 수량 보존 불변식: 시작 수량 = ∑활성 + ∑소비 + ∑폐기

- **대안·트레이드오프:**
  - 저장소: 인메모리만 (scope 제외, 시간대/동시성 불필요)
  - 예약 모델: 양을 잡아두기만 (실제 소비는 별도 명령, 더 단순)
  - 컨테이너 추적: occupant=sampleId (시료→용기 역참조 불필요)
  - split 원자성: 자식 전부 또는 전무 (부모의 수량 보존 보장)

- **검증 계획:**
  - 타입 안정성: src/lab/types.ts 계약 준수 (고정)
  - 불변식: 모든 명령 후 수량 보존 검사
  - 멱등성: eventId 중복 호출 테스트
  - 규칙 준수: 8개 공개 예시 케이스 통과
  - 원자성: 실패 시 상태 완전 복원 확인

---

## 구현 순서

1. **기초**: Catalog 해석, 컨테이너 맵
2. **receive**: 첫 시료 생성
3. **snapshot**: 상태 조회 (디버그)
4. **split**: 계보 & 이용 가능량
5. **reserve/cancel**: 예약 상태 머신
6. **consume**: 수량 보존
7. **discard**: 상태 전이
8. **move**: 용기 관리
9. **transferCustody**: 책임자
10. **이벤트 멱등성**: 전체 명령에 eventId 검사 추가

---

## 에러 처리

**실패 시 롤백:**
- 모든 변경 전 검사 수행
- 검사 실패 → 상태 건드리지 않음
- 다자 업데이트(split)도 all-or-nothing

**성공한 eventId 재호출:**
- 첫 Receipt 재반환
- 상태 추가 변화 없음
