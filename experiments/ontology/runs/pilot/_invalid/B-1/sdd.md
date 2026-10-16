# 0040 — 연구실 시료 보관 엔진 — SDD

요구사항: [prd.md](prd.md)

## 설계

- **접근:** 인메모리 상태 관리로 모든 시료 작업을 원자적으로 처리하되, 멱등성과 수량 보존이라는 두 가지 핵심 조건을 모든 명령에서 일관되게 적용한다. 
  1. **상태 저장소:** 샘플, 예약, 이벤트 로그를 Map 자료구조로 인메모리 관리. 샘플의 계보 추적을 위해 childIds, parentId, rootId 필드 저장. 이벤트 로그는 (eventId → {receipt, command, args})를 저장하여 멱등성 확인에 사용.
  2. **검증 계층:** 모든 명령 처리는 5단계 검증을 순차적으로 거침: (1) 멱등성 확인, (2) 입력 검증, (3) 참조 검증, (4) 상태 검증, (5) 비즈니스 규칙 검증. 검증 실패 시 즉시 Result<Receipt>를 반환하고 eventLog에 기록하지 않음.
  3. **수량 보존 전략:** split, consume, discard 후마다 루트부터 전체 계보를 순회하여 흐름 공식 검증: 루트의 receive 양 = (계보 내 모든 시료의 남은 양 합) + (누적 소비 합) + (누적 폐기 합). 검증 실패 시 예외 throw.
  4. **트랜잭션 원자성:** split의 다중 자식 생성은 모두 성공하거나 모두 실패. 검증 실패 시 모든 상태 변화 롤백.

- **데이터 구조:**
  ```typescript
  interface LabState {
    validLocationIds: Set<ID>;
    validCustodianIds: Set<ID>;
    containerMap: Map<ID, { locationId: ID; capacity: Qty; sampleId: ID | null }>;
    samples: Map<ID, InternalSampleView>;
    reservations: Map<ID, InternalReservationView>;
    eventLog: Map<ID, { receipt: Receipt; command: string; args: unknown }>;
    seq: number;
  }
  ```

- **검증 계층 (Validation):** 모든 명령 처리 전에 순차적으로 5단계 검증 실행:
  1. 멱등성 확인: eventId가 eventLog에 있으면 그 receipt 반환.
  2. 입력 검증: qty 범위(1~1,000,000), 배열 비어있지 않음.
  3. 참조 검증(R1): 용기, 책임자, 시료, 예약 ID 존재 여부.
  4. 상태 검증: 시료/예약 상태 (ACTIVE/DEPLETED/DISCARDED).
  5. 비즈니스 규칙 검증: 용량, 이용 가능량, 예약 충돌 등.

- **명령별 구현:**
  - **receive:** sampleId 미사용, containerId/custodianId 유효, qty 범위. sample 생성: status=ACTIVE, remaining=qty, reserved=0, containerId 배정.
  - **split:** 부모 ACTIVE, 자식 sampleId 미사용, 자식 containerId 비어있음. 이용 가능량 ≥ 자식 총량. 자식 생성 후 부모 remaining 차감. 실패 시 모두 롤백.
  - **reserve:** sampleId 유효, 시료 ACTIVE. 이용 가능량 ≥ qty. sample.reserved += qty.
  - **cancel:** reservationId 유효, 예약 ACTIVE. 예약.status = CANCELED, sample.reserved -= qty.
  - **consume:** reservationId 유효, 예약 ACTIVE. 예약.status = CONSUMED, sample.remaining/reserved 동시 차감, sample.consumedQty 증가.
  - **discard:** sampleId 유효, 시료 ACTIVE, reserved == 0. sample.status = DISCARDED, remaining = 0, sample.discardedQty 증가, containerId = null.
  - **move:** sampleId 유효, 시료 ACTIVE, targetContainerId 비어있음, 용량 ≥ remaining. 용기 변경.
  - **transferCustody:** sampleId 유효, 시료 ACTIVE, custodianId 유효. sample.custodianId 변경.

- **오류 코드:** INVALID_INPUT (범위/배열), UNKNOWN_* (미존재), ID_TAKEN (중복), CONTAINER_OCCUPIED (점유/중복), CAPACITY_EXCEEDED (용량 초과), INSUFFICIENT (이용 가능량 부족), NOT_ACTIVE (종료), RESERVATION_CLOSED (예약 종료), HAS_RESERVATION (예약 있음), EVENT_CONFLICT (다른 인자).

- **대안·트레이드오프:**
  1. **멱등성 구현:** 채택안: 전체 eventLog에 (eventId → {receipt, command, args})를 영구 저장. 이 방식은 단순하고 분산 환경 호환. 대안: (a) 시간 기반 캐시 — 메모리 절약하나 TTL 관리 복잡, 캐시 일관성 미지원. (b) 해시 기반 축약 — 메모리 절약하나 충돌 위험.
  2. **수량 보존 검증:** 채택안: split/consume/discard 후마다 즉시 검증, 실패 시 예외 throw. 이는 버그 조기 탐지로 디버깅 용이. 대안: (a) 스냅샷 시만 검증 — 런타임 오류 뒤늦게 발견. (b) 비동기 검증 — 성능 개선하나 에러 처리 복잡.
  3. **계보 저장:** 채택안: 각 샘플에 parentId, childIds, rootId 저장하여 O(N) 순회로 계보 추적. 이는 저장소 단순하고 일관성 유지 용이. 대안: (a) 전용 트리 자료구조 — 순회 성능 개선하나 재균형 복잡. (b) 그래프 DB — 확장성 우수하나 원자성 보장 어려움.

- **검증 계획:**
  - **단위 테스트:** 8개 명령(receive/split/reserve/cancel/consume/discard/move/transferCustody) × 성공/오류 케이스. 멱등성 (같은 eventId → 재전송 성공), 원자성 (split 자식 실패 시 롤백), 수량 보존 (split/consume/discard 후 흐름 공식 검증).
  - **통합 테스트:** 공개 예시 5개 케이스 (prd.md 참조). 각 케이스: 초기 상태 → 명령 실행 → snapshot 검증 (샘플 개수, 양, 상태, 예약, 이벤트).
  - **게이트:** tsc (타입 안전성), eslint (코드 스타일), vitest (테스트 통과, 커버리지 80% 이상).

