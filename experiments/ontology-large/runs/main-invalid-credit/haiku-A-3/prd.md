# 0040 — 시료 보관 엔진: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1

## 1. 개요

기존 시료 보관 엔진(`src/lab/`)의 기본 기능(받기·분취·폐기·이동·예약)을 유지하면서 네 가지 새 기능을 추가한다:
1. **격리** (quality.md): 시료의 품질 검사 중 사용 금지
2. **보관 등급** (storage.md): 용기의 지원 등급 대비 시료 요구 등급 검사
3. **예약 만료** (reservations.md): 논리 시각 진행 및 만료된 예약 자동 상태 전환
4. **운송** (transit.md): 시료를 다른 용기로 옮기는 2단계 절차

## 2. 공개 계약

`src/lab/types.ts`는 수정하지 않는다. 새 메서드와 필드는 이미 타입에 정의돼 있다:
- `Lab.quarantine(eventId, sampleId): Result<Receipt>`
- `Lab.release(eventId, sampleId): Result<Receipt>`
- `Lab.advanceTime(eventId, to): Result<Receipt>`
- `Lab.startTransit(eventId, input): Result<Receipt>`
- `Lab.confirmArrival(eventId, transitId): Result<Receipt>`
- `Lab.cancelTransit(eventId, transitId): Result<Receipt>`
- `SampleView.quarantined: boolean`
- `ReservationView.expiresAt: Tick | null`
- `TransitView`와 `TransitStatus`, `ReservationStatus`의 `EXPIRED` 상태

## 3. 요구사항

### 3.1 격리 (quality.md)

- `quarantine`·`release`는 ACTIVE 시료의 격리 여부만 설정. 이미 같은 값이어도 성공.
- 격리된 시료는 분취·새 예약·예약 소비 불가 → `QUARANTINED`.
- 격리는 이미 있는 예약을 건드리지 않음 (상태·양·만료 시각 그대로).
- 격리 중에도 허용: 예약 취소, 이동, 폐기, 책임자 변경, 운송.

### 3.2 보관 등급 (storage.md)

- 시료 받을 때 요구 보관 등급 설정. 용기마다 지원 등급 목록.
- 적합성: 등급 사이 대체·상하 관계 없음. 지원 목록에 요구 등급이 정확히 있어야 함.
- 적용 범위: receive·split·move·startTransit에서 목적 용기 검사 → `STORAGE_INCOMPATIBLE`.
- 시료의 요구 등급은 만들어진 뒤 바뀌지 않음.
- 분취 자식은 부모의 요구 등급을 상속 (현재 하드코딩된 "AMBIENT" 제거).

### 3.3 예약 만료 (reservations.md)

- 논리 시각은 0에서 시작. `advanceTime(eventId, to)`는 현재 이상의 유효한 절대 시각을 받음. 과거면 `INVALID_INPUT`.
- 새 예약의 만료 시각은 기한 없음(null) 또는 현재보다 미래인 유효 시각. 아니면 `INVALID_INPUT`.
- 시각 진행 후 만료된 ACTIVE 예약(`expiresAt <= now`)은 자동 `EXPIRED` → 예약 양 풀림.
- 만료는 실제 남은 양·소비량·폐기량 변경 없음. 만료된 예약 기록은 남고, 그 뒤 cancel·consume은 `RESERVATION_CLOSED`.

### 3.4 운송 (transit.md)

- `startTransit`: ACTIVE 시료의 운송을 고유한 운송 ID로 시작. 목적 용기 용량·보관 등급 검사.
- 운송 중: 시료는 출발 용기 점유 유지, 목적 용기는 배타적 확보. 확보된 용기는 다른 받기·분취·이동과 다른 운송 불가(`CONTAINER_OCCUPIED`).
- `confirmArrival`: 도착 확정 → 시료를 목적 용기로 이동, 운송 상태 `ARRIVED`.
- `cancelTransit`: 취소 → 시료 출발 용기에 유지, 운송 상태 `CANCELED`, 목적 용기 확보 해제.
- 운송 중 금지(`IN_TRANSIT`): 분취, 소비, 폐기, 직접 이동, 추가 운송.
- 운송 중 허용: 새 예약, 예약 취소, 책임자 변경, 격리·해제, 시각 진행.

