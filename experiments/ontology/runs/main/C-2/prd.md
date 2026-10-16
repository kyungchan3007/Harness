# 0040: 연구실 시료 보관 엔진 — 요구사항 정의 (PRD)

## 이슈
- **이슈:** #40

## 문제

연구실에서 시료를 받아들이고, 분취하고, 예약·소비·폐기하며, 용기 간 이동과 책임자 관리를 해야 합니다.
이때 시료의 계보 관계, 양의 보존, 용기 용량, ACTIVE 상태 유지, 이벤트 멱등성, 원자성이 모두 보장되어야 합니다.

## 목표

`createLab(catalog: Catalog): Lab` 함수가 반환하는 Lab 인스턴스가 다음을 구현:
- 8개 명령(receive, split, reserve, cancel, consume, discard, move, transferCustody)
- 규칙 8개(R1~R8) 완벽한 준수
- 모든 실패 케이스에서 원자성 보장 (롤백 없음, 아예 상태 변경 불가)
- 멱등성: 성공한 eventId 재시도 시 같은 Receipt 반환, 상태 변경 없음

## 비목표

- 시료의 장소를 따로 저장하지 않음 (용기의 장소로 대체)
- 캐시·인덱싱·성능 최적화 (명확한 상태 유지 우선)
- 트랜잭션·데이터베이스 연동

## 애매한 곳·가정

- 없음 — 규칙 8개(R1~R8)와 예시 5개가 명확하게 정의됨. 요청 문에 모두 명시됨

---

## 도메인 규칙

### 규칙 1: 참조 · 수용 (R1)

목록(catalog)에 없는 것은 쓸 수 없음.

#### R1.1 유효성 검사
- **시료 ID**: 신규라면 아직 없어야 함 (ID_TAKEN), 참조라면 있어야 함 (UNKNOWN_SAMPLE)
- **예약 ID**: 신규라면 아직 없어야 함 (ID_TAKEN), 참조라면 있어야 함 (UNKNOWN_RESERVATION)
- **용기 ID**: Catalog의 containers에 있어야 함 (UNKNOWN_CONTAINER)
- **책임자 ID**: Catalog의 custodianIds에 있어야 함 (UNKNOWN_CUSTODIAN)
- **장소 ID**: 용기가 참조하는 곳에만 있음 (따로 검사 불필요)

#### R1.2 양 검증
- 양(qty)은 1 이상 1,000,000 이하 정수 → INVALID_INPUT
- split의 children 목록이 비어 있음 → INVALID_INPUT

#### R1.3 용기 점유
- ACTIVE 시료는 반드시 용기 하나에만 담겨 있음 (containerId != null)
- 한 용기에는 최대 1개 ACTIVE 시료만 가능 → CONTAINER_OCCUPIED
- DEPLETED/DISCARDED 시료는 용기를 비움 (containerId = null)

#### R1.4 용기 용량
- 시료의 remaining ≤ 용기의 capacity → CAPACITY_EXCEEDED

### 규칙 2: 계보 · 수량 보존 (R2)

부모-자식 관계는 고정, 양의 합은 보존.

#### R2.1 계보 시작
- `receive`만이 계보의 시작 시료를 만듦
- 받아들인 시료: parentId = null, rootId = 자신
- 분취 시료: parentId = 부모 ID, rootId = 부모의 rootId
- 부모-자식 관계는 후속 명령으로 바뀌지 않음

#### R2.2 분취의 양 유지
- `split`의 자식 양 합 ≤ 부모의 이용 가능량 → INSUFFICIENT
  - 이용 가능량 = remaining − reserved (ACTIVE 예약 합)
- 분취 후 부모의 remaining이 0이면 부모는 DEPLETED
- 자식들의 remaining 합 + 부모의 remaining = 분취 전 부모의 remaining (분취는 소비 아님)

#### R2.3 계보 전체의 수량 보존
```
received_qty = sum(all remaining) + sum(all consumedQty) + sum(all discardedQty)
```
(단일 계보, 즉 같은 rootId 시료들에 대해서)

#### R2.4 분취 원자성
- split 중 자식 용기 할당이 실패하면 아무 자식도 생성하지 않음 (R8)

### 규칙 3: 예약 · 소비 (R3)

