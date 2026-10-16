# 0040 — 시료 보관 엔진 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **접근:**
  - Catalog를 인덱싱하여 존재성 검사를 O(1)로 처리 (locationIds, custodianIds는 Set, containers는 Map)
  - 모든 상태(samples, reservations, containerToSample)를 Map 기반으로 관리
  - eventId 중복 검사: 같은 op·args이면 처음 Receipt 반환, 다르면 EVENT_CONFLICT
  - args 비교: JSON.stringify로 정렬된 키 기반 (객체 순서 무시, 배열 순서 구별)
  - split의 원자성: 모든 자식 검증 통과 후 일괄 반영 (실패 시 전무)
- **대안·트레이드오프:**
  - state 설계: Class vs Closure → 선택 Closure (createLab 함수 내부 변수), 이유 외부 접근 차단·불변성 보증
  - args 복사: 얕은 복사 vs 깊은 복사 → 선택 깊은 복사 (JSON.stringify/parse), 이유 receive·split 입력이 나중에 고쳐져도 이력 무변 (R8-3)
  - eventId 기록: 모든 호출 vs 성공한 호출만 → 선택 성공한 호출만 기록, 이유 실패한 eventId는 재시도 가능 (R7-4)
- **파일 계획:** `src/lab/lab.ts` (createLab 함수), `src/lab/types.ts` (이미 있음, 수정 금지)
- **위험:** split 원자성 미보장 시 부모가 부분 감소 및 자식 일부만 생성 → 모든 자식 검증을 먼저 하고 실패 시 상태 무변
- **검증 계획:** 8개 명령별 모든 오류 코드 테스트, 공개 예시 5개 시나리오 (R1·R2·R3·R4·R7), 불변식 I1~I11 확인, pnpm check

## 데이터 구조

### 메인 상태 (createLab 클로저 내부)
```typescript
- samples: Map<sampleId, InternalSample>
- reservations: Map<reservationId, InternalReservation>
- containerToSample: Map<containerId, sampleId | null>
- events: EventView[]
- eventIdRecord: Map<eventId, {op, args, receipt}>
- usedIds: Set<sampleId | reservationId>
- seq: number
```

### Catalog 인덱싱
- locationIds: Set<locationId>
- custodianIds: Set<custodianId>
- containerMap: Map<containerId, {capacity, locationId}>

## 알고리즘

### 공통 패턴
1. checkEventId(eventId, op, args): 기록된 eventId 확인 → 같으면 처음 Receipt, 다르면 EVENT_CONFLICT
2. 각 명령: 검증 → 상태 변경 → recordEvent (모두 성공하거나 모두 실패)

### receive
1. 유효성: qty, sampleId 새것, containerId/custodianId 존재, 용기 비어있음, remaining ≤ 용량
2. 시료 생성: {sampleId, parentId: null, rootId: sampleId, remaining: qty, reserved: 0, …}
3. containerToSample[containerId] = sampleId

### split (원자성)
1. 모든 자식 사전 검증 (qty, id, container, 용량)
2. available = parent.remaining - parent.reserved ≥ 총량 확인
3. 검증 통과 후 parent 변경 + 모든 자식 생성

### reserve ~ consume
1. reserve: sample.reserved += qty
2. cancel: reservation.status = CANCELED, sample.reserved -= qty
3. consume: reservation.status = CONSUMED, remaining·reserved·consumedQty 동시 변경, DEPLETED 확인

### discard·move·transferCustody
- discard: ACTIVE 예약 없는지 확인 후 remaining 0, DISCARDED, containerId null
- move: 지금 용기와 다른가 + 목표 용기 비어있는가 확인
- transferCustody: custodianId 변경만

## 엣지 케이스
- split에서 자식 하나라도 실패하면 부모 변경 안 함
- move·transferCustody는 ACTIVE 예약 중이어도 가능
- 끝난 시료는 containerId null, 용기 재사용 가능
- consume은 예약 양 전체만 가능 (일부 불가)
- args 직렬화: 객체 키 정렬, 배열 순서 유지
