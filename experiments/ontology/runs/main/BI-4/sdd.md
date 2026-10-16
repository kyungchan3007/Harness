# SDD 0040 — 연구실 시료 보관 엔진 설계

## 개요

- **접근:** 메모리 내 시료 관리 엔진으로, 8개의 명령(receive, split, reserve, cancel, consume, discard, move, transferCustody)을 각각 독립적으로 처리하되, 모든 규칙(R1~R8)과 불변식(I1~I11)을 만족해야 함. 상태 관리는 Map 기반 O(1) 검색, 멱등성은 eventId 캐시로 구현, 원자성은 사전 검증 + 실행으로 보장, 계보는 parentId·rootId로 추적.

- **대안·트레이드오프:**
  - Map 기반 상태 vs 배열 + O(n) 탐색 → 명령 수가 많아질수록 검색 성능 중요, Map 선택 (O(1))
  - 사전 검증 + 실행 vs 실행 후 롤백 → 원자성 보장 단순화, 사전 검증으로 실패 확정 후 상태 미변경 선택
  - eventId 캐시 vs 데이터베이스 기반 → 메모리 내 단일 호출이므로 캐시로 충분, 저장소 불필요 선택
  - 계보 불변 vs 부모 변경 허용 → 규칙 R2-2에서 명시적 불변, 수량 보존(I1) 검증 용이하도록 불변 선택
  - 깊은 복사 vs 얕은 복사 → args 저장 시 나중 변경 영향 없도록 깊은 복사 선택
  - 전체 상태 복사 vs 증분 변경 → 메모리 내 작은 규모이고 원자성 보장이 핵심이므로 전체 상태 관리 선택

- **검증 계획:**
  1. **단위 테스트** (src/lab/lab.test.ts): R1~R8 규칙별 테스트, I1~I4 불변식 검증
  2. **공개 예시 검증** (PRD 예시 5개): reserved 예약 반영, DEPLETED 전환, 책임자 변경, 원자성, 멱등성

---

## 1. 아키텍처 개요

```
Lab (퍼블릭 인터페이스)
  ├─ State (메모리 상태 관리)
  │  ├─ samples: Map<sampleId, Sample>
  │  ├─ reservations: Map<reservationId, Reservation>
  │  ├─ containers: Map<containerId, Container>  (카탈로그)
  │  ├─ custodians: Set<custodianId>  (카탈로그)
  │  ├─ eventLog: Event[]  (seq 추적)
  │  └─ eventCache: Map<eventId, (Receipt | ErrorCode)>  (멱등성 캐시)
  │
  └─ Command Handlers (각 메서드)
     └─ Validation → Execution → Logging
```

## 2. 핵심 데이터 구조

### Sample (내부)
```typescript
{
  sampleId: ID;
  parentId: ID | null;    // R2-2
  rootId: ID;             // R2-1, 불변
  remaining: Qty;         // R1-3, R3-4, R4-2
  reserved: Qty;          // R3-1, 계산됨 (ACTIVE 예약 합)
  consumedQty: Qty;       // R3-4, R4-2, I1
  discardedQty: Qty;      // R4-3, I1
  status: SampleStatus;   // R2-2, R4-1, R4-4
  containerId: ID | null; // R1-2, R4-5
  custodianId: ID;        // R1-1, R6
}
```

### Reservation (내부)
```typescript
{
  reservationId: ID;
  sampleId: ID;           // R3-1
  qty: Qty;               // R3-4
  status: ReservationStatus;
}
```

### Container (카탈로그, 불변)
```typescript
{
  containerId: ID;
  locationId: ID;         // R5-1
  capacity: Qty;          // R1-3
  occupiedBySampleId: ID | null;  // R1-2 추적용
}
```

## 3. 명령별 검증 및 실행 로직

### 3.1 receive
**검증:**
- qty ∈ [1, 1M] (R1-5)
- sampleId 새것 (R1-4, ID_TAKEN)
- containerId 존재 (R1-1, UNKNOWN_CONTAINER)
- custodianId 존재 (R1-1, UNKNOWN_CUSTODIAN)
- 용기 비어 있음 (R1-2, CONTAINER_OCCUPIED)
- qty ≤ 용기 용량 (R1-3, CAPACITY_EXCEEDED)