ACTIVE 예약은 이용 가능량을 선점, consume은 전량 사용.

#### R3.1 이용 가능량
```
available = remaining − sum(reserved ACTIVE reservations)
```

#### R3.2 예약의 제약
- reserve 시 available ≥ qty → INSUFFICIENT
- NOT_ACTIVE 시료에 reserve → NOT_ACTIVE
- reserved는 remaining을 **줄이지 않음** (이용 가능량만 감소)

#### R3.3 예약 취소
- `cancel`: ACTIVE 예약을 CANCELED로, reserved 감소
- 실제 remaining은 변하지 않음

#### R3.4 소비
- `consume`: ACTIVE 예약을 CONSUMED로
  - remaining을 예약 qty만큼 감소
  - reserved를 예약 qty만큼 감소
  - consumedQty를 예약 qty만큼 증가
  - 일부 소비 불가능 (전부 또는 무)

#### R3.5 종료된 예약
- CANCELED 또는 CONSUMED 예약에 cancel/consume → RESERVATION_CLOSED

### 규칙 4: 상태 · 폐기 (R4)

시료는 ACTIVE → DEPLETED 또는 DISCARDED로 진행.

#### R4.1 상태 전이
- **ACTIVE**: 처음 상태, 분취·예약·소비·이동·폐기 가능
- **DEPLETED**: remaining = 0이 되면 (분취나 consume으로)
  - 역방향 불가능
  - containerId = null (용기 반환)
- **DISCARDED**: discard 명령으로
  - 역방향 불가능
  - containerId = null (용기 반환)

#### R4.2 폐기의 제약
- `discard`: ACTIVE이고 예약이 없는(sum(reserved for ACTIVE) = 0) 시료만
  - remaining을 discardedQty에 더함
  - remaining = 0, status = DISCARDED
  - ACTIVE 예약이 있으면 HAS_RESERVATION

#### R4.3 종료된 시료
- DEPLETED/DISCARDED 시료에 대해 split·reserve·discard·move·transferCustody → NOT_ACTIVE

#### R4.4 부모-자식 독립성
- 부모가 종료되어도 자식에게 영향 없음
- 자식 status와 부모 status는 독립

### 규칙 5: 용기 · 장소 (R5)

시료의 장소는 용기의 장소, 용기는 명령 시작 시점에 평가.

#### R5.1 장소 저장
- 시료의 location은 따로 저장하지 않음
- 실시간 location = 담긴 용기의 locationId

#### R5.2 이동
- `move`: sampleId를 targetContainerId로 이동
  - targetContainerId는 비어 있어야 함 (다른 시료 없음) → CONTAINER_OCCUPIED
  - targetContainerId의 capacity ≥ remaining → CAPACITY_EXCEEDED
  - 현재 용기로 이동하려 하면 → CONTAINER_OCCUPIED
- move는 remaining·reserved·parentId·rootId·custodianId를 바꾸지 않음
- ACTIVE 예약이 있어도 이동 가능

#### R5.3 분취 시 용기 할당
- split의 각 child마다 그 containerId 미리 지정
- 모든 child의 containerId는 다름 (같은 용기 2회 사용 불가) → CONTAINER_OCCUPIED
- 각 child의 containerId는 비어 있어야 함 → CONTAINER_OCCUPIED
- 부모의 현재 용기도 포함 (부모 용기는 차 있는 것으로 취급) → CONTAINER_OCCUPIED

#### R5.4 명령 시점
- "명령 시작 시점에" 비어 있음을 평가 (검사만 함, 사전 예약 없음)

### 규칙 6: 보관 책임 (R6)

책임자는 receive에서 정하고, transferCustody로 변경.

#### R6.1 책임 상속
- `receive`할 때 custodianId를 정함
- `split`의 자식: 그 순간 부모의 custodianId를 이어받음 (부모의 현재 책임자)

#### R6.2 책임 변경
- `transferCustody`: 한 시료의 custodianId만 변경
  - 부모·자식에게 번지지 않음 (각각 독립)
  - ACTIVE 예약이 있어도 변경 가능

#### R6.3 종료된 시료
- DEPLETED/DISCARDED 시료에 transferCustody → NOT_ACTIVE

### 규칙 7: 멱등성 (R7)

같은 eventId로 같은 명령을 재시도하면 부작용 없음.

