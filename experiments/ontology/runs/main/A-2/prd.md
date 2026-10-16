# 0040 — 연구실 시료 보관 엔진 — PRD

- **이슈:** #1

## 목표

메모리 안에서만 동작하는 연구실 시료(액체) 관리 엔진을 구현한다. 시료의 수취·분취·예약·소비·폐기·이동·보관 책임 변경을 기록하고, 각 작업이 규칙을 따르는지 검사한다.

## Acceptance

- [x] `src/lab/lab.ts`에 `createLab(catalog: Catalog): Lab` 함수 구현
- [x] `src/lab/types.ts`의 계약(Lab 인터페이스, 에러 코드, 상태 타입)은 고정, 수정 금지
- [x] 모든 규칙(R1~R8) 준수 확인 → 테스트로 증명
- [x] `pnpm check` 통과 (타입 체크, linting, 모든 테스트)

## 규칙 요약

### 참조 + 수용 (R1)
- 장소·용기·책임자는 Catalog에 있는 것만 사용 가능
- 용기 하나에는 시료 최대 1개 (ACTIVE 시료)
- 시료 남은 양 ≤ 용기 용량
- ID는 종류마다 고유 (시료 ID ≠ 용기 ID 강제 아님)
- 양은 1 이상 1,000,000 이하 정수

### 계보 + 수량 보존 (R2)
- `receive`만 계보 시작 시료 생성 (parentId=null, rootId=자신)
- `split`으로 부모에서 여러 자식 생성, 자식 양의 합을 부모 이용 가능량에서 차감
- 자식은 부모의 계보 이어받음 (나중에 변하지 않음)
- 계보 전체 수량 보존: 받은 양 = 모든 시료의 남은 양 합 + 소비량 합 + 폐기량 합

### 예약 + 소비 (R3)
- 이용 가능량 = 남은 양 − ACTIVE 예약 양 합계
- 예약은 이용 가능량만 차감 (남은 양 아님)
- `cancel`로 예약 CANCELED화 및 양 복원
- `consume`으로 ACTIVE 예약 **전체** 소비 (남은 양 및 reserved 모두 차감)
- CANCELED·CONSUMED 예약은 닫힘 (다시 조작 불가)

### 상태 + 폐기 (R4)
- 상태: `ACTIVE`·`DEPLETED`·`DISCARDED`
- 남은 양이 0 → `DEPLETED` 자동 전환
- `discard`로 ACTIVE 시료 폐기 (ACTIVE 예약 있으면 실패)
- DEPLETED·DISCARDED는 끝난 상태 (되살릴 수 없음, 용기 비움)
- 부모 상태 변화는 자식에 영향 없음

### 용기 + 장소 (R5)
- 시료의 장소 = 지금 담긴 용기의 장소 (따로 저장 안 함)
- `move`로 다른 용기로 이동 (목표 용기는 비어 있고 용량 충분해야 함)
- 분취 시 각 자식의 용기도 비어 있어야 하고, 자식끼리 중복 불가
- 이동은 양·예약·계보·책임자 변경 없음 (예약 상태와 무관)

### 보관 책임 (R6)
- `receive` 시점에 책임자 지정
- 분취 자식은 부모의 책임자 이어받음
- `transferCustody`로 책임자 변경 (부모·자식 분리, 예약 상태 무관)

### 멱등성 (R7)
- 성공한 eventId로 같은 명령·같은 인자를 다시 보내면 → 처음 Receipt 그대로 반환 (상태 변화 없음)
- 같은 eventId로 다른 명령이나 인자 → `EVENT_CONFLICT`
- 실패한 eventId는 기록 안 됨 (재시도 가능)

### 원자성 + 이력 (R8)
- 성공 시마다 seq 1 증가 (첫 seq=1)
- 실패하면 상태·이력 무변화 (부분 성공 없음)
- 이력은 명령명(op)과 인자(args, eventId 제외)를 받을 때 깊은 복사해서 저장
- args 모양: types.ts `EventView.args` 설명 참조

## 입출력

### receive
```ts
receive(eventId, { sampleId, containerId, custodianId, qty })
→ { ok: true, value: Receipt } | { ok: false, code: ErrorCode }
```

### split
```ts
split(eventId, parentId, children: { sampleId, containerId, qty }[])
```

### reserve / cancel / consume
```ts
reserve(eventId, { reservationId, sampleId, qty })
cancel(eventId, reservationId)
consume(eventId, reservationId)
```

### discard / move / transferCustody
```ts
discard(eventId, sampleId)
move(eventId, sampleId, targetContainerId)
transferCustody(eventId, sampleId, custodianId)
```

### snapshot
```ts
snapshot(): { samples, reservations, events }
```

## 애매한 곳·가정

- 없음 — 요청에서 규칙을 명확하게 제시했음

## 테스트 대상

- 각 명령의 성공 경로
- 각 에러 코드별 발생 조건
- 규칙 간 상호작용 (예: 분취 후 예약 예약, 예약 상태에서 이동)
- 멱등성 (같은 eventId 재시도)
- 계보·수량 보존
- 용기·장소 추적
