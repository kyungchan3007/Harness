# 0040-lab — 연구실 시료 보관 엔진 (PRD)

- **이슈:** #1

## 목표

가상의 연구실에서 시료(액체)를 받아들이고, 나눠 담고, 예약하고, 쓰고, 버리고, 옮기는 일을 기록하는 엔진을 구현한다.

## 범위

- **메모리 기반:** 저장소, 동시 실행, 실제 시각 다루지 않음
- **인메모리:** 한 번에 한 호출씩 처리
- **오류 처리:** 예외 대신 `{ ok: false, code }` 반환
- **공개 계약:** `src/lab/types.ts` 고정 (수정 금지)

## 핵심 개념

### 대상
- **장소(location)·용기(container)·보관 책임자(custodian):** `createLab`에 넘긴 목록에만 존재
- **시료(sample):** 용기에 담긴 액체, 양은 정수 μL
- **예약(reservation):** 시료의 일정량을 쓰겠다고 잡아 두기
- **이벤트(event):** 성공한 명령 기록, eventId 인자 필수

### 8개 규칙 그룹
1. **R1 참조·수용:** ID 유효성, 용기 점유, 용량, ID 유일성, 양 유효성
2. **R2 계보·수량 보존:** receive/split 계보, 수량 보존 불변식
3. **R3 예약·소비:** 이용 가능량, reserve/cancel/consume 상태
4. **R4 상태·폐기:** ACTIVE/DEPLETED/DISCARDED, discard 규칙
5. **R5 용기·장소:** move 규칙, 용기 비우기
6. **R6 보관 책임:** receive/split 책임 승계, transferCustody
7. **R7 같은 명령 다시 보내기:** idempotency via eventId
8. **R8 원자성·이력:** 이벤트 기록, seq, 원자성, 이력 저장

## 공개 인터페이스 (types.ts)

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

## Acceptance

- [ ] `pnpm check` 통과 (타입 검사, 테스트 통과)
- [ ] 모든 8개 규칙 구현 (R1~R8)
- [ ] types.ts 인터페이스 완벽 구현
- [ ] 공개 예시 4개 케이스 검증

## 애매한 곳·가정

- 없음 — 요청에서 8개 규칙을 명확히 정의함

## 일정

- 설계(sdd.md): 2026-10-16
- 구현(lab.ts): 2026-10-16
- 검증(pnpm check): 2026-10-16
