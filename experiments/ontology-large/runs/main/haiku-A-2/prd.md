# 0040-lab PRD — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송

## 개요

기존 시료 보관 엔진(`src/lab/`)의 기능을 확장하여 **격리·보관 적합성·예약 만료·운송** 기능을 추가합니다. 공개 계약(`src/lab/types.ts`)의 새 필드와 메서드는 이미 정의되어 있으며, 구현만 완성합니다.

### 공개 진입점
- `createLab(catalog: Catalog): Lab` — src/lab/lab.ts

### 제약사항
- `src/lab/types.ts`는 고치지 않음
- 메모리 안에서 한 번에 한 호출씩 처리
- 실제 시계·외부 저장소·동시 호출 다루지 않음
- 실패는 예외가 아니라 `{ ok: false, code }` 형태로 반환

---

## 1. 격리 (quality.md)

**목표:** 시료의 품질 확인이 끝날 때까지 사용을 제한합니다.

### 기능
- `quarantine(eventId, sampleId)` — ACTIVE 시료를 격리 상태로 설정
- `release(eventId, sampleId)` — ACTIVE 시료의 격리 해제
- 이미 같은 상태여도 성공

### 제약
- 격리된 시료에는:
  - 분취(`split`) ✗
  - 새 예약(`reserve`) ✗
  - 예약 소비(`consume`) ✗
  - → `QUARANTINED` 에러 반환
- 격리·해제는 기존 예약을 건드리지 않음
- 격리 중에도 허용:
  - 예약 취소(`cancel`)
  - 이동(`move`)
  - 폐기(`discard`)
  - 책임자 변경(`transferCustody`)
  - 운송 시작·도착·취소

---

## 2. 보관 등급 검사 (storage.md)

**목표:** 시료의 요구 보관 등급과 용기의 지원 등급을 일치시킵니다.

### 정책
- 시료 수신 시 `storageGrade` 설정 → 생애 동안 불변
- 분취 자식은 부모의 등급 상속 (호출자가 지정하지 않음)
- 적합성: 용기의 `supportedGrades` 목록에 시료의 `storageGrade`가 정확히 포함되어야 함
  - 등급 간 대체 관계 없음 (FROZEN 지원 ≠ CHILLED 지원)
  - 맞지 않으면 `STORAGE_INCOMPATIBLE` 에러

### 적용 범위
- 받기(`receive`)
- 분취 자식의 용기(`split`)
- 이동(`move`)
- 운송 목적지(`startTransit`)

---

## 3. 예약 만료 (reservations.md)

**목표:** 논리 시각 진행에 따라 기한이 지난 예약을 자동 종료합니다.

### 기능
- `advanceTime(eventId, to: Tick)` — 현재 이상인 절대 시각으로 진행
  - 과거 시각 입력 → `INVALID_INPUT`
  - 시작값: 0

### 만료 판정
- 조건: `expiresAt <= now` → `EXPIRED` 상태로 변경
  - `expiresAt == now`인 순간에도 만료
- 여러 예약이 한 번에 만료 → `advanceTime` 이벤트는 하나
- 만료는 다음을 변경하지 않음:
  - 실제 남은 양
  - 소비·폐기량
  - 격리 상태
  - 현재 용기
  - 운송 상태

### 예약 입력 검증
- `expiresAt` 값이 다음 중 하나여야 함:
  - `null` (기한 없음)
  - 현재(`now`)보다 미래인 정수
  - → 아니면 `INVALID_INPUT`

---

## 4. 운송 (transit.md)

**목표:** 시료를 다른 용기로 이동하는 2단계 절차를 지원합니다.

### 기능
- `startTransit(eventId, input)` — 운송 시작 (고유한 ID 생성)
- `confirmArrival(eventId, transitId)` — 도착 확정 (목적 용기로 이동)
- `cancelTransit(eventId, transitId)` — 취소 (출발 용기 복원)

### 상태 전이
- `ACTIVE` → `ARRIVED` (도착 확정) 또는 `CANCELED` (취소)

### 점유 및 예약
- 운송 중:
  - 시료: 출발 용기 계속 점유
  - 목적 용기: 배타적으로 확보 → 다른 시료/운송 불가 (`CONTAINER_OCCUPIED`)
- 도착 확정: 시료를 목적 용기로 이동, 운송 상태 `ARRIVED`
- 취소: 시료는 출발 용기에 그대로, 운송 상태 `CANCELED`, 목적 용기 확보 해제

### 운송 중 명령 제한
- 금지 (`IN_TRANSIT`):
  - 분취(`split`)
  - 소비(`consume`)
  - 폐기(`discard`)
  - 직접 이동(`move`)
  - 같은 시료의 추가 운송 시작
- 허용:
  - 새 예약(`reserve`)
  - 예약 취소(`cancel`)
  - 책임자 변경(`transferCustody`)
  - 격리·해제(`quarantine`/`release`)
  - 시각 진행(`advanceTime`)

