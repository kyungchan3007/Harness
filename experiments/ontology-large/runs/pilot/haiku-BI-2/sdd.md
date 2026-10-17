# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — SDD

## 1. 아키텍처 개요

기존 모듈 구조 유지, 각 도메인별 책임 명확화:

```
src/lab/
  types.ts              — 공개 계약 (변경 금지)
  state.ts              — 상태 관리 (Snapshot)
  lab.ts                — Lab 인터페이스 구현
  samples.ts            — receive, split 그리고 보관 등급·격리 검증
  reservations.ts       — reserve, cancel, consume 그리고 만료 판정
  quality.ts            — quarantine, release
  storage.ts            — 용기·보관 등급, 운송 목적지 점유
  transit.ts            — startTransit, confirmArrival, cancelTransit
  events.ts             — 이벤트 기록·재전송 (E5·E6)
```

## 2. 모듈별 설계

### 2.1 samples.ts (receive, split, 격리·등급 검증)

**기존 책임**:
- receive: 받을 때 시료 생성, 부모 없음, rootId 자신
- split: 분취 자식 생성, 부모·rootId 상속

**확장**:
- receive에서 storageGrade 인자 받아 저장 (types.ts 계약)
- split에서 자식이 부모의 storageGrade 상속 (samples.ts 주석 규칙)
- split 전제 추가: 부모 격리 상태 검증 (QUARANTINED)
- split 전제 추가: 부모 운송 중 검증 (IN_TRANSIT)
- split에서 자식 용기의 보관 등급 지원 확인 (STORAGE_INCOMPATIBLE)
- receive에서도 용기의 보관 등급 지원 확인 (STORAGE_INCOMPATIBLE)

**출처**: engine.md E2·E4, storage.md, quality.md, transit.md

### 2.2 quality.ts (quarantine, release)

**새 메서드**:
- `quarantine(eventId: ID, sampleId: ID): Result<Receipt>`
  - 전제: 시료 ACTIVE
  - 효과: quarantined = true
  - 이미 true이면 성공 (멱등성)
  - 예약·용기 변경 없음

- `release(eventId: ID, sampleId: ID): Result<Receipt>`
  - 전제: 시료 ACTIVE
  - 효과: quarantined = false
  - 이미 false이면 성공 (멱등성)
  - 예약·용기 변경 없음

**격리 중 명령 제약**:
- split 불가 (새 로직)
- reserve 불가 (새 로직)
- consume 불가 (새 로직)
- cancel 가능 (예약 양만 풀림)
- move, discard, transferCustody, 운송 시작·도착·취소, advanceTime 가능

**출처**: quality.md

### 2.3 reservations.ts (예약 만료)

**기존 책임**:
- reserve: 새 예약, reserved += qty
- cancel: ACTIVE 예약 → CANCELED, reserved −= qty
- consume: ACTIVE 예약 사용

**확장**:
- reserve에서 expiresAt 인자 저장 (types.ts 계약)
- reserve 전제 추가: 시료 격리 검증 (QUARANTINED)
- reserve 전제: expiresAt은 null 또는 now보다 큰 정수 (INVALID_INPUT)
- cancel에 격리 검증 제거 (quality.md: cancel은 허용)
- consume에서 격리 검증 (QUARANTINED)
- consume에서 운송 중 검증 (IN_TRANSIT)

**advanceTime 구현**:
- `advanceTime(eventId: ID, to: Tick): Result<Receipt>`
  - 전제: to는 정수, now ≤ to ≤ MAX_SAFE_INTEGER (INVALID_INPUT)
  - 효과: now = to
  - 만료 판정: expiresAt ≤ now인 모든 ACTIVE 예약 → EXPIRED
  - reserved 업데이트 (만료된 예약은 양 풀림)
  - 이벤트 하나: op="advanceTime", args={to}
  - 여러 예약 동시 만료되어도 이벤트 하나

**출처**: reservations.md, quality.md

### 2.4 storage.ts (보관 등급·용기 점유)

**기존 책임**:
- 용기 정보 관리 (용량, 위치, 책임자)
- 용기 점유 상태 (ACTIVE 시료 containerId)

