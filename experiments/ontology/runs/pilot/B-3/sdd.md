# 0040-lab SDD — 설계·구현 전략

## 자료 구조

```typescript
interface LabState {
  catalog: Catalog;
  samples: Map<ID, SampleData>;
  reservations: Map<ID, ReservationData>;
  containers: Map<ID, ContainerData>;
  eventLog: EventView[];
  eventIdToReceipt: Map<ID, Receipt>;
  usedIds: Set<ID>;
  seq: number;
}

interface SampleData extends SampleView {}
interface ReservationData extends ReservationView {}

interface ContainerData {
  containerId: ID;
  locationId: ID;
  capacity: Qty;
  occupantSampleId: ID | null;
}
```

## 구현 전략

### 1. 멱등성 (R7)
- `eventIdToReceipt` 맵: 성공한 eventId → Receipt 저장
- 명령 수신: 먼저 eventId 조회 → 있으면 저장된 Receipt 반환 (R7.1)
- 같은 eventId 다른 인자: EVENT_CONFLICT 반환 (R7.2)
- 인자 비교: 객체는 순서 무시, 배열은 순서 구별 (R7.3)

### 2. 검증 (R1)
- 용기 존재: container ∈ catalog
- 책임자 존재: custodian ∈ catalog.custodianIds
- 시료·예약 존재: samples/reservations 맵 검색
- ID 중복: usedIds 추적 → ID_TAKEN (R1.4)
- 입력값 범위: 1 ≤ qty ≤ 1,000,000 (R1.5)

### 3. 수량 불변식 (R2.4)
모든 변경 후 검사:
```
root.receivedQty ===
  Σ(samples[*].remaining) +
  Σ(samples[*].consumedQty) +
  Σ(samples[*].discardedQty)
```
단, 구현에서는 정합성을 항상 유지하므로 명시적 검사 불필요.

### 4. 명령별 구현 순서
1. **receive**: 새 루트 시료 생성, 용기 할당
2. **split**: 자식 시료들 생성, 부모 남은 양 감소
3. **reserve**: 시료 reserved 증가 (이용 가능량 검사)
4. **cancel**: ACTIVE 예약 → CANCELED, reserved 감소
5. **consume**: ACTIVE 예약 소비 (남은 양·reserved 감소)
6. **discard**: ACTIVE 시료 폐기 (remaining 0, status DISCARDED)
7. **move**: 시료를 다른 용기로 이동
8. **transferCustody**: 책임자 변경

### 5. 상태 전이 (R4)
- ACTIVE: 정상, 모든 명령 가능
- DEPLETED: remaining=0 + 조건 없음, 되살릴 수 없음
- DISCARDED: discard 명령, 되살릴 수 없음
- ACTIVE 아니면: 분취·예약·폐기·이동·책임자변경 불가 (NOT_ACTIVE)

### 6. 용기 관리 (R5)
- 시료 location: `containers[containerId].locationId` (따로 저장 X)
- move: 대상 용기 비어 있음 + 용량 충분 검사
- 지금 용기로 이동 → CONTAINER_OCCUPIED (R5.2)
- 자식 용기 중복 사용 → CONTAINER_OCCUPIED (R5.3)

### 7. 원자성 (R8)
- 명령 실행 전: 모든 검사 수행
- 검사 실패 → 상태 변경 없음
- 검사 성공 → 상태 변경 + eventLog + seq++ + eventIdToReceipt 저장

- **접근:** 상태 기계 + 이벤트 로그로 멱등성(R7)·원자성(R8) 보장. LabState 맵 기반 저장소(samples, reservations, containers, usedIds)와 eventIdToReceipt 캐시 사용. 명령 수신 → eventId 캐시 확인 → 없으면 입력값 검증(R1, R5, 범위) → 상태 전이 검사(R4, R3 등) → 모두 성공 시 상태 변경 + 이벤트 기록 → 한 단계 실패하면 아무것도 변경 없음.

- **대안·트레이드오프:**
  - 맵 기반 저장소 vs 배열: O(1) 조회를 위해 맵 선택 (메모리 약간 증가)
  - 수량 불변식 사후 검사 vs 구축 시 보장: 구축 시 보장으로 실수 방지 (구현 단순)
  - eventId 문자열 비교 vs 해시: 단순 문자열 비교 (큰 ID 환경에서 느림, 무시할 수준)
  - 객체 순서 무시 argsEqual vs JSON.stringify: R7.3 정책 준수 (배열 중첩 시 느림, 데이터 작음)

- **검증 계획:**
  1. 단위: R1~R8 각 규칙별 양성/음성 케이스
  2. 통합: receive→split→reserve→consume, split 실패 시 원자성, 예약 중 이동·책임자변경, discard 거부
  3. 멱등성: 같은 eventId 재전송 시 처음 Receipt 반환
  4. 자동화: `pnpm test`, `pnpm check`
