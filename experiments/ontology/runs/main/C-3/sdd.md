# 0040 — 연구실 시료 보관 엔진 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** types.ts (공개 계약), PRD (8가지 규칙)
- **접근:** 사건 소싱(Event Sourcing) 스타일로 모든 성공한 명령을 기록. R7 멱등성 보장 위해 eventId와 인자를 저장했던 결과를 리턴. 메모리 기반 in-memory 상태 관리로 저장소 없이 한 번에 한 호출씩 처리. 모든 검사를 미리 수행해 원자성 보장(split도 자식 모두 생성하거나 모두 실패).
- **대안·트레이드오프:** 
  - 멱등성 구현: eventId 기반 인자 저장 (시간/순서 기반 대안 — 같은 명령 재시도 시 첫 결과 정확히 반환)
  - 상태 검사 순서: R7 → R1 → R3 → R4 → R5 (통합 대안 — PRD R7에서 우선순위 명시)
  - split 원자성: 전체 실패/성공 (부분 성공 대안 — PRD R8에서 원자성 요구)
  - 용기 추적: occupantSampleId 저장 (reverse lookup 대안 — O(1) 용기 점유 확인)
- **파일 계획:** `src/lab/lab.ts` 구현 (LabImpl 클래스, 8가지 명령, snapshot)
- **위험:** 
  - R2 계보 수량 보존 불변식을 모든 split/consume/discard 후에 검증 (안 하면 누적 오류)
  - R7 idempotency 인자 비교 시 깊은 비교 필요 (객체 키 순서 무시, 배열 순서 구별)
- **검증 계획:**
  1. 단위 테스트: 각 명령별 성공/실패 케이스 (8개 명령 × 3~5 케이스)
  2. 통합 테스트: 예시 5가지 전체 시나리오 검증
  3. 불변식 검사: 모든 명령 후 "계보 수량 보존" 확인
  4. edge case: ID 중복·수량 경계(0, 1, 1M, 1M+1)·용기 용량·상태 전환 등
  5. pnpm check: 타입 검사, 빌드, 기본 린트 통과

## 내부 구조

### 상태 관리
- `samples`: Map<ID, SampleState> — 시료 (parentId, rootId, remaining, reserved, consumedQty, discardedQty, status, containerId, custodianId)
- `reservations`: Map<ID, ReservationState> — 예약 (sampleId, qty, status)
- `containers`: Map<ID, ContainerState> — 용기 (occupantSampleId, capacity, locationId)
- `eventLog`: Map<ID, EventRecord> — 이벤트 기록 (op, args, seq)
- `seq`: number — 명령 일련번호 (초기 0, 성공 시마다 +1)

### 핵심 알고리즘
- R7 위임 재전송: eventId가 eventLog에 있으면 저장된 receipt 반환
- R1 참조 검사: 모든 ID는 catalog·containers·samples·reservations에서 존재 확인
- R2 계보: receive는 parentId=null/rootId=sampleId, split은 자식들 모두 생성하거나 모두 실패
- R3 이용 가능량: available = remaining - reserved (ACTIVE 예약만)
- R4 상태: remaining=0이면 DEPLETED, discard 호출 시 DISCARDED (용기는 null)
- R5 용기: move/split 시 대상 용기는 비어있고 용량 충분해야 함
- R6 책임자: receive 때 지정, split 자식은 부모 책임자 이어받음
- R8 원자성: 실패 시 모든 상태 무변화 (검사를 먼저 모두 수행)

### 불변식
```
모든 계보에서:
  root의 받은 qty = 계보 내 모든 시료의 remaining + consumedQty + discardedQty 합
```

## 계획과 달라진 점
없음

## 검증 결과
