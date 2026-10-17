# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1

## 1. 문제 정의

현재 시료 보관 엔진은 기본 명령(receive, split, reserve, cancel, consume, discard, move, transferCustody) 만 지원합니다. 격리, 보관 등급 검증, 예약 만료, 운송 절차가 없어 산업 표준 시료 관리 요구사항을 충족할 수 없습니다.

## 2. 기능 요구사항

### 2.1 품질관리 — 격리 (Quality Management)

- **quarantine(eventId, sampleId)**: ACTIVE 시료를 격리 상태로 설정
  - 격리된 시료는 분취, 새 예약, 예약 소비 불가 (QUARANTINED)
  - 이미 같은 값이어도 성공
  - 기존 예약은 건드리지 않음 (상태·양·만료 그대로)
  - 예약 취소, 이동, 폐기, 책임자 변경, 운송 시작·도착·취소는 허용

- **release(eventId, sampleId)**: ACTIVE 시료 격리 해제
  - quarantine과 동일한 규칙 적용

### 2.2 보관 정책 — 보관 등급 (Storage Policy)

- **storageGrade**: 시료의 요구 보관 등급 (AMBIENT, CHILLED, FROZEN)
- **supportedGrades**: 용기별 지원 등급 목록
- **적합성 검증**: 시료를 용기에 넣을 때마다 요구 등급이 지원 목록에 정확히 있어야 함 (대체·상하 관계 없음)
  - 위반: STORAGE_INCOMPATIBLE
  - 적용 범위: receive, split, move, startTransit
- **불변**: 시료의 요구 등급은 생성 후 바뀌지 않음
- **분취 상속**: 자식 시료는 분취 순간 부모의 보관 등급을 이어받음

### 2.3 예약 운영 — 만료 (Reservation Expiry)

- **expiresAt**: 예약의 만료 시각 (null = 기한 없음)
- **advanceTime(eventId, to)**: 논리 시각을 to로 진행
  - expiresAt ≤ to인 모든 ACTIVE 예약은 EXPIRED로 전환
  - 만료된 예약은 예약 양을 풀지만, 남은 양·소비·폐기는 변경 없음
  - 만료된 예약 기록은 남음
  - advanceTime 이벤트는 하나 (여러 예약이 동시 만료되어도)
  - 논리 시각 범위: [0, Number.MAX_SAFE_INTEGER]
  - INVALID_INPUT: to가 정수가 아니거나 범위 초과 또는 now 미만

### 2.4 운송 절차 (Transit Procedure)

**용어**:
- sourceContainerId: 운송 시작 시점의 시료 담긴 용기
- targetContainerId: 도착할 용기 (운송 중 확보 상태)

**startTransit(eventId, input: {transitId, sampleId, targetContainerId})**
- 전제:
  - 새로운 transitId (끝난 운송 ID 포함 재사용 불가 → ID_TAKEN)
  - 시료 ACTIVE (NOT_ACTIVE)
  - 운송 중이 아님 (IN_TRANSIT)
  - 목적 용기 존재·비어 있음·다른 운송 확보 없음 (CONTAINER_OCCUPIED)
  - 시료 남은 양 ≤ 목적 용기 용량 (CAPACITY_EXCEEDED)
  - 시료 보관 등급이 목적 용기 지원 목록에 있음 (STORAGE_INCOMPATIBLE)
- 효과:
  - ACTIVE 운송 생성
  - 출발 용기 점유 유지, 목적 용기 배타적 확보
  - 격리 여부·양·책임자·등급은 변경 없음

**confirmArrival(eventId, transitId)**
- 전제:
  - 운송 존재 (UNKNOWN_TRANSIT)
  - ACTIVE 상태 (TRANSIT_CLOSED)
- 효과:
  - 시료를 목적 용기로 이동 (출발 용기 비움)
  - 운송 상태 → ARRIVED
  - 목적 용기 확보 해제

**cancelTransit(eventId, transitId)**
- 전제:
  - 운송 존재 (UNKNOWN_TRANSIT)
  - ACTIVE 상태 (TRANSIT_CLOSED)
