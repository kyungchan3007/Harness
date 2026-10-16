# 0040-lab SDD — 연구실 시료 보관 엔진 설계

## 개요

메모리 기반 이벤트 소싱 시스템으로 시료의 생명주기를 추적합니다.

- **읽은 문서:** types.ts (공개 계약), prd.md (요구사항)

## 자료구조

### SampleState
- sampleId, parentId, rootId, remaining, reserved, consumedQty, discardedQty, status, containerId, custodianId

### ReservationState
- reservationId, sampleId, qty, status

### ContainerState
- containerId, locationId, capacity, occupantSampleId

### EventLogEntry
- eventId, op, args(깊은 복사본), seq, receipt

## 핵심 알고리즘

### receive
1. 입력·참조·상태 검증
2. SampleState 생성 (parentId=null, rootId=self)
3. 용기에 시료 배정
4. seq 증가, 이벤트 기록

### split
1. 부모 존재·ACTIVE 검증
2. 모든 자식 검증 (ID·용기·용량)
3. 이용 가능량 검사
4. 원자성: 모든 자식 생성 또는 실패

### reserve/cancel/consume/discard
- 예약은 available = remaining - reserved를 감소
- consume은 remaining과 reserved를 동시에 감소
- 0이 되면 DEPLETED, 용기 해제

### move
- 용기 변경, 양·예약·계보·책임자는 미변경

### transferCustody
- 책임자만 변경

## 멱등성 (R7)

- EventLog: (eventId, op, args) 기록
- 재시도: 일치 시 Receipt 반환, 미변경
- 불일치 시 EVENT_CONFLICT

- **접근:**
  1. **상태 저장소**: Map<ID, State>로 도메인 객체 관리
  2. **명령 검증**: 입력→참조→상태→용량→용기→멱등성 순서로 6단계 검증
  3. **원자성**: 검증 성공 후 전체 적용 (split도 모두 또는 전혀)
  4. **멱등성**: EventLog로 (eventId, op, args) 기록 및 비교
  5. **이력**: 깊은 복사로 args 스냅샷 저장, 호출처의 나중 변경 격리

- **대안·트레이드오프:**
  - 객체 복사: 깊은 복사로 args 스냅샷 저장 → args 나중 변경이 이력에 영향 안 미침, 원자성 보장. 트레이드오프: 성능 비용 작음(메모리 크기 제한), 정확성 우선.
  - ID 네임스페이스: 분리 안 함(같은 ID 가능, ID_TAKEN은 전역) → 규칙 R1.4 "ID는 종류마다 따로 고유" 명시. 트레이드오프: 더 엄격한 ID 관리, 실수 가능성 낮춤.
  - Split 원자성: 모든 검증 후 모두 적용 또는 전부 롤백 → 규칙 R8.2 "여러 자식을 나누는 분취도 모두 성공하거나 모두 실패". 트레이드오프: 구현 복잡도 ↑, 부분 상태 불가능.

- **검증 계획:**
  1. 단위: 각 ErrorCode 최소 1회 (15+ 시나리오)
  2. 공개 예시: 사용자 제공 5개 예시 모두 통과
  3. 불변식: 양 보존(받은 양 = 현존 + 소비 + 폐기), 용기(최대 1개 시료, 용량 제약), 예약(reserved ≤ remaining, ACTIVE만 예약 가능)
  4. 멱등성: 같은 (eventId, op, args)로 재전송 후 Receipt·상태 동일
  5. 원자성: split 중 오류 시 자식 0개, 부모 미변경
  6. Edge: 계보 깊이(3세대+), 여러 예약+부분 소비, 용기 재사용(DEPLETED 후 다른 시료)

## 파일 계획

- src/lab/lab.ts: createLab() 함수, 8개 명령 + snapshot()