#### R7.1 성공한 명령의 재시도
- 같은 eventId + 같은 op + 같은 args → 처음 Receipt(eventId, seq) 그대로 반환
- 상태·이력 변경 없음
- "지금 상태로는 실패할 명령이어도 마찬가지"
  - 즉, 이 재시도 판단을 다른 모든 검사(R1~R6)보다 **먼저** 함

#### R7.2 다른 명령·인자로 같은 eventId
- 다른 op 또는 다른 args → EVENT_CONFLICT

#### R7.3 인자 비교
- 객체의 키 순서는 무시 ({"a": 1, "b": 2} = {"b": 2, "a": 1})
- 배열 순서는 구별 ([1, 2] ≠ [2, 1])
- split의 children 배열: 순서 의미 있음

#### R7.4 실패한 명령의 eventId
- 실패한 eventId는 기록되지 않음
- 같은 eventId로 재시도 가능
- 성공 후 처음 Receipt 반환

### 규칙 8: 원자성 · 이력 (R8)

성공하면 이력을 남기고, 실패하면 상태 무변화.

#### R8.1 이벤트 로깅
- 성공한 새 명령마다 EventView 생성
  - seq: 이전 seq + 1 (처음은 1)
  - eventId: 호출 inbound eventId
  - op: 명령 이름 (receive, split, ...)
  - args: 입력 인자의 사본 (eventId 제외)
    - receive·reserve: input 그대로
    - split: { parentId, children }
    - cancel·consume: { reservationId }
    - discard: { sampleId }
    - move: { sampleId, targetContainerId }
    - transferCustody: { sampleId, custodianId }

#### R8.2 실패의 격리
- 실패 시 다음 중 어느것도 바뀌지 않음
  - 시료의 remaining, status, reserved, consumedQty, discardedQty
  - 시료의 parentId, rootId, containerId, custodianId
  - 예약의 status, qty
  - 용기의 점유 상태
  - 이력 (events 배열)
  - 성공한 seq 기록

#### R8.3 분취의 원자성
- split으로 여러 자식을 나누는 경우, 모두 성공하거나 모두 실패
- 첫째 자식 생성 후 둘째 자식 용기 검증 실패 → 첫째도 없음, 부모 상태도 원래대로

#### R8.4 인자 복사
- 이력 저장 시 입력 객체를 즉시 복사
- 호출한 쪽이 나중에 객체를 수정해도 이력은 변하지 않음
  - `children` 배열 수정 불가 (복사해 저장)

---

## Acceptance

### A0. 명령 8개 + 규칙 8개 + 예시 5개 통과
- [x] receive, split, reserve, cancel, consume, discard, move, transferCustody 모두 구현
- [x] R1~R8 규칙 모두 준수 확인 (테스트)
- [x] 예시 1~5 모두 통과

### A1. 8개 명령 구현

각 명령이 다음 을 구현:

1. **receive(eventId, input)**: 신규 시료 수용
   - input: { sampleId, containerId, custodianId, qty }
   - 성공: Receipt { eventId, seq=1 (if first) }
   - 실패 케이스: INVALID_INPUT, ID_TAKEN, UNKNOWN_CONTAINER, UNKNOWN_CUSTODIAN, CAPACITY_EXCEEDED

2. **split(eventId, parentId, children)**: 분취
   - children: [{ sampleId, containerId, qty }, ...]
   - 성공: Receipt { eventId, seq++ }
   - 실패 케이스: INVALID_INPUT, UNKNOWN_SAMPLE, NOT_ACTIVE, INSUFFICIENT, CONTAINER_OCCUPIED, CAPACITY_EXCEEDED, ID_TAKEN

3. **reserve(eventId, input)**: 예약
   - input: { reservationId, sampleId, qty }
   - 성공: Receipt { eventId, seq++ }
   - 실패 케이스: INVALID_INPUT, ID_TAKEN, UNKNOWN_SAMPLE, UNKNOWN_RESERVATION, NOT_ACTIVE, INSUFFICIENT

4. **cancel(eventId, reservationId)**: 예약 취소
   - 성공: Receipt { eventId, seq++ }
   - 실패 케이스: UNKNOWN_RESERVATION, RESERVATION_CLOSED