- 효과:
  - 시료는 출발 용기에 그대로
  - 운송 상태 → CANCELED
  - 목적 용기 확보 해제

**운송 중 명령 제약**:
- 금지 (IN_TRANSIT): split, consume, discard, move, startTransit (같은 시료)
- 허용: reserve, cancel, transferCustody, quarantine, release, advanceTime
- 운송 중 예약도 만료 가능, 격리도 가능

**운송 중 다른 명령 제약**:
- 예약이 있어도 폐기 불가 (기존), 예약 취소는 가능 (기존)
- 이동은 운송 중 명령이 아니므로 IN_TRANSIT
- 격리는 예약 취소 막지 않음 (기존)

## Acceptance

- [x] **공개 계약 준수**
   - `src/lab/types.ts` 인터페이스 그대로 사용
   - 모든 오류 코드 구현: QUARANTINED, STORAGE_INCOMPATIBLE, IN_TRANSIT, UNKNOWN_TRANSIT, TRANSIT_CLOSED
   - 모든 명령 메서드 구현: quarantine, release, advanceTime, startTransit, confirmArrival, cancelTransit
   - SampleView.storageGrade, SampleView.quarantined, ReservationView.expiresAt, Snapshot.now, Snapshot.transits

- [x] **정책 문서 준수**
   - docs/engine.md (E1-E6): 참조·수용·계보·상태·용기·재전송·원자성
   - docs/storage.md: 보관 등급 적합성 (정확 일치, 대체 없음)
   - docs/quality.md: 격리·해제 규칙, 예약 불변, 명령 허용·금지
   - docs/reservations.md: 예약 만료 판정 (expiresAt ≤ now), 기록 유지
   - docs/transit.md: 운송 상태, 점유·확보, 명령 제약, 기록 유지

- [x] **불변식 유지** (ontology.md 참고)
   - I1-I11: 기존 불변식
   - I12: storageGrade는 containerId 용기의 supportedGrades에 정확히 들어 있음
   - I13: expiresAt ≤ now인 ACTIVE 예약 없음
   - I14: ACTIVE 운송의 시료는 ACTIVE이고 출발 용기에, 목적 용기는 비어 있고 다른 운송의 목적지가 아님

- [ ] **테스트 검증**
   - pnpm check PASS (모든 형식, 타입, 로직 검증)
   - 각 명령별 전제·효과 실행
   - 불변식 검증
   - 원자성·재전송 (E5·E6) 검증
   - 경계 조건: expiresAt = now에서 만료, 빈 split, 격리 중 cancel 등

- [x] **문서화**
   - 이벤트 args 형식 준수 (types.ts EventView.args 모양)
   - 모듈별 구현 주석에 정책 출처 명시

## 4. 제약사항

- **공개 계약 변경 불가**: src/lab/types.ts 수정 금지
- **기존 명령 변경 불가**: receive-transferCustody 시그니처·규칙 변경 금지
- **정책 해석 금지**: 정책 문서의 규칙을 설계자가 정할 수 없음, 원문 그대로 이행
- **기존 불변식 위반 금지**: I1-I11 깨짐 불가

## 5. 의존성 및 출처

- 정책: docs/engine.md, docs/storage.md, docs/quality.md, docs/reservations.md, docs/transit.md
- 온톨로지: agents/context/ontology.md
- 공개 계약: src/lab/types.ts
- 기존 구현: src/lab/{samples,reservations,quality,storage,transit,events,state,lab}.ts

## 애매한 곳·가정

- 보관 등급 대체 관계 — 없음 (가정: 정확 일치만, docs/storage.md 규칙)
- 격리 중 cancel — 허용 (가정: 예약 양만 풀림, quality.md 규칙)
- 운송 중 새 예약 — 허용 (가정: split·consume·discard·move·새 운송만 금지, transit.md)
- expiresAt = now 경계 — EXPIRED (가정: expiresAt ≤ now, reservations.md 규칙)
- split 자식 등급 — 부모 상속 (가정: 호출자 지정 불가, samples.ts 주석)
