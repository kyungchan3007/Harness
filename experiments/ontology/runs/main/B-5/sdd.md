# 0040 — 연구실 시료 보관 엔진 — SDD

## 설계 개요

`createLab(catalog)` 함수가 다음 내부 상태를 관리하는 `Lab` 인스턴스를 반환합니다.

### 내부 데이터 구조

```typescript
{
  samples: Map<ID, Sample>;        // sampleId → Sample
  containers: Map<ID, Container>;  // containerId → Container
  reservations: Map<ID, Reservation>; // reservationId → Reservation
  eventHistory: Map<ID, EventRecord>;  // eventId → (op, args, seq)
  events: EventView[];  // 시간순 이벤트 로그 (seq별로 정렬)
  seq: number;  // 다음 이벤트 seq (1부터 시작)
}

Sample {
  sampleId: ID;
  parentId: ID | null;
  rootId: ID;
  remaining: Qty;  // 용기에 남은 양
  consumedQty: Qty;  // 소비된 누적량
  discardedQty: Qty;  // 폐기된 누적량
  status: SampleStatus;  // ACTIVE | DEPLETED | DISCARDED
  containerId: ID | null;  // ACTIVE면 용기, 아니면 null
  custodianId: ID;  // 책임자
}

Container {
  containerId: ID;
  locationId: ID;
  capacity: Qty;
  sampleId: ID | null;  // 지금 담긴 시료, 없으면 null
}

Reservation {
  reservationId: ID;
  sampleId: ID;
  qty: Qty;  // 예약 양(변하지 않음)
  status: ReservationStatus;  // ACTIVE | CANCELED | CONSUMED
}

EventRecord {
  eventId: ID;
  op: string;
  args: unknown;
  seq: number;
}
```

## 규칙별 구현 전략

### R1 참조·수용
- `catalog`의 locationIds, custodianIds, containers로 유효한 ID 사전 구성
- 모든 명령에서 ID 유효성 검사 먼저 수행
- 시료/예약/용기 등이 존재하지 않으면 해당 UNKNOWN_* 반환

### R2 계보·수량 보존
- `receive`: 새 시료 생성, parentId=null, rootId=자신
- `split`: 부모의 이용 가능량 검사 → 자식들 생성, parentId=부모, rootId=부모의 rootId
  - 모든 자식 용기가 비어있는지 검사 (원자성)
  - 자식들의 合 > 부모의 이용 가능량이면 실패 (모두 또는 아무것도 안 함)
- 분취 후 부모의 remaining에서 뺌 (자식들이 이미 남은 양을 가지고 시작하므로 OK)

### R3 예약·소비
- `reserved`: sampleId의 ACTIVE 예약들의 qty 합
- `available`: remaining - reserved
- `reserve`: available >= qty 검사
- `cancel`: 예약을 CANCELED로 변경
- `consume`: ACTIVE 예약을 CONSUMED로, remaining과 reserved를 모두 줄임

### R4 상태·폐기
- 남은 양이 0이면 자동으로 DEPLETED (분취·소비·폐기 후마다 검사)
- DEPLETED/DISCARDED가 되면 containerId=null (용기 비움)
- 이들 상태에서는 분취·예약·폐기·이동·책임자 변경 불가

### R5 용기·장소
- `move`: 
  - 대상 용기가 비어있고 capacity >= remaining 검사
  - 자식의 용기도 마찬가지 검사
  - 자식들이 서로 다른 용기 사용 (CONTAINER_OCCUPIED)
- 원자성: 모두 성공하거나 모두 실패

### R6 보관 책임
- `transferCustody`: 한 시료만 변경 (부모·자식 영향 없음)

### R7 같은 명령 다시 보내기
- eventHistory에 (eventId, op, args) 기록
- 같은 eventId로 재요청 시 이미 성공했으면 처음 Receipt 반환
- args 비교: 객체 키 순서 무시, 배열 순서 구별 (deep-equal 사용)
- 실패한 eventId는 기록 안 함

### R8 원자성·이력
- 모든 상태 변경 전에 모든 검사 수행 (fail-fast)
- 실패하면 상태 변경 없음
- 성공하면 seq 증가, 이벤트 기록
- args는 호출 시점에 복사 (나중 변경 영향 없음)

## 구현 단계

1. **초기화 & 검증**: createLab에서 catalog 검증
2. **각 명령 구현**: 
   - 중복 검사 (eventHistory 확인)
   - 모든 입력 검증
   - 상태 계산 (reserved, available 등)
   - 변경 (원자적)
   - 이벤트 기록
3. **snapshot()**: 현재 상태 반환

## 구현 세부사항

### 이용 가능량 계산
```typescript
function getAvailable(sample: Sample, reservations: Map<ID, Reservation>): Qty {
  const reserved = Array.from(reservations.values())
    .filter(r => r.sampleId === sample.sampleId && r.status === 'ACTIVE')
    .reduce((sum, r) => sum + r.qty, 0);
  return sample.remaining - reserved;
}
```

### DEPLETED 자동 전환
분취·소비·폐기 후에는 모든 샘플의 상태 검사:
```typescript
if (sample.status === 'ACTIVE' && sample.remaining === 0) {
  sample.status = 'DEPLETED';
  sample.containerId = null;
}
```

### args 복사 (R8)
```typescript
const savedArgs = JSON.parse(JSON.stringify(args));  // 깊은 복사
```

이렇게 하면 호출자가 나중에 `args` 객체를 변경해도 이력에는 영향 없음.

- **접근:** `src/lab/lab.ts`에 `createLab(catalog)` 함수로 Lab 인스턴스 반환. 내부 상태는 클로저로 캡슐화 (samples, containers, reservations, eventHistory). 메모리 내, 영속성 없음, 동기 처리.
- **대안·트레이드오프:**
  - 클래스 vs 클로저: 클로저가 캡슐화 강함(private 필드) → 클로저 선택.
  - 깊은 복사: 입력 시 복사로 일관성 보장 (R8).
  - 원자성: 검증 먼저, 모두 성공하거나 모두 실패 (fail-fast).
  - DEPLETED 자동: 규칙 R4 단순화, 매 명령 후 검사.
- **검증 계획:** 명령별 단위 테스트(receive, split, reserve, cancel, consume, discard, move, transferCustody), 규칙별 검증(R1~R8), 공개 예시 5개 시나리오, 역계산(sum remaining + consumed + discarded = sum roots).