**실행:**
1. Sample 생성: parentId=null, rootId=자신, status=ACTIVE
2. 용기 점유
3. seq 증가, 이벤트 기록

---

### 3.2 split
**검증:**
- children.length ≥ 1 (R1-5, INVALID_INPUT)
- 각 자식 qty ∈ [1, 1M]
- 부모 ACTIVE (R2-2, NOT_ACTIVE)
- 각 자식 sampleId 새것
- 각 자식 containerId 존재하고 비어 있음 (R1-2)
- 자식 용기끼리 중복 없음 (R5-3, CONTAINER_OCCUPIED)
- 부모가 담긴 용기 ≠ 자식 용기들
- Σ(자식 qty) ≤ 부모 **available** (R2-3, R3-1, INSUFFICIENT)
- 각 자식 qty ≤ 해당 용기 용량 (R1-3, CAPACITY_EXCEEDED)

**실행 (원자적 R8-2):**
1. 모든 자식 생성 (parentId=부모, rootId=부모의 rootId)
2. 각 자식을 용기에 점유
3. 부모 remaining -= Σ(자식 qty)
4. 부모 remaining=0 이면 DEPLETED 및 용기 비움 (R4-2, R4-5)
5. seq 증가, 이벤트 기록

---

### 3.3 reserve
**검증:**
- qty ∈ [1, 1M]
- reservationId 새것 (ID_TAKEN)
- 시료 존재 (UNKNOWN_SAMPLE)
- 시료 ACTIVE (R3-2, NOT_ACTIVE)
- qty ≤ 시료 **available** (R3-2, INSUFFICIENT)

**실행:**
1. Reservation 생성: status=ACTIVE
2. seq 증가, 이벤트 기록

---

### 3.4 cancel
**검증:**
- 예약 존재 (UNKNOWN_RESERVATION)
- 예약 ACTIVE (R3-3, RESERVATION_CLOSED)

**실행:**
1. 예약 status = CANCELED
2. (reserved는 다음 조회 시 다시 계산)
3. seq 증가, 이벤트 기록

---

### 3.5 consume
**검증:**
- 예약 존재 (UNKNOWN_RESERVATION)
- 예약 ACTIVE (R3-4, RESERVATION_CLOSED)
- 시료 존재 및 ACTIVE (NOT_ACTIVE)

**실행:**
1. qty = 예약의 qty (전체를 써야 함 R3-4)
2. 시료 remaining -= qty
3. 시료 reserved -= qty (ACTIVE 예약만이므로 예약 상태로 업데이트)
4. 시료 consumedQty += qty (R3-4, I1)
5. remaining=0 이면 DEPLETED 및 용기 비움 (R4-2, R4-5)
6. 예약 status = CONSUMED (R3-4)
7. seq 증가, 이벤트 기록

---

### 3.6 discard
**검증:**
- 시료 존재 (UNKNOWN_SAMPLE)
- 시료 ACTIVE (R4-4, NOT_ACTIVE)
- ACTIVE 예약 없음 (R4-3, HAS_RESERVATION)

**실행:**
1. qty = 시료 remaining
2. 시료 discardedQty += qty (R4-3, I1)
3. 시료 remaining = 0
4. 시료 status = DISCARDED (R4-3)
5. 용기 비움 (R4-5)
6. seq 증가, 이벤트 기록

---

### 3.7 move
**검증:**
- 시료 존재 및 ACTIVE (NOT_ACTIVE)
- 목표 용기 존재 (UNKNOWN_CONTAINER)
- 목표 용기 비어 있음 (R5-2, CONTAINER_OCCUPIED)
- 목표 용기 ≠ 현재 용기 (R5-2, CONTAINER_OCCUPIED)
- remaining ≤ 목표 용기 용량 (CAPACITY_EXCEEDED)

