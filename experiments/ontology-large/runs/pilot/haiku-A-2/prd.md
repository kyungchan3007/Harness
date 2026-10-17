# 0040 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송

## 목표

기존 시료 보관 엔진의 기능을 그대로 유지하면서 4가지 새로운 기능을 추가한다:
1. **격리** — ACTIVE 시료의 품질 확인 기간 중 사용을 제한
2. **보관 등급** — 시료와 용기 간 보관 호환성 검증
3. **예약 만료** — 시각 진행에 따른 예약 자동 만료
4. **운송** — 2단계 운송 절차 (시작 → 도착 확정/취소)

## 이슈
- **이슈:** #1

## Acceptance

- [x] prd.md 작성 (이 문서)
- [x] sdd.md 작성
- [x] trace.md 생성
- [x] `quarantine`, `release` 메서드 구현
- [x] `advanceTime` 메서드 구현
- [x] `startTransit`, `confirmArrival`, `cancelTransit` 메서드 구현
- [x] 보관 등급 호환성 검증 추가
- [x] 다른 메서드에서 격리/등급/운송 검증 추가
- [x] `pnpm check` 통과
- [x] JOURNAL.md 기록

## 범위

- **포함**: 위 4가지 기능의 완전한 구현. 기존 메서드와 통합되는 새 검증 규칙들.
- **제외**: 실제 시계, 외부 저장소, 동시 호출. 실패는 Result로 처리하고 예외는 없음.

## 주요 제약

1. **공개 계약 변경 금지**: `src/lab/types.ts`는 고치지 않음. 필요한 구현은 `src/lab/` 내부에서만.
2. **기존 기능 유지**: 현재 코드를 그대로 유지. 새 기능은 추가만 하고 기존 로직 수정은 최소화.
3. **문서 먼저**: 모든 구현 전에 사양서(sdd.md)를 작성하고 과정을 trace.md에 기록.

## 애매한 곳·가정

- **운송 목적 용기 확보 추적**: 운송 중 목적 용기가 다른 명령의 대상이 되지 않도록 State의 occupied 맵을 활용한다 (가정)
- **격리 중 예약**: 격리 중에도 예약을 새로 만들 수 있는가? — 불가 (문서의 "분취·새 예약·예약 소비를 할 수 없습니다" 명시) (가정)
- **운송과 예약 만료의 순서**: advanceTime 실행 후 만료된 예약이 있어도 같은 eventId로 endTransit을 호출할 수 있는가 — 가능 (각 명령은 독립적) (가정)
- **분취 시 자식의 보관 등급**: 부모의 등급을 상속한다 (samples.ts 주석 "정책(보관 등급 상속)" 참조) (가정)

## 참고 문서

- [engine.md](../../../../docs/engine.md) — 엔진 공통 계약 (E1~E6)
- [quality.md](../../../../docs/quality.md) — 격리 정책
- [storage.md](../../../../docs/storage.md) — 보관 등급 정책
- [reservations.md](../../../../docs/reservations.md) — 예약 만료 정책
- [transit.md](../../../../docs/transit.md) — 운송 절차 정책
- [types.ts](../../../../src/lab/types.ts) — 공개 계약 (읽기만, 수정 금지)

## 정의

### 격리
- `quarantine` — ACTIVE 시료를 격리 상태로 설정
- `release` — ACTIVE 시료를 격리 해제
- 격리된 시료는 분취, 새 예약, 예약 소비 불가 (→ `QUARANTINED`)
- 이미 있는 예약은 건드리지 않음
- 격리 중에도 예약 취소, 이동, 폐기, 책임자 변경, 운송 시작·도착·취소 가능

### 보관 등급
- 시료 받을 때 `storageGrade` 지정, 용기마다 `supportedGrades` 목록
- 적용: 받기, 분취 자식, 이동, 운송 목적지
- 검사: 용기의 `supportedGrades`에 시료의 `storageGrade`가 정확히 포함되는지만 확인
- 불일치 시 `STORAGE_INCOMPATIBLE` 거절

### 예약 만료
- 논리 시각 0 시작, `advanceTime`으로만 진행 (절대 시각)
- 과거 시각은 `INVALID_INPUT`
- 새 예약의 `expiresAt`: null(기한 없음) 또는 현재보다 미래여야 함. 아니면 `INVALID_INPUT`
- 만료 조건: `expiresAt <= now`인 ACTIVE 예약 → `EXPIRED` 상태 전환
- 만료 시 예약 양만 풀어줌. 실제 남은 양, 소비량, 폐기량은 불변

### 운송
- `startTransit` — ACTIVE 시료의 운송을 고유한 운송 ID로 시작. 목적 용기 확보.
- `confirmArrival` — 도착 확정. 시료를 목적 용기로 이동, 운송 상태 → `ARRIVED`
- `cancelTransit` — 운송 취소. 시료를 출발 용기에 둔 채 상태 → `CANCELED`, 목적 용기 확보 해제
- 운송 중 제한: 분취, 소비, 폐기, 직접 이동, 추가 운송 시작 (→ `IN_TRANSIT`)
- 운송 중 허용: 새 예약, 예약 취소, 책임자 변경, 격리·해제, 시각 진행

## 설계 결정

### 모듈 구조
- 각 기능은 별도 모듈로 구현 (기존 패턴 유지)
- `quality.ts`: 격리 관련 (`quarantine`, `release`)
- `reservations.ts`: 예약 만료 (`advanceTime`)
- `transit.ts`: 운송 절차 (`startTransit`, `confirmArrival`, `cancelTransit`)
- `storage.ts`: 보관 등급 호환성 검증 (기존 구조 확장)

### 상태 관리
- 격리 여부: `SampleView.quarantined` 기존 필드 활용
- 예약 만료: `ReservationView.expiresAt` 기존 필드 활용, `ReservationStatus` 추가 값 "EXPIRED"
- 운송: `TransitView`, `TransitStatus` 기존 타입 활용
- 시각: `State.now`, 기존 필드 활용

### 검증 전략
- 저수준 검증은 각 모듈의 `engine.run()` 콜백에서
- 보관 등급은 `Storage` 클래스의 메서드 활용
- 격리는 해당 기능 메서드에서 검사
- 운송 중 상태는 `State.transits`의 ACTIVE 상태 시료 조회로 검증
