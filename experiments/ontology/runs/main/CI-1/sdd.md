# 0040 — 연구실 시료 보관 엔진 — SDD

- **접근:** 8개 명령(receive, split, reserve, cancel, consume, discard, move, transferCustody)을 TypeScript 클로저로 구현. 각 명령은 eventId 재전송 체크 → 입력 검증 → 원자성 트랜잭션 → 상태 수정 → 이벤트 기록 순서로 처리. 메모리 상태: Map<sampleId, Sample>, Map<reservationId, Reservation>, Map<eventId, Record>, seq 카운터.

- **대안·트레이드오프:**
  - 이벤트 저장 시 전체 snapshot 저장 vs args만 저장 → args만 선택 (replaying은 범위 밖)
  - 상태를 enum vs string → types.ts 준수(string)
  - 분취 실패 시 롤백 vs 검사 선행 → 선행 검사로 메모리 수정 전 완료

- **검증 계획:**
  - 단위 테스트: 불변식 I1~I11 각각에 테스트 케이스
  - 공개 예시 4가지: 테스트로 실행 (prd.md의 예시 1~4)
  - `pnpm check`: build, lint, test 모두 통과

## 아키텍처

```
createLab(catalog)
  ↓
  Lab { samples, reservations, eventIdMap, seq }
  
각 명령(receive, split, reserve, cancel, consume, discard, move, transferCustody)
  1. eventId 중복 체크 (R7-1)
  2. 입력 검증 (R1~R6)
  3. 트랜잭션 시뮬레이션 (모두 성공 또는 모두 실패)
  4. 상태 수정 + 이벤트 기록
  5. Receipt 반환 { eventId, seq }
```

## 데이터 구조

### Lab의 상태
```typescript
{
  samples: Map<ID, Sample>  // sampleId → {remaining, reserved, consumedQty, discardedQty, status, containerId, custodianId, parentId, rootId}
  reservations: Map<ID, Reservation>  // reservationId → {sampleId, qty, status}
  eventIdMap: Map<ID, {op, args, seq}>  // 이미 성공한 eventId 기록
  seq: number  // 다음 이벤트의 시퀀스 번호
  catalog: Catalog  // locationIds, custodianIds, containers
}
```

## 명령별 처리

### receive(eventId, {sampleId, containerId, custodianId, qty})
**검사**: qty 범위(1~1M), sampleId 신규, containerId/custodianId 존재, 용기 비어있음, qty ≤ 용량
**효과**: RootSample 생성 (parentId null, rootId=sampleId), 용기 점유, seq++

### split(eventId, parentId, children[])
**검사**: 
- 부모 있음·ACTIVE
- 자식 각각: sampleId 신규·서로 다름, containerId 존재, 시작 시점에 비어있고 서로 다름, qty ≤ 용량
- 합 ≤ 부모.available (I3)
**효과**: 
- 각 자식 ChildSample 생성 (parentId=부모, rootId=부모.rootId, custodianId=부모.custodianId)
- 부모.remaining -= 합
- 부모.remaining==0 → DEPLETED, 끝난 시료는 containerId null
- 원자성: 하나라도 실패하면 모두 실패

### reserve(eventId, {reservationId, sampleId, qty})
**검사**: qty 범위, reservationId 신규, 시료 있음·ACTIVE, qty ≤ 시료.available
**효과**: 예약 생성, 시료.reserved += qty

### cancel(eventId, reservationId)
**검사**: 예약 있음·ACTIVE
**효과**: 예약.status = CANCELED, 시료.reserved -= qty

### consume(eventId, reservationId)
**검사**: 예약 있음·ACTIVE
**효과**: 
- 예약.status = CONSUMED
- 시료.remaining -= qty, 시료.reserved -= qty, 시료.consumedQty += qty
- 시료.remaining==0 → DEPLETED

### discard(eventId, sampleId)
**검사**: 시료 있음·ACTIVE, ACTIVE 예약 없음
**효과**: 
- 시료.discardedQty += remaining
- 시료.remaining = 0, 시료.status = DISCARDED
- 용기 비움 (containerId = null)

### move(eventId, sampleId, targetContainerId)
**검사**: 시료 있음·ACTIVE, 용기 있음·비어있음, remaining ≤ 용량
**효과**: 시료.containerId = targetContainerId (양·예약·계보·책임자 그대로)

### transferCustody(eventId, sampleId, custodianId)
**검사**: 시료 있음·ACTIVE, 책임자 있음
**효과**: 시료.custodianId = custodianId

## 공유 검사 로직

### eventId 중복 체크 (R7)
```
if (eventIdMap[eventId]이 있으면) {
  if (args와 op이 같으면) return 처음 Receipt
  else return EVENT_CONFLICT
}
```

### 용기 차 있음 체크
- "명령 시작 시점에 비어있음" = 명령 직전 snapshot의 ACTIVE 시료가 없음
- 분취는 부모 용기도 "차 있는 용기"로 간주

### 이용 가능량 계산
```
available = remaining - reserved  // I3
```

## 이력 기록 (R8)

성공한 명령마다:
```json
{
  "seq": seq,
  "eventId": eventId,
  "op": "명령명",
  "args": {  // eventId 제외한 입력값 그대로 (복사본)
    "key": "value"
  }
}
```

배열 순서는 구별, 객체 키 순서는 무시 (R7-3)

## 가변성 확인표

| 항목 | receive | split | reserve | cancel | consume | discard | move | transferCustody |
|------|---------|-------|---------|--------|---------|---------|------|-----------------|
| remaining | ✓ | ✓ | - | - | ✓ | ✓ | - | - |
| reserved | - | - | ✓ | ✓ | ✓ | - | - | - |
| containerId | ✓ | ✓ | - | - | - | ✓ | ✓ | - |
| custodianId | ✓ | ✓ | - | - | - | - | - | ✓ |
| parentId, rootId | - | - | - | - | - | - | - | - |
| status | ✓ | ✓ | - | - | ✓ | ✓ | - | - |
| consumedQty | - | - | - | - | ✓ | - | - | - |
| discardedQty | - | - | - | - | - | ✓ | - | - |

## 불변식 검사 (I1~I11)

**구현 후 단위 테스트에서 검증 대상**:
- I1: 계보 수량 보존
- I2: 용기 점유 (ACTIVE는 최대 1, 끝난 시료는 null)
- I3: remaining ≤ 용량, 0 ≤ reserved ≤ remaining
- I4: reserved == ACTIVE 예약 합
- I5: 끝난 시료·예약은 ACTIVE 안 됨
- I6: 계보는 불변
- I7: seq = 이벤트 수
- I8: 실패 후 상태 복구
- I9: eventId 재전송 처리
- I10: ID는 종류별 고유, 한 번 쓰면 못 씀
- I11: 이력의 args는 명령 시점의 값