**실행:**
1. 현재 용기 비움
2. 시료 containerId = 목표 용기
3. 목표 용기 점유
4. (양·예약·계보·책임자 불변 R5-4)
5. seq 증가, 이벤트 기록

---

### 3.8 transferCustody
**검증:**
- 시료 존재 및 ACTIVE (NOT_ACTIVE)
- 책임자 존재 (UNKNOWN_CUSTODIAN)

**실행:**
1. 시료 custodianId = 책임자
2. (예약 중이어도 가능 R6-2, R6-3)
3. seq 증가, 이벤트 기록

---

## 4. 교차 명령 불변식 검증

### I1: 수량 보존 (계보별)
```
∀ rootId: 
  Σ(remaining + consumedQty + discardedQty for all samples in lineage) 
  = received_qty
```
**검증 시점:** receive 후 / split 후 / consume 후 / discard 후

### I2: 용기 점유 (R1-2, R4-5)
```
ACTIVE 시료 ∈ [0, 1] per 용기
끝난 시료 → containerId = null
```

### I4: reserved 계산 (R3-1)
```
reserved = Σ(qty for all ACTIVE reservations)
```

---

## 5. 멱등성 구현 (R7)

**eventCache:** Map<eventId, Receipt | ErrorCode>

**요청 처리 흐름:**
1. eventCache에 eventId 조회
   - 있고 성공 → Receipt 반환, 상태 불변
   - 있고 실패 → ErrorCode 반환, 재시도는 새 요청으로 처리
   - 없음 → 2번으로
2. 같은 명령인지 확인 (op+args 비교)
   - 이전에 성공한 eventId와 다르면서 명령이 다르면 → EVENT_CONFLICT
3. 검증 수행
4. 실패 시 → eventCache에 기록 안 함, 상태 불변
5. 성공 시 → eventCache에 Receipt 저장, 상태 변경

**args 비교 (R7-3, R8-3):**
- 객체: 키 순서 무시, 값 비교
- 배열: 순서 구별
- 시간 값: 문자열/숫자 정확 비교
- 깊은 복사: args 저장 시 JSON 직렬화/역직렬화 또는 리커시브 복사

---

## 6. snapshot() 구현

```typescript
snapshot(): Snapshot {
  return {
    samples: Array.from(samples.values()).map(toView),
    reservations: Array.from(reservations.values()).map(toView),
    events: eventLog,
  };
}
```

---

## 7. 오류 처리

모든 ErrorCode는 검증 단계에서 조기 반환 (R8-2, R8-3).

| ErrorCode | 트리거 |
| --- | --- |
| INVALID_INPUT | qty 범위 / 입력 배열 공백 |
| UNKNOWN_SAMPLE | 시료 없음 |
| UNKNOWN_RESERVATION | 예약 없음 |
| UNKNOWN_CONTAINER | 용기 없음 |
| UNKNOWN_CUSTODIAN | 책임자 없음 |
| ID_TAKEN | sampleId / reservationId 재사용 |
| CONTAINER_OCCUPIED | 용기 비어있지 않음 / 중복 |
| CAPACITY_EXCEEDED | remaining > capacity |
| INSUFFICIENT | available 부족 (예약 반영) |
| NOT_ACTIVE | 끝난 시료/예약 |
| RESERVATION_CLOSED | 닫힌 예약 재작업 |
| HAS_RESERVATION | discard 중 ACTIVE 예약 있음 |
| EVENT_CONFLICT | eventId 재사용, 다른 op·args |

---

## 8. 구현 체크리스트

- [ ] State 초기화 (catalog 저장)
- [ ] 8개 명령 + snapshot() 메서드
- [ ] eventCache 멱등성 로직
- [ ] reserved 계산 (ACTIVE 예약 합)
- [ ] available 계산 (remaining - reserved)
- [ ] 상태 전환 (ACTIVE → DEPLETED/DISCARDED)
- [ ] 용기 점유/비움 관리
- [ ] I1·I2·I4 검증 (테스트에서)
- [ ] args 깊은 복사 + 비교
- [ ] 단위 테스트 (src/lab/lab.test.ts)
