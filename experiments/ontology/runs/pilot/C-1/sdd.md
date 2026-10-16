# 0040-lab — 실험실 시료 보관 엔진 SDD

- **접근:**
  - 메모리 기반 상태 관리: 모든 데이터를 Map으로 보관
  - 멱등성: eventIdMap으로 이미 성공한 명령 캐시
  - 원자성: 검증 후 상태 변경 (모두 성공하거나 모두 실패)
  - 계보 추적: parentId/rootId로 분취 계보 기록

- **대안·트레이드오프:**
  - 이용 가능량: 매 호출마다 계산 (캐싱보다 간단하고 정확, 규모 작음)
  - 인자 비교: JSON 정렬 후 비교 (키 순서 무시하면서 배열 순서는 구별)
  - 에러 우선도: 멱등성 → 타입 → 존재 → 상태 → 양 (멱등성은 가장 먼저 R7 요구)

- **검증 계획:**
  - 단위 테스트: 각 함수별 성공/실패 케이스
  - 통합 테스트: 규칙들의 상호작용 (계보·수량·멱등성)
  - 엣지 케이스: 경계값(0, 1, 1M), ID 재사용, 용기 부족

## 아키텍처

### 내부 상태
```typescript
interface LabState {
  samples: Map<sampleId, SampleRecord>
  reservations: Map<reservationId, ReservationRecord>
  containers: Map<containerId, ContainerRecord>
  eventLog: EventRecord[]
  eventIdMap: Map<eventId, Receipt> // 멱등성: eventId → 처음 결과
  usedIds: Set<sampleId | reservationId> // 영구 금지 (끝난 뒤에도)
}

interface SampleRecord extends SampleView {
  // SampleView: sampleId, parentId, rootId, remaining, reserved, consumedQty, discardedQty, status, containerId, custodianId
}

interface ReservationRecord extends ReservationView {
  // ReservationView: reservationId, sampleId, qty, status
}

interface ContainerRecord {
  containerId: ID
  locationId: ID
  capacity: Qty
  occupantSampleId: ID | null // ACTIVE 시료 하나만
}

interface EventRecord extends EventView {
  // EventView: seq, eventId, op, args
}
```

## 검증 순서 (우선도)

1. **멱등성 (R7 첫 번째)**: eventId가 이미 성공 기록되어 있으면 → 저장된 Receipt 반환, 상태 변화 없음
2. **인자 타입**: qty는 1~1,000,000 정수, 배열이 비어있진 않은지 (R1-5)
3. **ID 존재**: sampleId, reservationId, containerId, custodianId 확인 (R1-1)
4. **상태**: 시료/예약이 필요한 상태인지 (R3-2, R4-3/4)
5. **양 관련**: remaining, reserved, capacity 조건 (R1-2/3, R3-1)
6. **용기**: containerId 중복, 비어있는지 (R5-2/3)
7. **계보**: 분취할 때 자식 용기 중복, 부모 용기 확인 (R5-3)
8. **기타**: 예약 상태, 폐기 조건 등

모두 만족하면 상태 변경 후 이벤트 기록.

## 함수별 알고리즘

### `createLab(catalog: Catalog): Lab`
- catalog의 locations, custodians, containers 유효성 검증 (없는 locationId 포함)
- 빈 LabState 생성
- containers를 ContainerRecord로 변환 (occupantSampleId=null)

### `receive(eventId, input: { sampleId, containerId, custodianId, qty })`
1. eventIdMap 확인 (멱등성)
2. Qty 검증 (1~1M, input 비어있지 않음)
3. IDs 존재 확인 (sample 미사용, container/custodian 존재)
4. sampleId 미사용 (usedIds 확인)
5. container 비어있음 (occupantSampleId==null) + 용량 충분 (qty ≤ capacity)
6. 새 샘플 생성: parentId=null, rootId=self, remaining=qty, reserved=0, consumedQty=0, discardedQty=0, status=ACTIVE, containerId, custodianId
7. container.occupantSampleId = sampleId
8. usedIds에 sampleId 추가 (영구 금지)
9. 이벤트 기록, seq++, eventIdMap 저장

