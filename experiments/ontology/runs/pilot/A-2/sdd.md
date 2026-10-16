# 0040 — 연구실 시료 보관 엔진 — SDD

- **접근:** 메모리 기반 상태 머신으로 구현. Map/Set으로 모든 시료·예약·컨테이너 매핑을 유지하고, 이벤트 ID 중복 검출로 멱등성 보장, 각 명령마다 원자성 확보 (분취는 모든 자식이 동시 생성 또는 전무), 계보와 수량 보존을 불변식으로 검증.

- **대안·트레이드오프:**
  1. 메모리 기반 (채택): 간단하고 빠르지만 휘발성, 저장소 없음
  2. 이벤트 소싱: 재생 가능하고 감사 가능하지만 복잡도 증가
  3. 데이터베이스: 내구성 있지만 범위 초과 (요청서에서 제외)
  - 이벤트 멱등성: eventId 캐시로 중복 명령 시 처음 결과 반환, 깊은 동등성 비교는 객체 키 순서 무시·배열 순서 구분, 실패한 eventId는 기록 안 함 (재시도 가능)

- **검증 계획:**
  1. 단위 테스트: 각 메소드별 성공/실패 경로 (receive/split 계보, reserve/cancel/consume 예약 전이, discard/move/transferCustody 상태·용기)
  2. 통합 테스트: 공개 예시 5가지 (예약+분취, 분취→DEPLETED, 이동+책임자변경+소비, 분취원자성, 중복이벤트캐시)
  3. 엣지 케이스: 부모 DEPLETED 유도, 예약 전체 소비, 끝난 시료 재작업, 용기 용량 초과

## 아키텍처

메모리 기반 상태 머신. 모든 상태는 Lab 인스턴스 내부의 Map/Set 자료구조에서 관리.

### 핵심 자료구조

```typescript
class LabImpl implements Lab {
  private catalog: Catalog
  private samples = new Map<ID, SampleData>()
  private reservations = new Map<ID, ReservationData>()
  private containerToSample = new Map<ID, ID>()
  private events: EventView[] = []
  private nextSeq = 1
  private eventIdToReceipt = new Map<ID, Receipt>()
  private eventIdToCommand = new Map<ID, { op, args }>()
}
```

### 내부 데이터 구조

```typescript
interface SampleData {
  sampleId: ID
  parentId: ID | null
  rootId: ID
  remaining: Qty
  reserved: Qty
  consumedQty: Qty
  discardedQty: Qty
  status: SampleStatus
  containerId: ID | null
  custodianId: ID
}

interface ReservationData {
  reservationId: ID
  sampleId: ID
  qty: Qty
  status: ReservationStatus
}
```

## 핵심 로직

### 이벤트 중복 검출 (R7)
- 모든 메소드의 첫 단계에서 eventId 검색
- 존재하면 캐시된 Receipt 반환 (상태 변경 없음)
- 없으면 진행

### 입력 검증 (R1·R5)
- Qty 범위: 1 ≤ qty ≤ 1,000,000
- ID 존재성: locationIds, custodianIds, container 존재 확인
- 배열: 비어있으면 INVALID_INPUT

### 메소드별 구현

**Receive (R2·R4·R6):** 새 시료 생성 (parentId=null, rootId=자신), 용기 배정·책임자 설정

**Split (R2·R3·R5):** 원자성 확보로 모든 자식 용기 확인 → 이용 가능량 검증 → 모든 자식 생성 (원자) → 부모 변경

**Reserve (R3):** 이용 가능량 확인 → ACTIVE 확인 → reserved 증가

**Cancel/Consume (R3):** 예약 상태 ACTIVE 확인 → Cancel(reserved 감소, 상태 CANCELED) / Consume(remaining·reserved 감소, consumedQty 증가, 상태 CONSUMED)

**Discard (R4):** ACTIVE 예약 없음 확인 → discardedQty 증가, remaining=0, 상태 DISCARDED

**Move (R5):** 목표 용기 비어있음·용량 충분 확인 → 용기 교체

**TransferCustody (R6):** custodianId 변경 (부모·자식 영향 없음)

### 계보·수량 보존 (R2)
모든 명령 후 불변식: 시작 시료의 받은 양 = 계보의 모든 시료 remaining 합 + consumedQty 합 + discardedQty 합

## 구현 순서

1. LabImpl 클래스 뼈대
2. receive, snapshot 구현 (기본 동작)
3. split, reserve, cancel, consume 구현
4. discard, move, transferCustody 구현
5. 중복 검출 (R7) 추가
6. 테스트 작성
7. pnpm check
