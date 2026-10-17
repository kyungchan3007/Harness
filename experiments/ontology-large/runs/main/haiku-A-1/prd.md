# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1

## 개요

기존 시료 보관 엔진(src/lab/)에 네 가지 기능을 추가한다.
- 품질 확인 동안 시료를 격리하는 기능
- 용기의 보관 조건과 시료의 보관 요구 등급 간 호환성 검사
- 시간 진행에 따른 예약 자동 만료
- 시료를 다른 용기로 운송하는 2단계 절차

## Acceptance

- [x] `pnpm check` PASS (타입·린트·테스트 모두 통과)
- [x] `quarantine`, `release` — 격리/해제 메서드 구현, `QUARANTINED` 제약 적용
- [x] 보관 등급 호환성 검사 — `receive`, `split`, `move`, `startTransit`에 연결
- [x] `advanceTime` — 논리 시각 진행, 예약 자동 만료 처리
- [x] `startTransit`, `confirmArrival`, `cancelTransit` — 운송 2단계 절차, 점유·확보 관리
- [x] 운송 중 명령 제약 — 금지된 명령에 `IN_TRANSIT` 적용

## 기능별 요구사항

### 1. 격리 (Quarantine)

**정책:** `docs/quality.md`

- `quarantine(eventId, sampleId)` — ACTIVE 시료를 격리 상태로 설정
  - 이미 격리됨 → 성공
  - ACTIVE 아님 → `NOT_ACTIVE`
  
- `release(eventId, sampleId)` — 격리 해제
  - 이미 미격리 → 성공
  - ACTIVE 아님 → `NOT_ACTIVE`

- 격리된 시료는 다음 명령 불가: `split`, 새 `reserve`, `consume`
  - 에러 코드: `QUARANTINED`

- 격리 중에도 다음은 가능: 예약 취소, 이동, 폐기, 책임자 변경, 운송(시작·도착·취소)
  - 각 명령의 기존 제한은 그대로 적용

### 2. 보관 등급 호환성 (Storage Grade)

**정책:** `docs/storage.md`

- 시료마다 요구 보관 등급(`storageGrade`, 변경 불가)
- 용기마다 지원 등급 목록(`supportedGrades`)
- 호환성: 용기의 `supportedGrades`에 시료의 `storageGrade`가 정확히 포함되어야 함
  - 대체·상하 관계 없음

- 적용 범위 (불일치 시 `STORAGE_INCOMPATIBLE`):
  - `receive`: 목적 용기
  - `split`: 각 자식 용기
  - `move`: 목적 용기
  - `startTransit`: 목적 용기

- 분취 자식 등급: `samples.ts` 구현 규칙 따름

### 3. 예약 만료 (Reservation Expiration)

**정책:** `docs/reservations.md`

- `advanceTime(eventId, to)` — 논리 시각을 절대값으로 진행
  - 현재 이상 필수, 과거 → `INVALID_INPUT`
  - 첫 호출 후 계속 증가

- 새 예약 검증:
  - `expiresAt` = `null` (기한 없음) 또는 현재보다 미래인 유효 시각
  - 아니면 `INVALID_INPUT`

- 만료 판정: `expiresAt <= now`인 ACTIVE 예약 → `EXPIRED`
  - 만료된 예약: 예약 양 풀기, 실제 남은 양/소비/폐기 미변경
  - 만료된 예약 기록 유지, 추후 `cancel`/`consume` 불가(`RESERVATION_CLOSED`)

- 여러 예약 동시 만료: `advanceTime` 이벤트 하나

### 4. 운송 (Transit)

**정책:** `docs/transit.md`

- `startTransit(eventId, { transitId, sampleId, targetContainerId })` — 운송 시작
  - 유니크 `transitId`, 중복 → `ID_TAKEN`
  - 시료 ACTIVE 필수, 아니면 `NOT_ACTIVE`
  - 목적 용기 호환성 검사 필요 (`STORAGE_INCOMPATIBLE`)
  - 시료가 이미 운송 중 → `IN_TRANSIT`

- 운송 중 상태:
  - 시료: 출발 용기 계속 점유
  - 목적 용기: 배타적 확보 (다른 시료/운송의 목적지 불가, `CONTAINER_OCCUPIED`)

- `confirmArrival(eventId, transitId)` — 도착 확정
  - 시료를 목적 용기로 옮김
  - 운송 상태: `ARRIVED`
  - 시료 양·계보·책임자·보관 등급·격리 여부 미변경

- `cancelTransit(eventId, transitId)` — 운송 취소
  - 시료: 출발 용기 유지
  - 운송 상태: `CANCELED`
  - 목적 용기 확보 해제
  - 시료 양·계보·책임자·보관 등급·격리 여부 미변경

- 운송 중 금지 (에러 코드 `IN_TRANSIT`):
  - `split`, `consume`, `discard`, `move`, 같은 시료 추가 `startTransit`

- 운송 중 허용:
  - 새 `reserve`, `cancel`, `transferCustody`, `quarantine`, `release`, `advanceTime`

- 기록:
  - 끝난 운송 기록 유지, ID 재사용 불가(`ID_TAKEN`)
  - 끝난 운송에 새 이벤트로 도착/취소 → `TRANSIT_CLOSED`

## 제약

- `src/lab/types.ts` 고정 (공개 계약 변경 불가)
- 새로운 메모리 저장소·외부 시스템·실제 시계·동시 호출 없음
- 실패 처리: 예외 아닌 `{ ok: false, code }` 반환
- 기존 계약 준수: `docs/engine.md` 규칙 모두 적용

## 애매한 곳·가정

- **State에 `reserved_by_transit` 필드 추가 필요한가** — 필요함 (가정). 운송 목적 용기 배타적 확보를 추적하려면 `occupied` 외에 별도 맵 필요
- **분취 자식의 보관 등급** — 부모의 `storageGrade` 상속 (가정). 자식끼리 다른 등급 불가
- **시간 역진행** — `INVALID_INPUT` (가정). 과거 시각 불허
- **예약 정확한 만료 시각** — `expiresAt <= now`일 때 만료 (가정). 같은 순간 만료