5. **consume(eventId, reservationId)**: 소비
   - 성공: Receipt { eventId, seq++ }
   - 실패 케이스: UNKNOWN_RESERVATION, RESERVATION_CLOSED

6. **discard(eventId, sampleId)**: 폐기
   - 성공: Receipt { eventId, seq++ }
   - 실패 케이스: UNKNOWN_SAMPLE, NOT_ACTIVE, HAS_RESERVATION

7. **move(eventId, sampleId, targetContainerId)**: 이동
   - 성공: Receipt { eventId, seq++ }
   - 실패 케이스: UNKNOWN_SAMPLE, UNKNOWN_CONTAINER, NOT_ACTIVE, CONTAINER_OCCUPIED, CAPACITY_EXCEEDED

8. **transferCustody(eventId, sampleId, custodianId)**: 책임자 변경
   - 성공: Receipt { eventId, seq++ }
   - 실패 케이스: UNKNOWN_SAMPLE, UNKNOWN_CUSTODIAN, NOT_ACTIVE

### A2. 멱등성 (R7)

- ✓ 성공한 eventId + 같은 명령·인자 → 같은 seq 반환, 상태 불변
- ✓ 성공한 eventId + 다른 명령/인자 → EVENT_CONFLICT
- ✓ 실패한 eventId → 재시도 가능 (다시 검증)
- ✓ 객체 키 순서 무시, 배열 순서 구별

### A3. 원자성 (R8)

- ✓ 실패 시 상태 완전 복원 (seq 변경, 이력 기록 없음)
- ✓ split 중 자식 용기 실패 → 모든 자식 미생성
- ✓ 이력은 명령 순서 보존, 나중 수정 불가능 (복사 저장)

### A4. 규칙 준수 확인

각 규칙이 테스트로 검증:

| 규칙 | 검증 항목 |
|------|---------|
| R1 | ID 유일성, 참조 유효성, 용기 점유, 용량 제약 |
| R2 | 계보 고정, 양의 합 보존 (분취), 계보 전체 보존 |
| R3 | 이용 가능량 계산, 예약의 여유 선점, 소비의 전량 사용 |
| R4 | 상태 전이(ACTIVE→DEPLETED/DISCARDED), 폐기 제약 |
| R5 | 용기 장소 실시간, 이동 용량 검증, 분취 용기 할당 |
| R6 | 책임 상속, 책임 변경 독립성 |
| R7 | 멱등성 판정, 인자 비교, 실패 eventId 재시도 |
| R8 | 이벤트 로깅, 실패 격리, split 원자성, 인자 복사 |

### A5. snapshot() 동작

- ✓ 현재 모든 시료 (SampleView[])
- ✓ 현재 모든 예약 (ReservationView[])
- ✓ 이벤트 이력 (EventView[])

---

## 에러 코드 매트릭스

아래 표는 각 명령과 위반 규칙이 만나는 부분에서 어떤 에러 코드가 나오는지를 보여줍니다.

| 에러 코드 | 규칙 | 설명 |
|----------|------|------|
| INVALID_INPUT | R1.2 | qty가 범위 밖 또는 배열 비어 있음 |
| ID_TAKEN | R1.4 | 신규 ID(sampleId, reservationId)가 이미 사용됨 |
| UNKNOWN_SAMPLE | R1.1 | 참조하려는 sampleId가 없음 |
| UNKNOWN_RESERVATION | R1.1 | 참조하려는 reservationId가 없음 |
| UNKNOWN_CONTAINER | R1.1 | 참조하려는 containerId가 Catalog에 없음 |
| UNKNOWN_CUSTODIAN | R1.1 | 참조하려는 custodianId가 Catalog에 없음 |
| CONTAINER_OCCUPIED | R1.3, R5.2, R5.3 | 용기가 이미 ACTIVE 시료를 가지고 있음 |
| CAPACITY_EXCEEDED | R1.4, R5.2 | remaining이 용기 용량을 초과 |
| INSUFFICIENT | R2.2, R3.2 | 분취/예약 양이 이용 가능량 초과 |
| NOT_ACTIVE | R3.2, R4.3, R6.3 | DEPLETED/DISCARDED 시료에 대한 명령 |
| RESERVATION_CLOSED | R3.5 | 이미 CONSUMED/CANCELED 예약에 cancel/consume 재시도 |
| HAS_RESERVATION | R4.2 | discard할 시료에 ACTIVE 예약이 있음 |
| EVENT_CONFLICT | R7.2 | 같은 eventId로 다른 명령/인자 시도 |

