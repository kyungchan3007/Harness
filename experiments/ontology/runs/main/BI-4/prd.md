# 0040 — 연구실 시료 보관 엔진 — PRD

- **이슈:** #1

## 1. 요약

연구실에서 액체 시료(sample)를 받아들이고, 나눠 담고, 예약하고, 소비하고, 폐기하고, 옮기고, 책임자를 변경하는 일을 기록하고 추적하는 엔진.

- **범위:** 메모리 내 단일 호출 처리 (저장소·동시 실행·실제 시각 없음)
- **출력:** 코드 `src/lab/lab.ts`에서 `createLab(catalog: Catalog): Lab` 함수
- **계약:** 기존 `src/lab/types.ts` 인터페이스 그대로 사용 (고정)

---

## 2. 도메인 개념

### 정적 카탈로그 (초기화 시 제공)
- **Location (장소):** 용기가 놓인 물리적 위치
- **Container (용기):** 시료를 담는 그릇. 장소 하나에 고정, 용량(capacity) 있음
- **Custodian (보관 책임자):** 시료를 관리하는 주체

### 동적 개체
- **Sample (시료):** 용기에 담긴 액체. 상태(status) = ACTIVE | DEPLETED | DISCARDED
- **Reservation (예약):** 시료의 일정량을 쓰겠다고 잡아 둔 것. 상태 = ACTIVE | CANCELED | CONSUMED
- **Event (이벤트):** 성공한 명령 하나의 기록. 순번(seq) 1부터 증가

### 수량 개념
- **remaining:** 용기에 실제로 남은 양
- **reserved:** 그 시료의 ACTIVE 예약 양의 합
- **available:** remaining − reserved (이용 가능량, 따로 저장하지 않음)
- **consumedQty:** 소비로 사라진 누적량
- **discardedQty:** 폐기로 버린 누적량

---

## 3. 공개 계약 (types.ts)

### 명령 모음 (Lab 인터페이스)
```
receive(eventId, { sampleId, containerId, custodianId, qty }): Result<Receipt>
split(eventId, parentId, children: [{ sampleId, containerId, qty }, ...]): Result<Receipt>
reserve(eventId, { reservationId, sampleId, qty }): Result<Receipt>
cancel(eventId, reservationId): Result<Receipt>
consume(eventId, reservationId): Result<Receipt>
discard(eventId, sampleId): Result<Receipt>
move(eventId, sampleId, targetContainerId): Result<Receipt>
transferCustody(eventId, sampleId, custodianId): Result<Receipt>
snapshot(): Snapshot
```

### 반환값
- 성공: `{ ok: true, value: { eventId, seq } }`
- 실패: `{ ok: false, code: ErrorCode }`

---

## 4. 규칙 (R1~R8)

### R1: 참조·수용
- 장소·용기·책임자는 초기 카탈로그에만 존재
- ACTIVE 시료는 용기 하나에, 용기 하나엔 시료 최대 하나
- remaining ≤ 용기 용량
- sampleId·reservationId는 종류별로 고유하고 재사용 불가
- qty ∈ [1, 1,000,000]

### R2: 계보·수량 보존
- `receive`만 rootId = 자기 자신 (계보 시작)
- `split`은 자식 1개 이상 생성, 자식의 rootId = 부모의 rootId
- 분취 총량 ≤ 부모의 **available** (예약 반영)
- **불변식:** 계보의 시작량 = Σ(remaining + consumedQty + discardedQty)

### R3: 예약·소비
- 예약은 remaining을 줄이지 않고 available을 줄임
- `cancel`: ACTIVE 예약 → CANCELED
- `consume`: ACTIVE 예약의 **양 전체**를 쓰고 → CONSUMED, remaining과 reserved 함께 감소
- 닫힌 예약에 재요청 → `RESERVATION_CLOSED`

### R4: 상태·폐기
- remaining = 0 → DEPLETED (분취·소비로)
- `discard`: ACTIVE 예약 없는 경우만, remaining 전부 폐기
- DEPLETED·DISCARDED는 불가역 (끝난 상태)
- 끝난 시료는 containerId = null

### R5: 용기·장소
- 시료의 장소 = 현재 담긴 용기의 장소 (계산됨)
- `move`: 시료를 다른 용기로 옮김, 양·예약·계보·책임자 불변
- 분취 자식의 용기는 명령 시작에 비어 있고, 자식끼리 다른 용기

### R6: 보관 책임
- `receive`: 책임자 정의
- `split`: 자식이 부모의 책임자 상속
- `transferCustody`: 지정 시료 하나의 책임자만 변경, 부모/자식에게 영향 없음

### R7: 같은 명령 다시 보내기 (멱등성)
- 성공한 eventId + 같은 op·같은 args → 처음 Receipt 반환, 상태 불변
- 같은 eventId + 다른 op·args → `EVENT_CONFLICT`
- 실패한 eventId는 기록되지 않음 (재시도 가능)

### R8: 원자성·이력
- 성공 시 seq += 1, 이벤트 기록
- 실패 시 **모든 상태 불변** (split은 전부 아니면 전무)
- 이력(args)은 명령 시 값을 복사해 저장 (나중 변경 반영 안 함)

---

## Acceptance

- [x] spec 문서 작성 (prd.md, sdd.md, trace.md)
- [x] `src/lab/lab.ts`에서 `createLab(catalog: Catalog): Lab` 구현
- [x] 모든 8개 명령 + `snapshot()` 메서드 구현
- [x] 모든 ErrorCode 처리 (14개)
- [x] R1~R8 규칙 준수 (단위 테스트 커버)
- [x] `pnpm check` PASS
- [x] JOURNAL.md에 완료 기록

---

## 6. 제약

- types.ts는 고정 (변경 금지)
- 저장소·동시 실행 미지원
- 예외 대신 `{ ok: false, code }` 반환

## 애매한 곳·가정

- eventId 형식 제약: UUID 등 구체 형식은 불명 — (가정: 호출자가 유니크성 보장, 문자열 ID만 필수)
- args 비교의 객체 키 순서: JSON.stringify 불가, 명시적 정렬 필요 — (가정: 정렬된 키로 직렬화)
- 호출 순서 보장: 메서드 호출은 순차적 — (가정: 병렬 없음, 명시적 단일 호출 처리)
- 초기화 후 카탈로그 변경: 초기화 이후 catalog 객체 변경 가능성 — (가정: 영향 없음, 내부 복사본 사용)
