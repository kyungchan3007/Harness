# SDD — 연구실 시료 보관 엔진 설계

## 접근

- **접근:** 인메모리 상태 기계 패턴
  1. 순차 처리: 모든 명령을 일렬로 처리하며 각 명령은 원자적(all-or-nothing)
  2. 멱등성: eventCache를 통해 같은 eventId 재호출 시 동일한 결과 반환
  3. 불변식: 수량 보존, 상태 전이, 용기 점유 규칙을 엄격히 유지
  
  **계층**:
  - Catalog (읽기 전용): 환경 설정 — 장소, 보관자, 용기
  - State (뮤터블): 런타임 상태 — 시료, 예약, 용기 할당, 이력
  - Lab 메서드: 입력 검증 → 비즈니스 로직 → 상태 변경 → 기록

## 아키텍처 개요

```
Lab (엔진 인스턴스)
├─ Catalog (읽기 전용: locations, custodians, containers)
├─ State (뮤터블)
│  ├─ samples: Map<sampleId, Sample>
│  ├─ reservations: Map<reservationId, Reservation>
│  ├─ containers: Map<containerId, {sampleId | null}>  // 점유 여부
│  ├─ eventCache: Map<eventId, {receipt, request}>  // 멱등성 + 감사
│  └─ events: EventView[]  // append-only 이력
└─ seq: number  // 현재 시퀀스 번호 (증가만 함)
```

## 데이터 구조

### Sample (내부)
```typescript
{
  sampleId: ID;
  parentId: ID | null;           // null → root (분취로 만들어지지 않음)
  rootId: ID;                     // 계보 추적용
  remaining: Qty;                 // 실제 담긴 양
  reserved: Qty;                  // ACTIVE 예약의 합 (분취·소비하지 않은 예약)
  consumedQty: Qty;               // 누적 소비
  discardedQty: Qty;              // 누적 폐기
  status: "ACTIVE" | "DEPLETED" | "DISCARDED";
  containerId: ID | null;         // ACTIVE만 설정, 끝나면 null
  custodianId: ID;                // 책임자 (분취 시 부모에서 상속)
}
```

### Reservation (내부)
```typescript
{
  reservationId: ID;
  sampleId: ID;
  qty: Qty;
  status: "ACTIVE" | "CANCELED" | "CONSUMED";
}
```

## 핵심 알고리즘

### 1. receive(eventId, {sampleId, containerId, custodianId, qty})
**선행 검사** (원자성을 위해 모두 성공해야 함):
- eventCache에 eventId 있으면 그 Receipt 반환 (멱등성 — R7)
- sampleId 중복 확인 (ID_TAKEN)
- custodianId, containerId 카탈로그 확인 (UNKNOWN_*)
- containerId 점유 확인 (CONTAINER_OCCUPIED)
- qty 범위 검증 (INVALID_INPUT — 1~1,000,000)
- 용량 확인 (CAPACITY_EXCEEDED)

**실행**:
- Sample 생성: parentId=null, rootId=sampleId, remaining=qty, status=ACTIVE
- containers[containerId] ← sampleId 할당
- seq++, eventCache에 요청 저장 (완전 복사), events 기록

### 2. split(eventId, parentId, children[])
**선행 검사**:
- eventCache 확인
- parentId 존재 (UNKNOWN_SAMPLE)
- parent 상태=ACTIVE (NOT_ACTIVE)
- children.length ≥ 1 (INVALID_INPUT)
- 각 child:
  - sampleId 중복 확인 (ID_TAKEN — 전체 히스토리 + 현재 분취 내)
  - containerId 유효성, 점유, 용량
  - 다른 child들과 용기 중복 불가
- Σchildren.qty ≤ parent.remaining - parent.reserved (INSUFFICIENT)

**실행** (모두 성공 또는 모두 실패):
- 각 child마다 Sample 생성: parentId, rootId=parent.rootId, custodianId=parent.custodianId
- 각 child의 containerId에 할당
- parent.remaining -= Σchildren.qty
- parent.remaining=0이면 parent.status ← DEPLETED (containerId는 유지)
- seq++, 기록

### 3~8. 기타 메서드
각 메서드는 eventCache→검사→변경→seq++→기록 패턴 따름.

**이용 가능량** (예약과 분취 시 검증):
```
availableQty = remaining - reserved
// 새로운 예약/분취는 availableQty 이하여야 함
```

**상태 전이** (R4):
- ACTIVE → DEPLETED: 분취·소비로 remaining=0
- ACTIVE → DISCARDED: discard 호출 (reserved=0 필수)
- DEPLETED/DISCARDED → (끝) → 되살릴 수 없음

## 구현 전략

### 멱등성 (R7)
eventCache는 성공한 명령만 기록. 재호출 시:
1. 같은 eventId + 같은 op + 같은 args → 원래 Receipt 반환, 상태 불변
2. 같은 eventId + 다른 op/args → EVENT_CONFLICT 반환
3. 새 eventId → 새로 실행

**args 비교**: JSON 직렬화 후 문자열 비교 (순서 무시, 배열 순서 구별)

### 원자성 (R8)
모든 메서드:
1. eventCache 확인 (멱등성)
2. 모든 검사 수행 (실패 시 여기서 return)
3. 상태 변경 (실제 변경은 모두 한 번에)
4. seq++, eventCache, events 업데이트

### 수량 보존 (R2-4)
각 root에 대해:
```
received = Σ(모든 시료의 remaining) + Σ(consumedQty) + Σ(discardedQty)
```
이는 불변식으로 테스트에서 검증되지만, 구현은 이를 보장하도록 설계.

## 대안·트레이드오프

- **대안·트레이드오프:** 메이저 설계 선택
  - Map 기반 저장: 빠른 조회(O(1)) vs. 메모리 오버헤드 → Map 선택
  - 검사 우선 모두 수행: 원자성 보장 vs. 중복 검사 → 우선 수행 선택
  - JSON 완전 복사 (args): 안전성 vs. 직렬화 비용 → 복사 선택
  - 상태 기계 기반: 명확성 vs. 체크 오버헤드 → 상태 기계 선택
  - 이벤트 소싱 vs. 스냅샷: 선택 → 스냅샷 + 감사 이력

## 검증 계획

- **검증 계획:** 테스트 전략 + 구체적 케이스
  1. 단위 테스트: 각 메서드별 성공·에러 경로 + 에러 코드 검증
  2. 통합 테스트: PRD의 공개 예시 5가지 모두 통과
     - 예약 후 분취: reserved가 이용 가능량 제한
     - 전량 분취 후 부모 DEPLETED: 상태 전이
     - 이동 후 책임 이전: 메서드 조합 무결성
     - 분취 원자성: 실패 시 전체 롤백
     - 멱등성: 재호출 시 상태 불변
  3. 불변식: 수량 보존(Σ), 용기 점유(≤1), 상태 전이 유효성

## 테스트 범위

- **유닛**: 각 메서드별 happy path + 모든 에러 코드
- **통합**: 공개 예시 5가지 + 복합 시나리오
- **불변식**: 수량 보존, 용기 점유(1 이하), 계보 구조, 상태 전이 유효성