**확장**:
- containerId 조회 시 ACTIVE 시료만 체크
- 용기 비어 있는지 확인 시 운송 목적 확보도 확인 (transit.ts 규칙)
- 보관 등급 적합성 검증 헬퍼:
  - `isSupportedGrade(containerId: ID, storageGrade: StorageGrade): boolean`
  - 지원 목록에 정확히 있는지 확인 (대체·상하 관계 없음)
- 운송 목적 용기 확보·해제 관리:
  - 한 용기마다 최대 하나의 ACTIVE 운송만 확보 가능
  - 다른 시료 receive/split/move 불가
  - 다른 운송의 목적지 불가

**출처**: storage.md, transit.md

### 2.5 transit.ts (운송 명령)

**새 엔티티**: TransitView (types.ts 계약)
```
transitId: ID
sampleId: ID
sourceContainerId: ID    — 시작 시점 시료 담은 용기
targetContainerId: ID    — 도착 목표 용기
status: TransitStatus    — ACTIVE | ARRIVED | CANCELED
```

**새 메서드**:

1. `startTransit(eventId: ID, input: {transitId, sampleId, targetContainerId}): Result<Receipt>`
   - 전제:
     - transitId 새것 (ID_TAKEN, 끝난 운송 ID 포함)
     - 시료 ACTIVE (NOT_ACTIVE)
     - 같은 시료의 ACTIVE 운송 없음 (IN_TRANSIT)
     - targetContainerId 존재, 비어 있음 (CONTAINER_OCCUPIED)
     - targetContainerId 다른 운송의 목적지가 아님 (CONTAINER_OCCUPIED)
     - remaining ≤ 목적 용기 용량 (CAPACITY_EXCEEDED)
     - storageGrade가 targetContainerId 지원 목록에 정확히 있음 (STORAGE_INCOMPATIBLE)
   - 효과:
     - 운송 생성, status = ACTIVE
     - sourceContainerId = 시료의 현재 containerId (읽기 전용)
     - 목적 용기 배타적 확보 (다른 시료 막음)
     - 시료 containerId 미변경 (도착 전까지)
     - quarantined, qty, custodianId, storageGrade 미변경

2. `confirmArrival(eventId: ID, transitId: ID): Result<Receipt>`
   - 전제:
     - 운송 존재 (UNKNOWN_TRANSIT)
     - ACTIVE (TRANSIT_CLOSED)
   - 효과:
     - 시료의 containerId = targetContainerId
     - 출발 용기 비움
     - 운송 status = ARRIVED
     - 목적 용기 확보 해제
     - quarantined, qty, custodianId, storageGrade, 계보 미변경

3. `cancelTransit(eventId: ID, transitId: ID): Result<Receipt>`
   - 전제:
     - 운송 존재 (UNKNOWN_TRANSIT)
     - ACTIVE (TRANSIT_CLOSED)
   - 효과:
     - 시료는 sourceContainerId에 그대로
     - 운송 status = CANCELED
     - 목적 용기 확보 해제
     - quarantined, qty, custodianId, storageGrade, 계보 미변경

**운송 중 명령 검증**:
- split, consume, discard, move, startTransit(같은 시료) 호출 시 시료 운송 중 확인 (IN_TRANSIT)
- reserve, cancel, transferCustody, quarantine, release는 허용 (각 모듈에서)
- advanceTime은 허용 (예약 만료 포함)

**기록 정책**:
- 끝난 운송도 transits 배열에 유지
- ID 재사용 불가 (ID_TAKEN)

**출처**: transit.md

### 2.6 events.ts (재전송·원자성)

**기존 책임**:
- 이벤트 기록 (seq 증가)
- 재전송 판정 (E5 규칙)

**확장**:
- 새 명령(quarantine, release, advanceTime, startTransit, confirmArrival, cancelTransit) 이벤트 기록
- args 형식 준수 (types.ts EventView.args):
  - quarantine: {sampleId}
  - release: {sampleId}
  - advanceTime: {to}
  - startTransit: input 그대로 ({transitId, sampleId, targetContainerId})
  - confirmArrival: {transitId}
  - cancelTransit: {transitId}

