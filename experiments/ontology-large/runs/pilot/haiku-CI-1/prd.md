# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1

## 요약

기존 시료 보관 엔진(`src/lab/`)의 핵심 기능(받기·분취·폐기·이동·예약·취소·소비)을 온전히 유지하면서, 네 가지 새로운 기능을 추가합니다:
1. **격리**: 시료를 품질 확인이 끝날 때까지 쓰지 못하게 묶기
2. **보관 등급**: 시료의 요구 등급과 용기의 지원 등급 적합성 검사
3. **예약 만료**: 논리 시각 진행으로 기한이 지난 예약 자동 종료
4. **운송**: 시료를 다른 용기로 옮기는 2단계 절차

## 요구사항

### 1. 격리 (docs/quality.md)

**메서드**: `quarantine(eventId, sampleId)`, `release(eventId, sampleId)`

- ACTIVE 시료의 격리 여부를 설정합니다
- 이미 그 상태여도 성공합니다
- 격리된 시료는:
  - 분취 불가 (`QUARANTINED`)
  - 새 예약 불가 (`QUARANTINED`)
  - 예약 소비 불가 (`QUARANTINED`)
- 격리는 기존 예약·양·상태를 바꾸지 않습니다
- 격리는 예약 취소·이동·폐기·책임자 변경·운송을 막지 않습니다

### 2. 보관 등급 (docs/storage.md)

**필드**: `SampleView.storageGrade`, `Catalog.containers[].supportedGrades`

- 받기 시 시료의 요구 등급(`storageGrade`) 지정
- 각 용기는 지원 등급 목록(`supportedGrades`)을 가짐
- 적합성: 용기의 목록에 시료의 등급이 **정확히** 들어 있어야 함
  - 등급 사이에 상하 관계 없음 (예: FROZEN 용기는 CHILLED를 지원하지 않음)
- 검사 위치: 받기, 분취 자식 용기, 이동, 운송 목적지
  - 맞지 않으면 `STORAGE_INCOMPATIBLE`
- 시료의 등급은 생성 후 절대 바뀌지 않습니다
- 분취 자식은 부모의 등급을 상속받습니다

### 3. 예약 만료 (docs/reservations.md)

**메서드**: `advanceTime(eventId, to)`

- 논리 시각은 0에서 시작, `advanceTime`으로만 진행
- `advanceTime(eventId, to)`: 현재 이상인 유효한 절대 시각으로 진행
  - 과거 시각은 `INVALID_INPUT`
  - 유효한 정수여야 함
- 새 예약의 `expiresAt`:
  - `null` (기한 없음) 또는
  - 현재보다 미래인 유효 정수
  - 아니면 `INVALID_INPUT`
- 시각 진행 시:
  - `expiresAt <= now`인 ACTIVE 예약은 모두 `EXPIRED`
  - 만료는 예약 양만 풀어줌 (남은 양·소비량·폐기량 불변)
  - 한 번에 여러 예약이 만료되어도 이벤트는 하나
- 만료된 예약에 `cancel`·`consume`하면 `RESERVATION_CLOSED`

### 4. 운송 (docs/transit.md)

**메서드**: `startTransit(eventId, input)`, `confirmArrival(eventId, transitId)`, `cancelTransit(eventId, transitId)`

**상태 정의**:
- `TransitView`: `{ transitId, sampleId, sourceContainerId, targetContainerId, status }`
- `status`: `ACTIVE` → `ARRIVED` 또는 `CANCELED`

**startTransit**: 운송 시작
- 고유한 운송 ID로 식별
- ACTIVE 시료만 가능
- 목적 용기: 존재하고 비어 있고 다른 운송의 목적지가 아니어야 함
- 보관 등급 적합성 검사 필요
- 성공하면:
  - 운송 상태: `ACTIVE`
  - 출발 용기: 시료가 계속 점유
  - 목적 용기: 배타적으로 확보 (다른 시료 못 씀)

**confirmArrival**: 도착 확정
- ACTIVE 운송만 가능
- 시료를 목적 용기로 옮김 (출발 용기 비움)
- 운송 상태: `ARRIVED`
- 시료의 양·계보·책임자·등급·격리는 불변

**cancelTransit**: 운송 취소
- ACTIVE 운송만 가능
- 시료는 출발 용기에 그대로
- 운송 상태: `CANCELED`
- 목적 용기 확보 해제
- 시료의 모든 속성 불변

**운송 중 명령 제약**:
- 금지 (`IN_TRANSIT`): 분취, 소비, 폐기, 이동, 추가 운송
- 허용: 새 예약, 예약 취소, 책임자 변경, 격리, 시각 진행

## 기존 계약 준수

구현은 다음을 따릅니다:
- `docs/engine.md` (E1-E6): 참조·수용, 계보·수량, 상태·폐기, 용기·장소, 재전송, 원자성
- `docs/quality.md`: 격리와 생애 상태의 분리, 격리가 막지 않는 명령
- `docs/storage.md`: 등급 적합성 규칙
- `docs/reservations.md`: 이용 가능량, 만료, 격리 중 예약
- `docs/transit.md`: 점유·확보, 운송 중 명령

## 성공 조건

1. 모든 메서드가 구현됨
2. 모든 검사(격리, 등급, 만료, 운송 중)가 올바른 오류 코드를 돌려줌
3. 모든 상태 변화가 규칙을 따름
4. 기존 기능(받기·분취·예약 기본)이 완전히 작동
5. `pnpm check` 통과

## 변경 제외

- `src/lab/types.ts`: 수정 금지 (공개 계약)
- 실제 시계·외부 저장소·동시 호출: 범위 밖

## Acceptance

- [x] 격리: `quarantine`·`release` 메서드 구현 및 테스트
- [x] 보관 등급: 모든 명령에서 등급 검사 및 상속
- [x] 예약 만료: `advanceTime` 구현 및 만료 처리
- [x] 운송: 3단계 메서드 구현 및 점유 관리
- [x] 모든 기존 기능 유지
- [x] `pnpm check` 통과

## 애매한 곳·가정

- **목적 용기 확보 관리**: `State.transitTargets` 맵 추가 (운송 ID → 목적 용기 ID) (가정)
- **expiresAt 경계 조건**: `expiresAt <= now`일 때 만료 (포함) (가정)
- **점유 관리**: 운송 목적 용기도 `occupied` 대상이 아니라 별도 추적 (명확성) (가정)