### 보관 등급 검사
- `startTransit`에서 목적 용기가 시료의 요구 등급을 지원해야 함
- 맞지 않으면 `STORAGE_INCOMPATIBLE` 반환

### 기록 및 식별자
- 끝난 운송도 기록과 ID를 유지
- 운송 ID 재사용 → `ID_TAKEN`
- 없는 운송 조작 → `UNKNOWN_TRANSIT`
- 끝난 운송 재조작 → `TRANSIT_CLOSED`

---

## 5. 기존 계약 (engine.md)

**중요:** 모든 새 명령에 다음 규칙이 적용됩니다.

### E1 참조·수용
- 없는 대상 → 해당 `UNKNOWN_*` 에러
- ACTIVE 상태 검증 → `NOT_ACTIVE` 에러
- ID 중복 → `ID_TAKEN` 에러
- 용기 용량 초과 → `CAPACITY_EXCEEDED` 에러

### E2 계보·수량 보존
- 분취 자식 양 합 ≤ 부모의 이용 가능량 (`remaining - reserved`)
- 초과 → `INSUFFICIENT`

### E3 상태·폐기
- 끝난 상태는 되살릴 수 없음 → `NOT_ACTIVE`
- 격리·예약 만료·운송은 생애 상태(`status`)와 독립

### E5 재전송 판정
- 같은 `eventId`로 같은 명령·인자 → 처음 Receipt 반환 (상태·이력 무변)
- 같은 `eventId`로 다른 명령/인자 → `EVENT_CONFLICT`
- 실패한 `eventId`는 기록되지 않음

### E6 원자성·이력
- 성공한 새 명령마다 이벤트 하나 생성, seq 증가
- 실패하면 상태·예약·운송·이력·eventId 무변
- 여러 자식 분취: 모두 성공 또는 모두 실패

---

## Acceptance

- [ ] 격리 기능 (`quarantine`, `release`)
  - [ ] ACTIVE 시료의 격리·해제 가능
  - [ ] 이미 같은 상태여도 성공 (멱등성)
  - [ ] 격리 중 split, reserve, consume 제한 (QUARANTINED)
  - [ ] 격리 중에도 예약 취소, 이동, 폐기, 책임자 변경, 운송 명령 허용
- [ ] 보관 등급 검사 (`receive`, `split`, `move`, `startTransit`)
  - [ ] 시료 수신 시 용기의 supportedGrades 확인
  - [ ] split 자식 용기들의 등급 확인
  - [ ] move 목적 용기의 등급 확인
  - [ ] startTransit 목적 용기의 등급 확인
  - [ ] 등급 불일치 시 STORAGE_INCOMPATIBLE 반환
- [ ] 예약 만료 (`advanceTime`)
  - [ ] 논리 시각을 미래로 진행 (과거 입력 불가)
  - [ ] expiresAt <= now 인 ACTIVE 예약을 EXPIRED로 변경
  - [ ] 여러 예약 한 번에 만료 시 한 개 이벤트 발생
  - [ ] expiresAt == now 인 순간에도 만료
  - [ ] 예약 입력 검증 (null 또는 현재보다 미래인 정수)
- [ ] 운송 (`startTransit`, `confirmArrival`, `cancelTransit`)
  - [ ] 운송 시작: 고유한 ID, ACTIVE 상태, 목적 용기 배타적 확보
  - [ ] 도착 확정: 시료를 목적 용기로 이동, 상태 ARRIVED
  - [ ] 취소: 시료는 출발 용기 유지, 상태 CANCELED, 목적 용기 해제
  - [ ] 운송 중 split, consume, discard, move, 추가 운송 금지 (IN_TRANSIT)
  - [ ] 목적 용기 보관 등급 검사
  - [ ] 끝난 운송 ID 재사용 불가 (ID_TAKEN), 없는 운송 (UNKNOWN_TRANSIT), 끝난 운송 재조작 (TRANSIT_CLOSED)
- [ ] 정책 준수
  - [ ] E1: 참조·수용 (UNKNOWN_*, NOT_ACTIVE, ID_TAKEN, CAPACITY_EXCEEDED)
  - [ ] E2: 계보·수량 (INSUFFICIENT)
  - [ ] E3: 상태·폐기 (격리·예약 만료·운송은 status와 독립)
  - [ ] E5: 재전송 (같은 eventId 같은 명령 → 첫 Receipt 반환, 다른 명령 → EVENT_CONFLICT)
  - [ ] E6: 원자성·이력 (성공 시 이벤트 생성, 실패 시 무변)
- [ ] `pnpm check` PASS (타입·린트·테스트)

---

## 이슈

- **이슈:** #1

---

## 애매한 곳·가정

- 없음 — SDD 및 정책 문서에서 모두 명확히 정의됨