## 4. 기존 계약 준수

다음 문서의 규칙이 새 명령에도 적용된다:
- `docs/engine.md`: E1~E6 (참조·수용·계보·상태·용기·재전송·원자성·이력)
- `docs/quality.md`: 격리 규칙
- `docs/storage.md`: 보관 등급 규칙
- `docs/reservations.md`: 예약·시각 규칙
- `docs/transit.md`: 운송 규칙
- `src/lab/` 각 모듈의 정책 주석

## 5. 구현 범위

- **수정 대상**: `src/lab/` 내 모듈들 (quality.ts, reservations.ts, transit.ts 추가 구현, samples.ts의 임시 등급값 제거, 기타 보관 등급 검사 추가)
- **금지**: `src/lab/types.ts` 수정, 실제 시계·외부 저장소·동시 호출 추가
- **기록**: 과정은 `trace.md`에, 학습·발견은 `LEARNINGS.md`에

## 6. 완료 기준

- `pnpm check`가 PASS (타입 검사, 테스트 통과)
- 모든 메서드 구현 완료 및 정책 준수 확인
- 기존 기능 회귀 없음

## Acceptance

- [x] `quarantine`, `release` 구현: ACTIVE 시료의 격리 여부 설정, 이미 같은 값이어도 성공
- [x] 격리 중 명령 거절: 분취·새 예약·예약 소비 시 `QUARANTINED` 반환
- [x] 보관 등급 검사: `receive`, `split`, `move`, `startTransit`에서 용기가 시료 등급 지원 여부 확인
- [x] 등급 미지원 시 `STORAGE_INCOMPATIBLE` 반환
- [x] `advanceTime` 구현: 논리 시각 진행, 만료된 ACTIVE 예약을 `EXPIRED`로 전환
- [x] 예약 시 만료 시각이 현재 이상 유효 시각이어야 함 (아니면 `INVALID_INPUT`)
- [x] `startTransit` 구현: 운송 시작, 목적 용기 용량·등급 검사, 목적 용기 배타적 확보
- [x] `confirmArrival` 구현: 도착 확정, 시료를 목적 용기로 이동, 운송 상태 `ARRIVED`
- [x] `cancelTransit` 구현: 취소, 시료 출발 용기 유지, 운송 상태 `CANCELED`, 목적 용기 확보 해제
- [x] 운송 중 금지 명령(`split`, `consume`, `discard`, `move`, 추가 운송): `IN_TRANSIT` 반환
- [x] 기존 기능(`receive`, `split`, `reserve`, `cancel`, `consume`, `discard`, `move`, `transferCustody`) 회귀 테스트 통과

## 애매한 곳·가정

- 만료 판정 경계: `expiresAt <= now`에서 만료 (요청의 "시각이 만료 시각과 정확히 같아지는 순간에도 만료"에 따름)
- 운송 중 허용 명령: 예약 관련, 책임자 변경, 격리·해제, 시각 진행은 허용하되 각 명령의 다른 제한은 그대로 적용 (운송 중이더라도 격리된 시료의 새 예약은 거절)
- 여러 예약 동시 만료: 하나의 `advanceTime` 이벤트로 처리, 각 예약의 status는 `EXPIRED`로 변경
- 분취 자식의 보관 등급: 부모 시료의 등급을 상속받음 (호출자 지정 불가)
- ID 유일성: 시료·예약·운송 ID는 종류별로 따로 유일함 (예: 같은 문자열이 sampleId와 transitId로 동시 사용 가능)
