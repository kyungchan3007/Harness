# 0040 — 시료 보관 엔진 확장 설계 — SDD

- **접근:**
  1. 모듈별 책임 분리: 기존 구조 유지하면서 각 기능을 독립 모듈에 구현
  2. 상태 확장 최소화: `State.transitTargets` 맵만 추가, 다른 필드는 기존 스키마 재사용
  3. 검사 순서 표준화: 존재 여부 → 상태 → 조건 → 등급 (일관성 유지)
  4. 아토믹성 보장: 모든 명령은 `engine.run()`을 거쳐 원자성 보장

- **대안·트레이드오프:**
  - 점유 상태 추적: `occupied` (ACTIVE 시료) + `transitTargets` (운송 목적지) 분리 선택 — 명확성과 확보 조건 읽기 용이
  - 격리 상태와 예약: 격리는 예약을 건드리지 않음 (기존 예약 유지, 새 예약만 거절) — docs/quality.md 정책
  - expiresAt 유효성: 받기 시점에 `expiresAt > now` 검사 (미래만 허용) — docs/reservations.md 정책

- **검증 계획:**
  - 단위: quarantine/release(ACTIVE만), advanceTime(시각·만료·양), startTransit/confirmArrival/cancelTransit(상태·점유), 등급·격리·운송중 검사
  - 통합: 격리+예약(유지/거절), 운송+예약(허용/거절), 운송+시각(만료), 점유(확보)
  - 엣지: expiresAt=now(만료), 계보 예약(독립), 재전송(E5)
  - 게이트: pnpm check 통과 (회귀 없음)

## 아키텍처

모듈별 책임 (기존 모듈 변경 최소화):

```
lab.ts (진입점)
  ├─ samples.ts (시료): receive·split·move·discard·transferCustody
  │   └─ storage.ts 호출 (등급 검사, 점유 관리)
  │   └─ quality.ts 호출 (격리 검사)
  ├─ reservations.ts (예약): reserve·cancel·consume·advanceTime
  │   └─ quality.ts 호출 (격리 검사)
  │   └─ transit.ts 호출 (운송 중 검사)
  ├─ quality.ts (격리): quarantine·release
  ├─ transit.ts (운송): startTransit·confirmArrival·cancelTransit
  │   └─ storage.ts 호출 (등급 검사, 점유 관리)
  │   └─ samples.ts의 transit 점유 상태 읽기
  └─ events.ts (엔진)
```

## 각 모듈 구현 전략

### 1. quality.ts (격리)

**상태**: 시료의 `quarantined` 필드 (boolean)

**quarantine(eventId, sampleId)**:
1. `active(s, sampleId)` 확인
2. `quarantined = true` 설정
3. 성공

**release(eventId, sampleId)**:
1. `active(s, sampleId)` 확인
2. `quarantined = false` 설정
3. 성공

**호출지**:
- samples.ts: split, 새 reserve 전에 격리 검사
- reservations.ts: reserve, consume 전에 격리 검사

### 2. storage.ts (보관 등급 및 점유)

**추가 메서드**:
- `supports(containerId: ID, grade: StorageGrade): boolean` ← 이미 있음
- `checkGrade(container: ContainerInfo, grade: StorageGrade): boolean` ← 래퍼 (명확성)

**점유 상태** (기존 `occupied` 맵 확장):
- `occupied[containerId]`: ACTIVE 시료 ID (받기·분취·이동 중 점유)
- `transitTargets[transitId]`: 목적 용기 ID (운송 목적지 확보)

**선택사항**: 별도 `transitTargets` 맵 추가하여 명확성 개선

### 3. reservations.ts (예약 및 만료)

**reserve 보완**:
1. `isQty(input.qty)` ✓
2. `expiresAt` 유효성: `null` 또는 `expiresAt > s.now`
3. 격리 여부 검사
4. 예약 추가

**consume 보완**:
1. 예약 찾기 ✓
2. 격리 여부 검사
3. 운송 중 여부 검사
4. 나머지 로직 ✓

**advanceTime 구현**:
```
1. to 유효성: to >= s.now (정수)
2. s.now = to
3. ACTIVE 예약 중 expiresAt <= now인 것들을 EXPIRED로, 양 풀기
4. 이벤트: { to }
```

### 4. transit.ts (운송)

**상태 추적**:
- `transits` 맵: `ID → TransitView`
- 상태: `ACTIVE` → `ARRIVED` / `CANCELED`

**startTransit**:
1. 입력 유효성 ✓
2. 운송 ID 중복 검사
3. 시료 확인 (ACTIVE)
4. 시료가 이미 운송 중인지 검사
5. 목적 용기 확인
6. 목적 용기 비어 있음 + 확보 안 됨
7. 보관 등급 적합성
8. 성공: 운송 생성, 목적 용기 확보

**confirmArrival**:
1. 운송 찾기 + ACTIVE 상태
2. 성공: 시료 이동, 운송 ARRIVED

**cancelTransit**:
1. 운송 찾기 + ACTIVE 상태
2. 성공: 목적 확보 해제, 운송 CANCELED

### 5. samples.ts (시료 명령 보완)

**receive 보완**:
- 보관 등급 적합성 검사 추가

**split 보완**:
- 부모 격리 검사
- 자식 용기 등급 검사 (부모 등급)
- 자식 등급 상속 설정

**move 보완**:
- 운송 중 여부 검사
- 보관 등급 적합성 검사

**discard 보완**:
- 운송 중 여부 검사

## 핵심 설계 결정

### 점유 상태 관리

- `State.occupied`: ACTIVE 시료가 점유 (기존 그대로)
- `State.transitTargets` (추가): `transitId → targetContainerId` (목적 용기 확보)
- `isFree()` 판정: `!occupied.has(id) && !transitTargets.values().includes(id)`

### 운송 중 명령 검사

**금지된 명령**:
- split: 부모가 운송 중 → IN_TRANSIT
- consume: 시료가 운송 중 → IN_TRANSIT
- discard: 시료가 운송 중 → IN_TRANSIT
- move: 시료가 운송 중 → IN_TRANSIT
- startTransit: 시료가 이미 운송 중 → IN_TRANSIT

**구현**: `isInTransit(s: State, sampleId: ID): boolean`
- `s.transits` 순회, status=ACTIVE && sampleId 일치

## 기존 코드와의 관계

- `engine.ts`: 변경 없음 (E5·E6 규칙은 새 명령에도 적용)
- `events.ts`: `canon`, `clone` 유틸 재사용
- `state.ts`: `transitTargets` 필드 추가, copyState 업데이트
- `storage.ts`: `isFree` 메서드 업데이트, `supports` 유틸 호출
