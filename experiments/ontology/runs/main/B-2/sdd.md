# 0040-lab — 연구실 시료 보관 엔진 (SDD)

요구사항: [prd.md](prd.md)

## 설계

- **접근:** 메모리 내 상태 엔진으로 구현. Map 기반 (Sample, Reservation, Container). 각 명령에서 R7 idempotency 먼저, 순차 검사, 원자성 보장, seq 증가로 이벤트 기록.

- **데이터 구조:**
```typescript
class Lab {
  samples: Map<ID, Sample>
  reservations: Map<ID, Reservation>
  containers: Map<ID, Container>
  custodians: Set<ID>
  locations: Set<ID>
  eventLog: EventView[]
  eventIdToReceipt: Map<ID, Receipt>
  seq: number
}
```

- **각 명령 검사:**
  - receive: qty 유효성, ID 중복, 용기 존재·비어있음·용량
  - split: 부모 존재·ACTIVE, 자식 배열 비어있지 않음, 자식 ID/용기/수량 유효, 이용 가능량 충분
  - reserve: 예약 ID 중복, 시료 존재·ACTIVE, 이용 가능량 충분
  - cancel/consume: 예약 존재·ACTIVE, 수량 변경
  - discard: 시료 존재·ACTIVE, ACTIVE 예약 없음, 상태→DEPLETED/DISCARDED
  - move: 시료·용기 존재, 시료 ACTIVE, 목표 용기 비어있음·용량 충분·현재 용기 아님
  - transferCustody: 시료·책임자 존재, 시료 ACTIVE

- **원자성:** split·consume 등 다중 상태 변경은 모두 성공하거나 모두 실패. 검사 후 변경으로 구현.

- **핵심 불변식 (R2):** ∀ root: root.received = Σ(descendants.remaining) + Σ(descendants.consumedQty) + Σ(descendants.discardedQty)

- **대안·트레이드오프:**
  - Map 기반 vs Array: O(1) 검색 vs 단순함 → Map 선택 (성능 우선)
  - R7 idempotency 우선 vs 각 명령마다: 일관성 vs 코드 복잡도 → 우선 선택 (규칙 준수)
  - split 원자성: 검사 후 변경 (롤백 불필요), consumed와 함께 remaining/reserved 변경 (일관성)

- **파일 계획:** src/lab/lab.ts (LabImpl 클래스, createLab 함수, snapshot 메서드)

- **위험:** idempotency 검사에서 argsEqual 비교 실수 → 객체 키 순서 무시하고 배열 순서는 구별하는 로직 신중히 구현

- **검증 계획:**
  1. 단위 검사: 각 명령의 정상·오류 케이스 (INVALID_INPUT, UNKNOWN_*, ID_TAKEN, CONTAINER_OCCUPIED, CAPACITY_EXCEEDED, INSUFFICIENT, NOT_ACTIVE, RESERVATION_CLOSED, HAS_RESERVATION, EVENT_CONFLICT)
  2. 통합 검사: 공개 예시 4개 (S1 100→40예약→S2 50분취, S1 100→S2 60 S3 40, receive→reserve→move→transferCustody→consume, split 원자성)
  3. 불변식: 루트 시료의 받은 양 = 계보 전체의 남은양 + 소비 + 폐기
  4. idempotency: 같은 eventId·인자 → 같은 Receipt, 다른 인자 → EVENT_CONFLICT
  5. pnpm check ALL PASS

## 계획과 달라진 점

(없음 — 사전 설계 단계)

## 검증 결과

(구현 후 기록)