**출처**: engine.md E5·E6

### 2.7 state.ts (Snapshot 상태)

**기존 필드**:
- samples: SampleView[]
- reservations: ReservationView[]
- events: EventView[]

**확장**:
- `now: Tick` — 현재 논리 시각 (advanceTime으로 진행)
- `transits: TransitView[]` — 모든 운송 기록 (끝난 것 포함)
- 각 SampleView:
  - `storageGrade: StorageGrade` (기존 types.ts)
  - `quarantined: boolean` (기존 types.ts)
- 각 ReservationView:
  - `expiresAt: Tick | null` (기존 types.ts)

**출처**: types.ts, engine.md

### 2.8 lab.ts (통합 구현)

**책임**:
- 각 모듈 조율
- 원자성 보장 (모두 성공하거나 모두 실패)
- 재전송 판정 (E5: 같은 eventId·op·args → 원래 Receipt, 다르면 EVENT_CONFLICT)
- snapshot() 제공

## 3. 오류 처리

**신규 오류 코드**:

| 코드 | 의미 | 발생 조건 |
| --- | --- | --- |
| QUARANTINED | 시료 격리 중 | split·reserve·consume 중 격리된 시료 |
| STORAGE_INCOMPATIBLE | 등급 불일치 | receive·split·move·startTransit 중 용기가 등급 미지원 |
| IN_TRANSIT | 운송 중 | split·consume·discard·move·startTransit(같은 시료) 중 운송 진행 중 |
| UNKNOWN_TRANSIT | 없는 운송 | confirmArrival·cancelTransit 호출 시 없는 transitId |
| TRANSIT_CLOSED | 끝난 운송 | confirmArrival·cancelTransit 호출 시 ARRIVED/CANCELED 상태 |

**기존 오류 코드 활용**:
- INVALID_INPUT: reserve(expiresAt), advanceTime(to 범위·정수 검증)
- NOT_ACTIVE: 끝난 시료 명령
- ID_TAKEN: transitId 재사용, 새 reservationId 재사용 (기존)

## 4. 불변식 검증

| ID | 검증 방법 | 담당 모듈 |
| --- | --- | --- |
| I12 | storageGrade ∈ containerIds[containerId].supportedGrades (정확 일치) | samples, transit |
| I13 | @advanceTime: expiresAt ≤ now인 ACTIVE 예약 없음 | reservations |
| I14 | ACTIVE 운송 시료 ∈ sourceContainerId, 목적 용기 비어 있고 다른 운송 미점유 | transit, storage |

**기존 불변식 유지**:
- I1 (계보 보존): split, consume, discard
- I2 (용기·시료 1:1): receive, split, move, confirmArrival, discard
- I3 (용량·reserved): receive, split, reserve, cancel, confirm, move
- I4 (reserved 계산): reserve, cancel, consume, advanceTime (만료)
- I5 (종료 불가역): 상태 전이 검증
- I6 (계보 불변): split, confirmArrival, discard
- I7 (seq 증가): 성공 명령마다
- I8 (원자성): 실패 시 모든 상태 복구
- I9 (재전송): E5 규칙
- I10 (ID 고유): receive, split, reserve, startTransit
- I11 (이력 스냅숏): args 호출 시 값 저장

## 5. 검증 전략

### 5.1 단위 검증
1. **각 명령별 전제 확인**:
   - quarantine/release: ACTIVE 시료, quarantined 값
   - advanceTime: to 정수·범위, 만료 판정, 이벤트 카운트
   - startTransit: transitId·sampleId 신규, 용기 비움, 등급 확인, 점유/확보 설정
   - confirmArrival/cancelTransit: 운송 존재·상태, containerId 전환·확보 해제

2. **운송 중 명령 제약**:
   - split/consume/discard/move/startTransit → IN_TRANSIT 오류
   - reserve/cancel/transferCustody/quarantine/release/advanceTime → 성공

3. **격리 중 명령 제약**:
   - split/reserve/consume → QUARANTINED 오류
   - cancel/move/discard/transferCustody/운송/advanceTime → 성공

