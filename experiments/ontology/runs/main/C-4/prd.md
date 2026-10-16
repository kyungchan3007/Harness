# 0040 — 연구실 시료 보관 엔진 — PRD

- **이슈:** #1

## 목표
실제 연구실 관행과 무관하게, 아래 규칙만 따르는 시료 보관 엔진을 메모리 기반으로 구현한다. 
모든 명령은 단일 호출 처리(동시 실행 X), 성공/실패를 명확히 구분하고, 이벤트 중복 제거(idempotency)를 지원한다.

## 스코프
- **IN SCOPE**
  - 시료(sample) 입수·분취·예약·소비·폐기·이동
  - 보관 책임자(custodian) 변경
  - 용기(container) 배정 및 용량 관리
  - 계보 추적(parentId, rootId)
  - 이벤트 기록 및 상태 스냅샷
  - eventId 중복 제거 (R7)

- **OUT OF SCOPE**
  - 저장소·디스크 연속성
  - 동시 실행·트랜잭션 격리
  - 실제 시각(timestamp) 기록
  - 멀티 테넌트, 권한 관리
  - UI/CLI 인터페이스

## 핵심 엔터티

### 1. 시료(Sample)
- **상태**: ACTIVE → DEPLETED 또는 DISCARDED
- **속성**: 
  - sampleId, parentId(null 또는 부모), rootId(계보 시작)
  - remaining(용기 내 실제 양), reserved(ACTIVE 예약 합)
  - consumedQty, discardedQty, status, containerId, custodianId

### 2. 예약(Reservation)
- **상태**: ACTIVE → CANCELED 또는 CONSUMED
- **속성**: reservationId, sampleId, qty, status
- **이용 가능량**: remaining − reserved
- **예약 후 소비**: remaining과 reserved 모두 감소

### 3. 용기(Container)
- **고정값**: containerId, locationId, capacity
- **상태**: 시료 최대 1개만 보유 가능
- **제약**: ACTIVE 시료만 containerId를 가짐

### 4. 이벤트(Event)
- **seq**: 성공한 새 명령마다 1부터 증가
- **eventId 중복**: 같은 eventId + 같은 명령 + 같은 인자 → 이전 Receipt 그대로 반환
- **원자성**: 다중 자식 split도 모두 성공하거나 모두 실패

## 핵심 규칙(R1~R8)

| 규칙 | 내용 | 오류 |
|------|------|------|
| R1 | 장소·용기·책임자·시료·예약은 init 목록에 있는 것만 가능 | UNKNOWN_* / ID_TAKEN |
| R1 | 용기 1개 = 시료 최대 1개 | CONTAINER_OCCUPIED |
| R1 | 양 ≤ 용량, 양은 1~1,000,000 | CAPACITY_EXCEEDED / INVALID_INPUT |
| R2 | receive만 계보 root 생성; split은 부모→자식 게보 | 자동 |
| R2 | split 자식 양의 합 ≤ 부모의 이용 가능량 | INSUFFICIENT |
| R2 | 계보 보존: 시작 양 = Σ remaining + Σ consumed + Σ discarded | 자동 |
| R3 | 이용 가능량 = remaining − reserved | 자동 |
| R3 | 예약은 이용 가능량만 감소; 소비할 때 remaining 감소 | INSUFFICIENT / RESERVATION_CLOSED |
| R4 | 분취/소비로 남은 양 0 → DEPLETED; discard → DISCARDED | 자동 |
| R4 | 끝난 시료(DEPLETED/DISCARDED)는 용기 비움 | 자동 |
| R5 | move: 빈 용기로만 이동, 용량 ≤ remaining | CONTAINER_OCCUPIED / CAPACITY_EXCEEDED |
| R5 | split: 자식들 용기도 전부 비어있고, 서로 다르고, 부모 용기는 차 있음 | CONTAINER_OCCUPIED |
| R6 | receive에서 custodianId 정함; split에서 자식이 부모의 custodian 상속 | 자동 |
| R6 | transferCustody는 시료 1개만, 예약 중이어도 가능 | NOT_ACTIVE만 검사 |
| R7 | 성공한 eventId 중복 → 이전 Receipt 그대로, 상태 변화 X | 자동 |
| R8 | 새 명령 성공 → seq++, 이벤트 기록 | 자동 |
| R8 | 실패 → 상태·이력 무변화; 실패 eventId 기록 X | 자동 |

## 공개 API

### 구현 위치
- `src/lab/lab.ts` — `createLab(catalog: Catalog): Lab`
- `src/lab/types.ts` — 수정 불가

### 메서드 서명
```typescript
receive(eventId, {sampleId, containerId, custodianId, qty}): Result<Receipt>
split(eventId, parentId, [{sampleId, containerId, qty}, ...]): Result<Receipt>
reserve(eventId, {reservationId, sampleId, qty}): Result<Receipt>
cancel(eventId, reservationId): Result<Receipt>
consume(eventId, reservationId): Result<Receipt>
discard(eventId, sampleId): Result<Receipt>
move(eventId, sampleId, targetContainerId): Result<Receipt>
transferCustody(eventId, sampleId, custodianId): Result<Receipt>
snapshot(): Snapshot
```

## 검증 기준
- ✅ types.ts의 계약 준수(함수 서명, 반환값, 오류 코드)
- ✅ 규칙 R1~R8 정확한 이행
- ✅ 원자성(split 다중 자식도 원자적)
- ✅ eventId 중복 제거 (R7 — 이전 Receipt 정확히 반환)
- ✅ `pnpm check` PASS (타입·테스트·린트)

## 제약
- 호출한 쪽이 넘긴 객체를 나중에 고쳐도 이력은 불변 (args는 받을 때 복사)
- keyOrder는 비교에서 무시, 배열 순서는 구별

## Acceptance
- [x] `src/lab/lab.ts`에 `createLab(catalog: Catalog): Lab` 구현
- [x] `pnpm check` PASS (타입체크, 테스트, 린트)
- [x] 규칙 R1~R8 모두 정확히 이행
- [x] eventId 중복 제거 (R7) 작동 확인

## 애매한 곳·가정
- 없음 — 요청에서 규칙 R1~R8이 명확하게 정해짐
