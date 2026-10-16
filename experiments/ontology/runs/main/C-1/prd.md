# 0040 — 연구실 시료 보관 엔진 — PRD

- **이슈:** #1

## 한 줄 요약
메모리 내 한 호출씩 처리하는 연구실 시료·용기·예약 관리 엔진. 규칙 기반으로 수량 보존, 계보, 상태, 책임자를 추적합니다.

## Acceptance
- [x] `src/lab/lab.ts`에서 `createLab(catalog: Catalog): Lab` 내보내기
- [x] 8개 규칙 (R1~R8) 구현 완료
- [x] 공개 예시 5개 테스트 통과 (E1~E5)
- [x] `pnpm check` 통과 (171 tests, all rules verified)

## 범위
- **포함:** 메모리 내 상태 관리, 이벤트 로그, 원자성
- **제외:** 저장소, 동시 실행, 실제 시각, 용기 물리 검증

## 규칙 요약

| 규칙 | 핵심 |
|------|------|
| R1 참조·수용 | 입력 목록에 있는 것만 인정, 없으면 오류 코드 반환 |
| R2 계보·수량 보존 | receive로 시작, split은 자식 만듦, 계보 불변, 총량 보존 |
| R3 예약·소비 | 이용 가능량 = 남은 양 − 예약 양, consume은 예약 양 전부 소비 |
| R4 상태·폐기 | ACTIVE→DEPLETED(0) or DISCARDED, 끝나면 용기 비움 |
| R5 용기·장소 | 시료의 장소 = 담긴 용기의 장소, move는 양·계보 보존 |
| R6 보관 책임 | receive·split에서 책임자 설정, transferCustody는 개별 변경 |
| R7 같은 명령 다시 | 성공한 eventId 반복 시 처음 Receipt 반환, 상태 불변 |
| R8 원자성·이력 | 성공 시만 seq+1, 실패 시 아무 변경 없음, args 복사 저장 |

## 공개 예시

### E1: 예약 후 분취
```
S1 100 받음 → S1에 40 예약 → S1에서 S2로 50 분취
결과: S1 남은 양 50·reserved 40(이용 가능량 10), S2 50
```

### E2: 분취로 DEPLETED
```
S1 100 받음 → S2 60, S3 40으로 분취
결과: S1 DEPLETED·용기 비움, S2·S3 ACTIVE
```

### E3: 이동·책임자 변경·소비
```
S1 받음 → 예약 R1 → 다른 용기로 move → U2로 책임자 변경 → R1 consume
결과: 모두 성공, 책임자 U2
```

### E4: 분취 원자성 (실패)
```
S1 100 받음 → 자식: 30(빈 용기), 20(차 있는 용기)로 분취 시도
결과: 실패, S1·용기·자식 모두 불변
```

### E5: 이벤트 중복
```
consume 성공 → 같은 eventId·같은 인자로 다시 consume
결과: 처음 Receipt 그대로, 두 번 소비 안 함
```

## 인터페이스

### 입력 (Catalog)
```typescript
{
  locationIds: ID[],
  custodianIds: ID[],
  containers: [{ containerId, locationId, capacity }, ...]
}
```

### 출력 (Snapshot)
```typescript
{
  samples: [{ sampleId, parentId, rootId, remaining, reserved, 
              consumedQty, discardedQty, status, containerId, custodianId }, ...],
  reservations: [{ reservationId, sampleId, qty, status }, ...],
  events: [{ seq, eventId, op, args }, ...]
}
```

### 메서드
- `receive(eventId, { sampleId, containerId, custodianId, qty }): Result<Receipt>`
- `split(eventId, parentId, [{ sampleId, containerId, qty }, ...]): Result<Receipt>`
- `reserve(eventId, { reservationId, sampleId, qty }): Result<Receipt>`
- `cancel(eventId, reservationId): Result<Receipt>`
- `consume(eventId, reservationId): Result<Receipt>`
- `discard(eventId, sampleId): Result<Receipt>`
- `move(eventId, sampleId, targetContainerId): Result<Receipt>`
- `transferCustody(eventId, sampleId, custodianId): Result<Receipt>`
- `snapshot(): Snapshot`

## 오류 코드 (ErrorCode)
`INVALID_INPUT` | `UNKNOWN_SAMPLE` | `UNKNOWN_RESERVATION` | `UNKNOWN_CONTAINER` | `UNKNOWN_CUSTODIAN` | `ID_TAKEN` | `CONTAINER_OCCUPIED` | `CAPACITY_EXCEEDED` | `INSUFFICIENT` | `NOT_ACTIVE` | `RESERVATION_CLOSED` | `HAS_RESERVATION` | `EVENT_CONFLICT`

## 애매한 곳·가정
- 없음 — 모든 규칙·오류 조건·예시가 요청 원문에 명시됨
