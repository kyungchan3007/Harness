# PRD — 시료 보관 엔진 확장 (0040-lab)

## 개요
기존 시료 보관 엔진(`src/lab/`)에 격리, 보관 등급 검증, 예약 만료, 운송 기능을 추가하는 작업입니다.

## 요구사항

### 1. 격리 (Quarantine)
- **명령:** `quarantine`, `release`
- **정책 문서:** `docs/quality.md`
- **규칙:**
  - ACTIVE 시료에만 적용 (NOT_ACTIVE 거절)
  - 이미 같은 상태여도 성공
  - 격리된 시료: 분취, 새 예약, 예약 소비 → QUARANTINED 거절
  - **기존 예약은 건드리지 않음** (상태·양·만료 시각 유지)
  - **다음 명령은 허용**: 예약 취소, 이동, 폐기, 책임자 변경, 운송 시작·도착·취소
  - 격리 중에 예약 취소 시 예약 양만 풀림

### 2. 보관 등급 (Storage Grade)
- **정책 문서:** `docs/storage.md`
- **규칙:**
  - 시료마다 요구 보관 등급 (`storageGrade`)
  - 용기마다 지원 등급 목록 (`supportedGrades`)
  - 등급: `AMBIENT`, `CHILLED`, `FROZEN` (대체/상하 관계 없음)
  - **적합성: 용기의 지원 목록에 시료의 요구 등급이 정확히 들어 있어야 함**
  - 적용 범위:
    - `receive`: 용기가 시료 등급을 지원하지 않으면 STORAGE_INCOMPATIBLE
    - `split`: 자식 용기들이 시료 등급을 지원하지 않으면 STORAGE_INCOMPATIBLE
    - `move`: 목적 용기가 시료 등급을 지원하지 않으면 STORAGE_INCOMPATIBLE
    - `startTransit`: 목적 용기가 시료 등급을 지원하지 않으면 STORAGE_INCOMPATIBLE
  - **시료의 요구 등급은 만들어진 뒤 어떤 명령으로도 바뀌지 않음**
  - 분취 자식: 부모의 등급을 상속 (구현 주석: `src/lab/samples.ts` line 52-54)

### 3. 예약 만료 (Reservation Expiration)
- **정책 문서:** `docs/reservations.md`
- **명령:** `advanceTime(eventId, to)`
- **규칙:**
  - 논리 시각(`now`) 0에서 시작, `advanceTime`으로만 진행
  - `advanceTime`: 현재 이상의 유효한 절대 시각을 받음 (과거면 INVALID_INPUT)
  - `reserve`: 새 예약의 `expiresAt`는 null(기한 없음) 또는 현재보다 미래의 유효 정수 (아니면 INVALID_INPUT)
  - **만료 판정:** `expiresAt <= now`인 ACTIVE 예약은 모두 EXPIRED
  - 만료 효과:
    - 예약 상태 → EXPIRED
    - 예약 양 풀림 (reserved 감소)
    - 실제 남은 양·소비량·폐기량은 바뀌지 않음
    - **만료된 예약은 기록에 남음** (지워지지 않음)
    - 그 뒤 cancel·consume → RESERVATION_CLOSED
  - 여러 예약이 한 번에 만료돼도 `advanceTime` 이벤트는 하나
  - **격리·운송 중인 시료의 예약도 동일하게 만료** (격리·용기·운송 확보는 바뀌지 않음)

### 4. 운송 (Transit)
- **정책 문서:** `docs/transit.md`
- **명령:** `startTransit`, `confirmArrival`, `cancelTransit`
- **규칙:**
  - 2단계 절차: `startTransit` → `confirmArrival` (도착) 또는 `cancelTransit` (취소)
  - **상태와 점유:**
    - 운송 상태: ACTIVE → ARRIVED 또는 CANCELED
    - 운송 시작 시 시료는 **출발 용기 계속 점유**, **목적 용기 배타적 확보**
    - 확보된 목적 용기: 다른 시료 받기·분취·이동, 다른 운송 목적지로 불가 (CONTAINER_OCCUPIED)
    - 도착 확정: 시료를 목적 용기로 옮김 (출발 용기 빔), 운송 → ARRIVED
    - 취소: 시료를 출발 용기에 둔 채, 운송 → CANCELED, 목적 확보 풀림
    - 도착·취소: 시료의 양·계보·책임자·등급·격리 여부 바뀌지 않음
  - **운송 중 명령:**
    - 금지 (IN_TRANSIT): 분취, 소비, 폐기, 직접 이동, 같은 시료의 추가 운송
    - 허용 (다른 제한 있을 수 있음): 새 예약, 예약 취소, 책임자 변경, 격리·해제, 시각 진행
  - **기록·식별자:**
    - 끝난 운송도 기록과 식별자 남음
    - 운송 ID 재사용 → ID_TAKEN
    - 없는 운송 조작 → UNKNOWN_TRANSIT
    - 끝난 운송에 새 이벤트로 도착·취소 → TRANSIT_CLOSED
    - 같은 성공 이벤트 재전송: 처음 Receipt 반환 (TRANSIT_CLOSED 없음)

## 기존 계약 적용

다음 규칙은 새 명령에도 모두 적용됩니다 (`docs/engine.md`):
- **E1 참조·수용**: 없는 객체 검사, 용기 점유, 용량, ID 재사용 불가
- **E2 계보·수량 보존**: split 시 수량 합산 및 보존 확인
- **E3 상태·폐기**: 상태 전이, 끝난 상태 불변
- **E4 용기·장소·책임**: 이동 등에서 책임자 변경 규칙
- **E5 같은 명령 다시 보내기**: 재전송 판정, eventId 충돌 검사
- **E6 원자성·이력**: 작업 복사본, 전부 성공 또는 전부 실패, 이력 기록

## 공개 계약

`src/lab/types.ts`에 정의된 모든 인터페이스는 변경하지 않습니다:
- Lab 인터페이스의 메서드 시그니처 (이미 완성됨)
- 타입과 에러 코드 정의

## 제약사항

- `src/lab/types.ts`는 고치지 않음 (공개 계약)
- 메모리 안에서 한 번에 한 호출씩 처리 (동시성·실제 시계 없음)
- 실패는 `{ ok: false, code }` (예외 없음)
- 저장소에 적히지 않은 실제 연구실 관행은 추가하지 않음

## 성공 기준

1. `pnpm check` PASS
2. 모든 새 명령과 기존 명령의 상호작용 구현
3. 정책 문서 규칙 준수 확인