### 5.2 통합 검증
1. **예약 만료 흐름**:
   - reserve(expiresAt=100)
   - advanceTime(50) → ACTIVE
   - advanceTime(100) → EXPIRED
   - advanceTime(101) → 여전히 EXPIRED
   - cancel(EXPIRED 예약) → RESERVATION_CLOSED

2. **운송 흐름**:
   - startTransit(transitId1, sampleId1, targetId) → sourceId 점유, targetId 확보
   - split(sampleId1) → IN_TRANSIT
   - confirmArrival → targetId로 이동, sourceId 비움, 확보 해제
   - startTransit(transitId2, 다른 시료, targetId) → 성공 (이미 비어 있음)

3. **격리·격리 해제·만료 상호작용**:
   - reserve(expiresAt=100, quarantined=false) → ACTIVE
   - quarantine → ACTIVE, 예약 유지
   - release → quarantined=false, 예약 유지
   - advanceTime(100) → 예약 EXPIRED, 격리 상태 유지

4. **등급 검증**:
   - 용기A: supportedGrades=[AMBIENT]
   - receive(grade=CHILLED, container=A) → STORAGE_INCOMPATIBLE
   - split(자식 container=A, 부모 grade=AMBIENT) → 성공
   - split(자식 container=A, 부모 grade=CHILLED) → 자식 grade=CHILLED 이어받음, 체크 실패 → STORAGE_INCOMPATIBLE

### 5.3 원자성·재전송
1. **원자성** (E6):
   - split 자식 일부만 성공 불가
   - startTransit 실패 시 운송·점유·확보 미생성
   - 여러 예약 만료되어도 advanceTime 이벤트 하나

2. **재전송** (E5):
   - receive(eventId1, args) → success, receipt1
   - receive(eventId1, 같은 args) → receipt1, 상태 미변경
   - receive(eventId1, 다른 args) → EVENT_CONFLICT
   - 모든 새 명령에 동일 규칙 적용

3. **ID 중복**:
   - eventId 재사용 → EVENT_CONFLICT (다른 op/args 시)
   - sampleId 재사용 → ID_TAKEN
   - reservationId 재사용 → ID_TAKEN
   - transitId 재사용 (끝난 운송 포함) → ID_TAKEN

### 5.4 경계 조건
1. **시각**: expiresAt = now에서 만료, now = MAX_SAFE_INTEGER
2. **격리**: 격리 → 격리 (멱등), 해제 → 해제 (멱등)
3. **운송**: sourceId = targetId인 경우, 격리된 시료 운송 시작 (허용), 운송 중 격리/해제 (허용)
4. **예약 없는 discard**, **여러 자식 split**

## 6. 구현 절차

1. **상태 확장**: state.ts에 now, transits 추가
2. **모듈별 구현**:
   - quality.ts: quarantine, release
   - reservations.ts: advanceTime, expiresAt 검증, 만료 로직
   - storage.ts: 등급 검증, 운송 점유/확보
   - transit.ts: 3개 명령, 운송 중 검증
   - samples.ts: 등급·격리 검증 통합
3. **lab.ts 통합**: 모듈 조율, 원자성, 재전송
4. **events.ts**: 새 명령 args 형식
5. **테스트**: pnpm check

## 7. 설계 결정

| 결정 | 이유 | 출처 |
| --- | --- | --- |
| 보관 등급 정확 일치 | 대체·상하 관계 없음, FROZEN≠CHILLED | storage.md |
| expiresAt ≤ now 경계 포함 | "정확히 같아지는 순간에도 만료" | reservations.md |
| 만료 이벤트 하나 | "여러 예약 동시 만료도 이벤트 하나" | reservations.md |
| IN_TRANSIT 중 cancel 허용 | "예약 취소는 허용" (quality.md 규칙, transit.md 허용) | quality.md, transit.md |
| sourceContainerId 읽기 전용 | 운송 시작 후 시료 containerId는 미변경 | transit.md |
| 목적 용기 확보 배타적 | "다른 운송의 목적지로 쓸 수 없음" | transit.md |
| 격리·해제 멱등성 | "이미 같은 값이어도 성공" | quality.md |
| 운송 기록 유지 | "끝난 운송은 기록과 식별자를 남김" | transit.md |

