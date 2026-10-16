# SDD 0040 — 연구실 시료 보관 엔진 설계

## 핵심 설계

### 1. 상태 저장소

Lab 인스턴스는 다음을 메모리에 보관합니다:

```typescript
catalog: Catalog  // 장소·용기·책임자 목록(불변)
samples: Map<sampleId, SampleState>  // 시료 상태
reservations: Map<reservationId, ReservationState>  // 예약
events: EventView[]  // 이력
eventIdToSeq: Map<eventId, seq>  // eventId → seq 매핑 (중복 방지)
containerToSample: Map<containerId, sampleId>  // 용기 → 시료 (1:1)
seq: number  // 다음 이벤트 seq
```

### 2. 각 명령의 검증·실행 흐름

#### R7 중복 방지 (우선)
1. eventId를 받으면 먼저 eventIdToSeq 확인
2. 이미 기록된 eventId면:
   - 같은 op + 같은 args → 처음 Receipt 반환
   - 다른 op 또는 다른 args → EVENT_CONFLICT

#### 명령 실행의 원자성 (R8)
1. 검증 단계: 모든 전제 조건 확인
2. 실행 단계: 성공하면 상태 변경 + 이벤트 기록
3. 실패 시: 상태 변경 없음 (롤백 불필요, 애초 변경 안 함)

#### args 저장 (R8-3)
- 호출한 쪽이 넘긴 객체를 복사해서 저장 (참조 보존 안 함)

### 3. 주요 검증 로직

#### receive (R1, R2-1)
- sampleId 미사용
- containerId, custodianId 존재
- 용기가 비어 있음 (containerToSample에 없음)
- qty 범위 (1~1,000,000)
- qty ≤ 용기 용량
- 이후: 샘플 생성, rootId = sampleId

#### split (R2, R5-3)
- parentId 존재 + ACTIVE
- children 배열 비어 있지 않음
- 각 자식 ID 미사용
- 각 자식 용기 비어 있음 + 서로 다름
- 부모 용기는 차 있음
- 각 qty 범위
- 각 qty ≤ 자식 용기 용량
- Σ(자식 qty) ≤ 부모 available (R3-1)
- 이후: 자식들 생성, 부모 remaining 감소, 부모가 0이면 DEPLETED

#### reserve (R3)
- sampleId 존재 + ACTIVE
- reservationId 미사용
- qty 범위
- qty ≤ available (remaining - reserved)
- 이후: reserved 증가

#### cancel (R3-3, R3-5)
- reservationId 존재
- 상태 ACTIVE (CANCELED/CONSUMED면 RESERVATION_CLOSED)
- 이후: 상태 CANCELED, reserved 감소

#### consume (R3-4, R3-5)
- reservationId 존재
- 상태 ACTIVE
- 이후: 예약 qty 전체 소비 (remaining·reserved 감소, consumedQty 증가, 상태 CONSUMED, 0이면 샘플 DEPLETED)

#### discard (R4)
- sampleId 존재 + ACTIVE
- ACTIVE 예약 없음 (HAS_RESERVATION)
- 이후: remaining → 0, DISCARDED, discardedQty 증가, 용기 비움

#### move (R5)
- sampleId 존재 + ACTIVE
- targetContainerId 존재 + 비어 있음 (targetContainerId ≠ 현재 containerId)
- remaining ≤ 목표 용기 용량
- 이후: 용기만 변경, 양·예약·계보·책임자 그대로

#### transferCustody (R6)
- sampleId 존재 + ACTIVE
- custodianId 존재
- 이후: custodianId 변경 (부모·자식에게 번지지 않음)

### 4. 불변식 검증 (테스트에서)

- I1: 계보마다 수량 보존 (시작 시료 qty = Σ(남은양+소비+폐기))
- I2: 용기 점유 (ACTIVE는 1개, 끝난건 null)
- I3: 수량 범위 (remaining ≤ 용량, reserved ≤ remaining)
- I4: reserved = ACTIVE 예약의 합
- I7: seq 연속성 (1부터 빈틈없이)
- I9: eventId 중복 시 상태 그대로

### 5. 구현 전략

1. `SampleState` 내부 클래스: remaining, reserved, status, consumedQty, discardedQty, parentId, rootId, containerId, custodianId
2. `ReservationState` 내부 클래스: sampleId, qty, status
3. 각 메서드는 Result 반환 (성공/실패)
4. 헬퍼:
   - `isValidQty()`: qty 범위 확인
   - `copyArgs()`: args deep copy
   - `argsEqual()`: args 구조적 비교 (객체 키 순서 무시)

- **접근:** 메모리 내 임시 저장소로 구현하며, 영속성은 불필요합니다. 동시 실행을 지원하지 않고 한 번에 한 호출씩 처리합니다. 각 명령은 독립적으로 검증한 후 모든 전제가 만족되면 원자적으로 실행합니다.

- **대안·트레이드오프:** 
  - eventId → seq 매핑 vs. eventId를 이력에 직접 저장: seq 중복 확인 시 전체 이력 스캔 불필요
  - args deep copy vs. 참조 유지: R8-3에서 호출한 쪽 객체 변경이 이력 영향 못하게
  - 검증 → 실행 순차 vs. 트랜잭션 로그: 메모리 내 단순 구현으로 충분

- **검증 계획:**
  1. 단위 테스트: 각 명령의 happy path, 각 오류 코드, eventId 중복 처리
  2. 불변식 검증: I1 계보 수량, I4 reserved 합, I7 seq 연속성, I9 eventId 중복
  3. 복합 시나리오: 요청 문서의 예시 1~5 모두 재현
