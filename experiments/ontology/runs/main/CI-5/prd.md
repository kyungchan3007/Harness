# 0040 — 연구실 시료 보관 엔진 — PRD

## 개요

- **이슈:** #1
가상의 연구실에서 시료(액체)를 받아들이고, 나눠 담고, 예약하고, 쓰고, 버리고, 옮기는 일을 기록하는 메모리 엔진.
- 메모리 안에서만 동작 (저장소·동시 실행·실제 시각 미처리)
- 명령의 실패는 예외가 아니라 `{ ok: false, code }` 응답
- 모든 명령은 idempotency를 위해 eventId를 첫 인자로 받음

## 완료 조건
1. `src/lab/lab.ts`에 `createLab(catalog: Catalog): Lab`을 구현
2. `src/lab/types.ts` 계약을 정확히 따른다 (타입 수정 금지)
3. 모든 규칙(R1~R8) 준수:
   - R1: 참조·수용 (존재하지 않는 대상 검사)
   - R2: 계보·수량 보존 (split의 원자성, 불변식 I1)
   - R3: 예약·소비 (available 계산, reserve/cancel/consume 상태)
   - R4: 상태·폐기 (ACTIVE/DEPLETED/DISCARDED, 끝난 시료 처리)
   - R5: 용기·장소 (move의 검증, 자식 분취 시 용기 중복 확인)
   - R6: 보관 책임 (custodianId 관리)
   - R7: 같은 명령 다시 보내기 (idempotency)
   - R8: 원자성·이력 (실패 시 상태 변화 없음, EventView 기록)
4. 모든 불변식(I1~I11) 만족
5. `pnpm check` PASS

## 공개 API
```typescript
interface Lab {
  receive(eventId: ID, input: ReceiveInput): Result<Receipt>
  split(eventId: ID, parentId: ID, children: SplitChild[]): Result<Receipt>
  reserve(eventId: ID, input: ReserveInput): Result<Receipt>
  cancel(eventId: ID, reservationId: ID): Result<Receipt>
  consume(eventId: ID, reservationId: ID): Result<Receipt>
  discard(eventId: ID, sampleId: ID): Result<Receipt>
  move(eventId: ID, sampleId: ID, targetContainerId: ID): Result<Receipt>
  transferCustody(eventId: ID, sampleId: ID, custodianId: ID): Result<Receipt>
  snapshot(): Snapshot
}
```

## 데이터 모델
- **Location**: 용기가 놓인 물리적 위치 (catalog에서 제공)
- **Container**: 시료를 담는 그릇 (1:1 Location, 용량 고정, catalog에서 제공)
- **Custodian**: 시료를 관리하는 주체 (catalog에서 제공)
- **Sample**: 용기에 담긴 액체 (qty는 정수 μL)
  - RootSample: receive로 만든 시료 (parentId=null)
  - ChildSample: split으로 만든 시료 (parentId=부모)
- **Reservation**: 시료의 일정량을 쓰겠다고 잡아 둔 것
- **Event**: 성공한 명령 하나의 기록 (seq, op, args)

## 주요 규칙 요약
1. **수량 보존 (I1)**: 계보마다 `receive 양 = Σ(remaining + consumedQty + discardedQty)`
2. **용기 1:1 (I2)**: ACTIVE 시료는 정확히 하나의 용기, 용기 하나에는 ACTIVE 시료 최대 하나
3. **상태 기계**: ACTIVE → (DEPLETED|DISCARDED) → 끝남 (되살릴 수 없음)
4. **Available**: `available = remaining - reserved` (저장하지 않음, 계산됨)
5. **Idempotency (R7)**: 같은 eventId·같은 op·같은 args = 첫 Receipt 반환, 상태 변화 없음
6. **원자성 (R8)**: split도 모든 자식이 성공하거나 모두 실패
7. **이력 불변**: EventView.args는 명령 시점의 값 (후속 변경에 영향 없음)

## 오류 코드 (14가지)
- INVALID_INPUT: qty 범위 외, 자식 목록 비어 있음
- UNKNOWN_SAMPLE|CONTAINER|CUSTODIAN|RESERVATION: 카탈로그·이력에 없음
- ID_TAKEN: 종류별로 한 번 쓴 ID 재사용
- CONTAINER_OCCUPIED: 비지 않은 용기에 시료 추가
- CAPACITY_EXCEEDED: remaining이 용기 용량 초과
- INSUFFICIENT: available < 요청 qty (split/reserve)
- NOT_ACTIVE: 끝난 시료에 작업 시도
- RESERVATION_CLOSED: 끝난 예약에 cancel/consume 시도
- HAS_RESERVATION: discard 전 ACTIVE 예약이 남음
- EVENT_CONFLICT: 같은 eventId로 다른 명령/인자 전달

## 입출력 예시
### 예1: 예약과 소비
```
receive(id1, { sampleId: S1, containerId: C1, custodianId: U1, qty: 100 })
→ S1 100(remaining), 0(reserved), ACTIVE, C1

reserve(id2, { reservationId: R1, sampleId: S1, qty: 40 })
→ R1 ACTIVE, S1 reserved += 40 → 40
→ available = 100 - 40 = 60

consume(id3, R1)
→ R1 CONSUMED, S1 remaining 60, reserved 0, consumedQty += 40
```

### 예2: 원자성 (실패 시 모두 실패)
```
receive(id, { sampleId: S1, containerId: C1, custodianId: U1, qty: 100 })
split(id2, S1, [
  { sampleId: S2, containerId: C2, qty: 30 },
  { sampleId: S3, containerId: C3_occupied, qty: 40 }  ← C3가 차 있음
])
→ CONTAINER_OCCUPIED
→ S1은 여전히 100(ACTIVE, C1), S2·S3은 존재하지 않음
```

## 경계
- **메모리만**: 스냅샷 외에 영속성 미제공
- **순차 처리**: 동시성·lock 미지원
- **실제 시각 미사용**: receive 시 "지금"이 아니라 이미 정해진 catalog만 씀
- **사이드이펙트 없음**: 로그·이메일·외부 API 호출 없음

## Acceptance
- [x] `src/lab/lab.ts`에 `createLab(catalog): Lab` 구현
- [x] 모든 8개 메서드 구현 (receive, split, reserve, cancel, consume, discard, move, transferCustody)
- [x] 14개 오류 코드 정확히 처리
- [x] 불변식 8개 만족 (I1, I2, I3, I4, I5, I6, I7, I8)
- [x] Idempotency (같은 eventId 재전송)
- [x] 원자성 (split의 모든 자식이 성공하거나 모두 실패)
- [x] `pnpm check` PASS

## 애매한 곳·가정
- **args 복사 방식**: JSON.parse(JSON.stringify) 사용 (가정: 함수·undefined 없음, plain object·array·primitive만)
- **eventId 형식**: 문자열 ID (가정: 자유형식, 중복만 피함)
- **예약 부분 소비 미지원**: R3-4 규칙에 명시 — 전체 또는 없음 (가정)
- **분취 시 부모 상태**: split으로 remaining 0이 되면 즉시 DEPLETED (가정: 나중에 비로소 DEPLETED 아님)
- **containerId 재사용**: 끝난 시료가 용기를 비우면 그 용기는 즉시 다시 쓸 수 있음 (가정)