### 명령별 가능한 에러

| 명령 | 가능한 에러 |
|------|----------|
| receive | INVALID_INPUT, ID_TAKEN, UNKNOWN_CONTAINER, UNKNOWN_CUSTODIAN, CAPACITY_EXCEEDED |
| split | INVALID_INPUT, UNKNOWN_SAMPLE, NOT_ACTIVE, INSUFFICIENT, CONTAINER_OCCUPIED, CAPACITY_EXCEEDED, ID_TAKEN |
| reserve | INVALID_INPUT, ID_TAKEN, UNKNOWN_SAMPLE, NOT_ACTIVE, INSUFFICIENT |
| cancel | UNKNOWN_RESERVATION, RESERVATION_CLOSED |
| consume | UNKNOWN_RESERVATION, RESERVATION_CLOSED |
| discard | UNKNOWN_SAMPLE, NOT_ACTIVE, HAS_RESERVATION |
| move | UNKNOWN_SAMPLE, UNKNOWN_CONTAINER, NOT_ACTIVE, CONTAINER_OCCUPIED, CAPACITY_EXCEEDED |
| transferCustody | UNKNOWN_SAMPLE, UNKNOWN_CUSTODIAN, NOT_ACTIVE |

---

## 예시 분석

### 예시 1: 기본 예약·분취

```
시나리오: S1 100 받음 → S1에 40 예약 → S1에서 S2로 50 분취
결과: S1 남은 양 50·reserved 40(이용 가능량 10), S2 50
```

- **R1**: S1, S2, R1, U1 모두 유효 ID
- **R2**: S1이 root, S2는 S1의 자식. 받은 양 100 = S1(50) + S2(50)
- **R3**: S1 예약 40, 이용 가능량 = 50 − 40 = 10 (맞음)
- **R5**: S1, S2의 용기는 다르고 용량 충분
- **R8**: 3개 이벤트 남음 (receive, reserve, split)

### 예시 2: 분취로 바닥남

```
시나리오: S1 100 받음 → S2 60, S3 40으로 분취
결과: S1은 DEPLETED·용기 비움, S2·S3은 계속 쓸 수 있음
```

- **R4**: S1의 remaining = 0 → DEPLETED, containerId = null
- **R4.4**: S2, S3은 ACTIVE 유지 (부모 상태가 자식에 영향 없음)
- **R2.3**: 받은 양 100 = S1(0) + S2(60) + S3(40), 소비 없음

### 예시 3: 이동·책임자 변경·소비

```
시나리오: S1 받음 → 예약 R1 → 다른 장소 용기로 move → U2로 transferCustody → R1 consume
결과: 모두 성공, 책임자 U2
```

- **R5.2**: move는 예약 상태를 변경하지 않음 (R1은 그대로 ACTIVE)
- **R6**: transferCustody는 한 시료만 변경 (부모/자식 미영향)
- **R3.4**: consume 후 S1의 remaining·reserved 감소, consumedQty 증가

### 예시 4: 분취 원자성 실패

```
시나리오: S1 100 받음 → 자식 두 개(30은 빈 용기, 둘째 20은 차 있는 용기)로 분취
결과: 실패, 아무것도 바뀌지 않음(첫째 자식도 없음)
```

- **R5.3**: 둘째 용기가 차 있음 → CONTAINER_OCCUPIED
- **R8.3**: split 원자성: 첫째 자식 할당 검증 성공, 둘째 용기 검증 실패 → 첫째 자식도 생성 불가
- **R8.2**: S1 상태 원래대로 (remaining = 100, status = ACTIVE)

### 예시 5: idempotency

```
시나리오: consume 성공 뒤 같은 eventId·같은 인자로 다시 consume
결과: 처음 Receipt를 그대로, 두 번 쓰지 않음
```

- **R7.1**: 성공한 eventId + 같은 명령·인자 → 처음 seq 반환
- **R3.4**: remaining·reserved·consumedQty 변경 없음
- **R8.1**: 새 이벤트 생성 안 함, seq 증가 안 함
