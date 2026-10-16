# 0040 — 연구실 시료 보관 엔진 — PRD

- **이슈:** #1

## 목표
가상의 연구실에서 시료(액체)를 받아들이고, 나눠 담고, 예약하고, 쓰고, 버리고, 옮기는 일을 기록하는 엔진을 구현한다.

## 범위
- 메모리 안에서 한 번에 한 호출씩만 처리
- 저장소, 동시 실행, 실제 시각은 다루지 않음
- 실패는 예외가 아닌 `{ ok: false, code }` 형태로 반환

## 요구사항

### 대상(Entity)
- **장소(location)**: 용기가 위치한 곳. 초기 목록에만 존재.
- **용기(container)**: 시료를 담는 것. 장소 하나에 고정, 용량(capacity) 지정, 최대 시료 1개.
- **보관 책임자(custodian)**: 시료를 관리하는 사람/팀. 초기 목록에만 존재.
- **시료(sample)**: 용기에 담긴 액체. 양은 정수 μL.
- **예약(reservation)**: 시료의 일정량을 쓰겠다고 잡아 두는 것.
- **이벤트(event)**: 성공한 명령 하나의 기록.

### 명령(Operation)
1. `receive`: 시료를 새로 받아들임
2. `split`: 시료를 여러 자식으로 나눠 담음
3. `reserve`: 시료의 일정량을 예약함
4. `cancel`: 예약을 취소함
5. `consume`: 예약한 양을 다 씀
6. `discard`: 시료를 전부 버림
7. `move`: 시료를 다른 용기로 옮김
8. `transferCustody`: 책임자를 변경함

### 핵심 규칙
- R1: 참조·수용 — 초기 목록에 없는 것 사용 불가, 용기 최대 1개 시료, 용량 초과 불가, ID 중복 불가
- R2: 계보·수량 보존 — receive가 계보 시작, split로 자식 생성, 전체 계보에서 수량 보존
- R3: 예약·소비 — 이용 가능량 = 남은 양 - 예약 양의 합, 예약만 이용 가능량 감소, consume으로만 소비
- R4: 상태·폐기 — ACTIVE/DEPLETED/DISCARDED 상태, 폐기는 ACTIVE 예약이 없어야 함
- R5: 용기·장소 — 이동은 빈 용기로만, 분취 자식도 빈 용기로만 할당
- R6: 보관 책임 — receive 때 정하고, split 자식이 부모 책임자 이어받음, transferCustody로 변경 가능
- R7: 같은 명령 다시 보내기 — 성공한 eventId 재사용시 첫 결과 반환, 다른 명령/인자면 EVENT_CONFLICT
- R8: 원자성·이력 — 성공 시만 seq 증가, 실패면 상태 무변화, 이력은 불변

## 공개 API

```typescript
export interface Lab {
  receive(eventId: ID, input: { sampleId: ID; containerId: ID; custodianId: ID; qty: Qty }): Result<Receipt>;
  split(eventId: ID, parentId: ID, children: Array<{ sampleId: ID; containerId: ID; qty: Qty }>): Result<Receipt>;
  reserve(eventId: ID, input: { reservationId: ID; sampleId: ID; qty: Qty }): Result<Receipt>;
  cancel(eventId: ID, reservationId: ID): Result<Receipt>;
  consume(eventId: ID, reservationId: ID): Result<Receipt>;
  discard(eventId: ID, sampleId: ID): Result<Receipt>;
  move(eventId: ID, sampleId: ID, targetContainerId: ID): Result<Receipt>;
  transferCustody(eventId: ID, sampleId: ID, custodianId: ID): Result<Receipt>;
  snapshot(): Snapshot;
}
```

## 오류 코드
`INVALID_INPUT`, `UNKNOWN_SAMPLE`, `UNKNOWN_RESERVATION`, `UNKNOWN_CONTAINER`, `UNKNOWN_CUSTODIAN`, `ID_TAKEN`, `CONTAINER_OCCUPIED`, `CAPACITY_EXCEEDED`, `INSUFFICIENT`, `NOT_ACTIVE`, `RESERVATION_CLOSED`, `HAS_RESERVATION`, `EVENT_CONFLICT`

## Acceptance
- [x] `pnpm check` 통과
- [x] 모든 8가지 규칙(R1-R8) 준수
- [x] 공개 API 준수
- [x] 예시 5가지 모두 동작 확인

## 애매한 곳·가정
- 용기의 "장소"는 따로 저장하지 않음 — 용기의 locationId로만 추적 (가정)
- split 실패 시 부모의 remaining을 차감하지 않음 — 원자성 (가정)
- eventId 재사용시 명령 인자 비교는 깊은 비교 (객체 키 순서 무시, 배열 순서 구별) (가정)
- DEPLETED·DISCARDED 시료의 용기(containerId)는 null로 설정 (가정)