## 8. 의존성

- 정책 문서: docs/{engine,storage,quality,reservations,transit}.md
- 공개 계약: src/lab/types.ts
- 기존 구현: src/lab/{samples,reservations,quality,storage,events,state,lab}.ts

## 접근

- **접근:** 정책 문서 우선, 모듈 책임 분리, E5·E6 규칙 적용, 상태 관리 집중화

### 철학
1. **정책 문서 우선**: types.ts 공개 계약과 docs/ 정책 5개가 완전한 원문. 설계자의 해석이나 추가 규칙 없음.
2. **모듈 책임 분리**: 도메인별로 모듈을 나누어 각 모듈의 책임을 명확히 함:
   - quality.ts: 격리만 담당
   - reservations.ts: 예약 생애주기(만료 포함)
   - storage.ts: 용기·등급·점유·확보 중앙화
   - transit.ts: 운송 절차 자체
   - samples.ts: 시료 기본 명령 (검증은 각 모듈에 위임)
3. **E5·E6 규칙 적용**: 기존 명령의 재전송·원자성 규칙을 새 명령에도 동일하게 적용.
4. **상태 관리 집중화**: Engine.st가 모든 상태의 단일 소스. 작업 복사본으로 원자성 보장.

### 추동 설계
- **문제**: 기존 엔진의 기본 기능(receive, split, reserve 등)은 완성되었고, 새 기능 4개를 추가할 때 기존 기능을 건드리지 않으면서 확장해야 함.
- **해결**: 기존 모듈은 최소한만 수정 (격리·운송 검증 추가), 새 모듈(quality.ts) 또는 확장(reservations.ts)으로 대부분 처리.
- **근거**: 기존 불변식(I1-I11) 유지, 새 불변식(I12-I14) 추가.

## 대안·트레이드오프

- **대안·트레이드오프:** 격리 표현, 만료 판정, 운송 식별, 등급 검증, 용기 확보, cancel 허용, 자식 등급 상속

| 대안 | 선택안 | 이유 |
| --- | --- | --- |
| **격리 상태 표현** | SampleView.quarantined (boolean) | types.ts 이미 정의, 상태와 독립적인 속성 |
| **예약 만료 판정** | advanceTime에서 한 번에 판정 | 원자성, 여러 예약 동시 만료 시 이벤트 1개 |
| **운송 식별** | transitId (sampleId와 별도) | 같은 시료 여러 운송 가능(순차), 운송 이력 추적 용이 |
| **보관 등급 검증** | 정확 일치(list.includes) | 정책: 대체·상하 관계 없음, 명확한 규칙 |
| **목적 용기 확보** | occupied Map에 transit 점유 추가 | storage.ts 중앙화, 다른 시료·운송 배제 간단 |
| **격리 중 cancel** | 허용 (예약 양만 풀기) | 정책: cancel은 예약 취소만 함, quarantined 유지 |
| **split 자식 등급** | 부모 등급 상속 (호출자 지정 불가) | 정책: 분취는 부모 일부, 보관 환경도 부모와 동일 |

## 검증 계획

- **검증 계획:** 단위·통합·경계·원자성 검증 및 체크리스트로 각 기능과 불변식 확인

### 방법
1. **단위 검증**: 각 명령의 전제 조건과 효과
2. **통합 검증**: 여러 명령 조합 (운송 흐름, 격리·만료 상호작용)
3. **경계 검증**: expiresAt=now, sourceId=targetId, 멱등성
4. **원자성·재전송**: E5·E6 규칙 적용
5. **pnpm check**: 형식, 타입, 테스트 통과

### 체크리스트
- [ ] quality.ts: quarantine/release 멱등성
- [ ] advanceTime: expiresAt ≤ now 판정, 이벤트 1개
- [ ] startTransit: 점유/확보 설정, 등급 검증
- [ ] confirmArrival/cancelTransit: 상태 전환, 확보 해제
- [ ] split/reserve/consume: 격리/운송 중 검증
- [ ] 불변식 I12·I13·I14 검증
- [ ] E5·E6 (재전송·원자성) 검증
- [ ] 기존 불변식 I1-I11 유지 확인