### `split(eventId, parentId, children: Array<{ sampleId, containerId, qty }>)`
1. eventIdMap 확인 (멱등성)
2. children 배열 비어있지 않은지, 각 qty는 1~1M
3. parentId 존재 + ACTIVE
4. 이용 가능량 계산: parent.remaining - parent.reserved
5. 자식들 총 qty ≤ 이용 가능량
6. 자식 containerId들: 중복 없음, 각각 비어있음, parent.containerId는 차 있는 용기로 간주 (분취 불가)
7. 자식 sampleId들: 미사용, 중복 없음 (배열 순서 구별)
8. 모든 검증 통과 후:
   - parent.remaining -= 각 자식 qty 합
   - parent 상태: remaining==0이면 DEPLETED → containerId=null
   - 각 자식 샘플 생성: parentId=parentId, rootId=parent.rootId, remaining=qty, reserved=0, consumedQty=0, discardedQty=0, status=ACTIVE, containerId, custodianId=parent.custodianId
   - 각 container.occupantSampleId = sampleId
   - usedIds에 sampleId들 추가
9. 이벤트 기록 (args: { parentId, children })

### `reserve(eventId, input: { reservationId, sampleId, qty })`
1. eventIdMap 확인
2. qty 검증 (1~1M)
3. reservationId 미사용 (usedIds) + sampleId, samplesId 존재
4. sampleId ACTIVE인지
5. 이용 가능량 ≥ qty (remaining - reserved ≥ qty)
6. 새 예약 생성: reservationId, sampleId, qty, status=ACTIVE
7. sample.reserved += qty
8. usedIds에 reservationId 추가
9. 이벤트 기록

### `cancel(eventId, reservationId)`
1. eventIdMap 확인
2. reservationId 존재 + 상태 ACTIVE (아니면 RESERVATION_CLOSED)
3. reservation.sampleId 찾아서 sample.reserved -= reservation.qty
4. reservation.status = CANCELED
5. 이벤트 기록

### `consume(eventId, reservationId)`
1. eventIdMap 확인
2. reservationId 존재 + 상태 ACTIVE
3. reservation.sampleId 찾아서 sample, qty 가져오기
4. sample.remaining -= qty
5. sample.reserved -= qty
6. sample.consumedQty += qty
7. sample 상태: remaining==0이면 DEPLETED → containerId=null
8. reservation.status = CONSUMED
9. 이벤트 기록

### `discard(eventId, sampleId)`
1. eventIdMap 확인
2. sampleId 존재 + ACTIVE
3. sample의 reserved==0인지 (ACTIVE 예약이 없는지) → 아니면 HAS_RESERVATION
4. sample.discardedQty += sample.remaining
5. sample.remaining = 0
6. sample.status = DISCARDED
7. containerId 비우기 (sample.containerId=null, container.occupantSampleId=null)
8. 이벤트 기록

### `move(eventId, sampleId, targetContainerId)`
1. eventIdMap 확인
2. sampleId 존재 + ACTIVE, targetContainerId 존재
3. target container 비어있음 (occupantSampleId==null)
4. target container 용량 ≥ sample.remaining
5. target 용기가 sample의 현재 용기와 다른지 (같으면 CONTAINER_OCCUPIED)
6. 현재 container 비우기 (occupantSampleId=null)
7. sample.containerId = targetContainerId
8. target.occupantSampleId = sampleId
9. 이벤트 기록

### `transferCustody(eventId, sampleId, custodianId)`
1. eventIdMap 확인
2. sampleId 존재 + ACTIVE, custodianId 존재
3. sample.custodianId = custodianId
4. 이벤트 기록

### `snapshot(): Snapshot`
- samples.values()를 배열로
- reservations.values()를 배열로
- events 반환

## 에러 처리
- 검증 실패 시 먼저 실패한 규칙의 코드 반환
- 규칙 여러 개 위반 → 어느 코드든 가능 (구현자 선택)
- eventIdMap이 이미 있으면 저장된 Receipt 반환 (다시 계산 안 함)
- 실패하면 eventIdMap에 기록 안 함

## 구현 체크리스트
- [ ] Catalog 검증 (locationId 존재 + custodianId 존재 + containers)
- [ ] LabState 타입 정의
- [ ] eventIdMap에 저장된 eventId 확인 (멱등성)
- [ ] 인자 비교 (키 순서 무시, 배열 순서 구별)
- [ ] 모든 ErrorCode 타입 커버
- [ ] 계보·수량 불변식 검증
- [ ] 이용 가능량 계산
- [ ] 원자성 (실패 시 롤백)
- [ ] 이벤트 args 형식 (EventView.args 규정 준수)
- [ ] snapshot() 구현
