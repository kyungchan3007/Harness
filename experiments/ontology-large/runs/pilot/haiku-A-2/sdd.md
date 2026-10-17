# 0040 설계 사양서 (SDD)

요구사항: [prd.md](prd.md)

## 설계

시료 보관 엔진에 4가지 기능(격리, 보관 등급, 예약 만료, 운송)을 추가한다. 기존 구현 구조(모듈별 `Engine.run()` 패턴)를 유지하고, 각 기능을 해당 모듈에서 구현한다.

- **읽은 문서:** docs/engine.md · docs/quality.md · docs/storage.md · docs/reservations.md · docs/transit.md · src/lab/types.ts
- **접근:** (아래 "접근" 섹션 참조)
- **대안·트레이드오프:** (아래 "대안·트레이드오프" 섹션 참조)
- **파일 계획:** src/lab/{quality,reservations,transit,storage,samples}.ts 5개 파일 수정
- **위험:** 기존 기능 회귀 — 모든 메서드 추가 검증 후 테스트
- **검증 계획:** (아래 "검증 계획" 섹션 참조)

## 아키텍처

### 계층 구조
```
Lab (public API in lab.ts)
├── qualityCommands (격리)
├── reservationCommands (만료)
├── transitCommands (운송)
├── sampleCommands (받기, 분취, 이동, 폐기)
├── Engine (원자성·이력 관리)
└── Storage (용기·용량·등급 관리)
```

### 상태 확장

**State** (기존 + 추가):
- `now: Tick` — 논리 시각 (기존)
- `samples: Map<ID, SampleView>` — 시료 (기존, `quarantined` 필드 활용)
- `reservations: Map<ID, ReservationView>` — 예약 (기존, `expiresAt` 필드 활용)
- `transits: Map<ID, TransitView>` — 운송 (기존)
- `events: EventView[]` — 이력 (기존)
- `seen: Map<ID, ...>` — 중복 방지 (기존)
- `occupied: Map<ID, ID>` — 용기 점유 (기존, 운송 목적지 확보에 활용)
- **추가**: 운송 관련 추적 필요 시 상태에 필드 추가 (예: 출발 용기 임시 추적)

## 각 기능 구현 계획

### 1. 격리 (quality.ts)

#### 메서드 시그니처
```typescript
quarantine(eventId: ID, sampleId: ID): Result<Receipt>;
release(eventId: ID, sampleId: ID): Result<Receipt>;
```

#### 검증 규칙
1. 시료가 ACTIVE 상태여야 함 (→ `NOT_ACTIVE`)
2. 이미 같은 상태여도 성공
3. 격리 중이거도 예약은 건드리지 않음

#### 구현 단계
1. 시료 조회 (`active` 헬퍼 사용)
2. 격리/해제 상태 설정 (`sample.quarantined = true/false`)
3. 이벤트 기록
4. Return Receipt

#### 통합 검증
다른 메서드에서 격리 여부 검사 시점:
- `split` — 격리 시 `QUARANTINED`
- `reserve` — 격리 시 `QUARANTINED`
- `consume` — 격리 시 `QUARANTINED` (cancel은 허용)

### 2. 보관 등급 (storage.ts 확장)

#### 검증 메서드
```typescript
isCompatible(storageGrade: StorageGrade, supportedGrades: StorageGrade[]): boolean;
```

#### 규칙
- `supportedGrades.includes(storageGrade)` 정확히 확인
- 상하 관계 없음 (FROZEN 지원 ≠ CHILLED 지원)

#### 통합 위치
1. `receive` — 시료 받을 때
2. `split` — 자식 용기 할당할 때
3. `move` — 목적 용기 확인할 때
4. `startTransit` — 목적 용기 확인할 때

#### 기존 코드 수정
- `samples.ts:receive()` — 등급 호환성 검사 추가
- `samples.ts:split()` — 자식 용기 호환성 검사 추가
- `samples.ts:move()` — 목적 용기 호환성 검사 추가
- `storage.ts` — 헬퍼 메서드 추가

### 3. 예약 만료 (reservations.ts)

#### 메서드 시그니처
```typescript
advanceTime(eventId: ID, to: Tick): Result<Receipt>;
```

#### 검증 규칙
1. `to` ≥ `s.now` (절대 시각, 증가만 가능)
2. `to > s.now`일 필요는 없음 (같은 값도 성공)
3. 과거 시각 → `INVALID_INPUT`

#### 구현 단계
1. 시각 검증
2. `s.now = to` 설정
3. 모든 ACTIVE 예약 순회하여 `r.expiresAt <= s.now`면 `r.status = "EXPIRED"`
4. 만료된 예약의 양 풀어주기: `sample.reserved -= r.qty`
5. 이벤트 기록 (여러 예약이 만료되어도 하나의 advanceTime 이벤트)
6. Return Receipt

#### 새 예약 시 만료 검증 (reserve 메서드 수정)
```typescript
if (input.expiresAt !== null) {
  if (input.expiresAt <= s.now) return "INVALID_INPUT";
}
```

### 4. 운송 (transit.ts)

#### 메서드 시그니처
```typescript
startTransit(eventId: ID, input: { transitId: ID; sampleId: ID; targetContainerId: ID }): Result<Receipt>;
confirmArrival(eventId: ID, transitId: ID): Result<Receipt>;
cancelTransit(eventId: ID, transitId: ID): Result<Receipt>;
```

#### 상태 흐름
```
startTransit(ACTIVE) → confirmArrival → ARRIVED (시료 이동)
                   └→ cancelTransit  → CANCELED (시료 제자리)
```

#### startTransit 검증
1. 시료 존재 및 ACTIVE 확인
2. 운송 ID 중복 검사 → `ID_TAKEN`
3. 목적 용기 존재 확인
4. 보관 등급 호환성 검사 → `STORAGE_INCOMPATIBLE`
5. 목적 용기가 비어 있고 다른 운송의 목적지 아닌지 확인 → `CONTAINER_OCCUPIED`
6. 시료가 이미 운송 중이면 → `IN_TRANSIT` (같은 시료 추가 운송 불가)
7. 시료 상태 생성: `TransitView { transitId, sampleId, sourceContainerId, targetContainerId, status: "ACTIVE" }`
8. 목적 용기 확보 표시 (occupied 맵 또는 별도 추적)

#### confirmArrival 검증
1. 운송 존재 확인 → `UNKNOWN_TRANSIT`
2. 운송 상태 ACTIVE 확인 → `TRANSIT_CLOSED` (이미 끝난 운송)
3. 시료 존재 확인 (운송 시작 후 시료가 삭제되지 않았는지)
4. 용기 이동: 출발 용기에서 제거, 목적 용기에 할당
5. 운송 상태 → `ARRIVED`
6. 목적 용기 확보 해제, 출발 용기 released 표시

#### cancelTransit 검증
1. 운송 존재 확인
2. 운송 상태 ACTIVE 확인
3. 시료 및 출발 용기 확인
4. 운송 상태 → `CANCELED`
5. 목적 용기 확보 해제 (시료는 출발 용기에 둔 채)

#### 운송 중 명령 제한
다음 메서드에서 검사 추가:
- `split` — `IN_TRANSIT`로 거절
- `consume` — `IN_TRANSIT`로 거절
- `discard` — `IN_TRANSIT`로 거절
- `move` — `IN_TRANSIT`로 거절
- 자신 시료의 추가 `startTransit` — `IN_TRANSIT`로 거절

헬퍼 함수:
```typescript
function isInTransit(s: State, sampleId: ID): boolean {
  for (const t of s.transits.values()) {
    if (t.sampleId === sampleId && t.status === "ACTIVE") return true;
  }
  return false;
}
```

#### 허용되는 명령 (운송 중에도)
- 새 예약 (reserve)
- 예약 취소 (cancel)
- 책임자 변경 (transferCustody)
- 격리/해제 (quarantine/release)
- 시각 진행 (advanceTime)

### 5. 통합 검증 행렬

| 메서드 | 격리 검사 | 등급 검사 | 운송 검사 | 비고 |
| --- | --- | --- | --- | --- |
| receive | - | ✓ | - | 시료 받을 때 등급 검증 |
| split | ✓ | ✓ | ✓ | 격리/운송 시 거절, 자식 용기 등급 검증 |
| reserve | ✓ | - | - | 격리 시 거절, expiresAt 미래 검증 추가 |
| consume | ✓ | - | - | 격리 시 거절 |
| move | - | ✓ | ✓ | 운송 중 거절, 목적 용기 등급 검증 |
| discard | - | - | ✓ | 운송 중 거절 |
| transferCustody | - | - | - | 제한 없음 |
| quarantine | - | - | - | 새 메서드 |
| release | - | - | - | 새 메서드 |
| advanceTime | - | - | - | 새 메서드 |
| startTransit | ✓ | ✓ | ✓ | 모든 검사 (격리는 시작 허용) |
| confirmArrival | - | - | - | 특수 검사만 |
| cancelTransit | - | - | - | 특수 검사만 |

## 구현 순서

1. **격리 기본 (quality.ts)**
   - `quarantine`, `release` 메서드
   - 기존 메서드에서 격리 여부 검사 추가

2. **보관 등급 (storage.ts + samples.ts)**
   - `Storage.isCompatible()` 메서드
   - 기존 메서드 (`receive`, `split`, `move`)에 검사 추가

3. **예약 만료 (reservations.ts)**
   - `advanceTime` 메서드 구현
   - `reserve` 메서드에 expiresAt 검증 추가

4. **운송 기본 (transit.ts)**
   - `startTransit`, `confirmArrival`, `cancelTransit` 구현
   - 운송 중 제한 검사 추가

5. **통합 테스트**
   - 각 기능 간 상호작용 검증
   - `pnpm check` 통과

## 에러 처리

### 기존 에러 코드
- `INVALID_INPUT` — 입력 값 유효성
- `UNKNOWN_*` — 대상 없음
- `CAPACITY_EXCEEDED` — 용기 초과
- `INSUFFICIENT` — 부족
- `NOT_ACTIVE` — 시료 상태
- 등등 (types.ts 참조)

### 신규 에러 코드
- `QUARANTINED` — 격리 시 작업 불가
- `STORAGE_INCOMPATIBLE` — 등급 불일치
- `IN_TRANSIT` — 운송 중 작업 불가

## 기존 기능 영향도

### 변경 필요
1. `samples.ts:receive()` — 등급 호환성 검사 추가
2. `samples.ts:split()` — 격리, 등급, 운송 중 검사 추가
3. `samples.ts:move()` — 등급, 운송 중 검사 추가
4. `reservations.ts:reserve()` — 격리, expiresAt 검증 추가
5. `reservations.ts:consume()` — 격리 검사 추가

### 변경 없음
- `discard()` — 폐기 기능 그대로 (운송 중 제한만 추가)
- `transferCustody()` — 제약 없음
- `cancel()` — 기존 동작 유지

## 파일 변경 계획

### 신규 생성
- (없음 — 기존 모듈에서만 수정)

### 기존 파일 수정
- `src/lab/quality.ts` — `quarantine`, `release` 메서드 추가
- `src/lab/reservations.ts` — `advanceTime` 메서드 구현, `reserve` 검증 추가
- `src/lab/transit.ts` — 3개 메서드 구현
- `src/lab/storage.ts` — `isCompatible()` 헬퍼, 운송 상태 추적 지원
- `src/lab/samples.ts` — 격리, 등급, 운송 검사 추가
- `src/lab/lab.ts` — (변경 없음, 이미 모듈 조립)

## 테스트 전략

각 기능별로:
1. 기본 성공 경로
2. 각 에러 코드 경로
3. 다른 기능과의 조합
4. E1~E6 엔진 규칙 준수 (E5 중복 방지, E6 원자성)

## 접근

### 구현 전략
1. **점진적 구현**: 한 기능씩 구현 → 테스트 → 다음 기능 진행
2. **기존 패턴 활용**: 모든 메서드는 Engine.run() 콜백 형태
3. **모듈 분리**: 각 기능을 담당 모듈에서만 수정 (quality.ts, reservations.ts, transit.ts, storage.ts)
4. **통합 검증**: 기존 메서드 수정할 때마다 관련 기능 검증 추가

### 구현 현황 추적
- trace.md에 각 단계 진행 상황 기록
- 문제 발생 시 prd.md의 "애매한 곳·가정"에 반영

## 대안·트레이드오프

| 결정 | 채택 | 대안 | 이유 |
| --- | --- | --- | --- |
| **운송 목적 용기 확보** | occupied 맵 활용 | 별도 추적 구조 | 기존 메커니즘과 일관성, 코드 간결 |
| **격리 상태 저장** | SampleView.quarantined | 별도 격리 맵 | 이미 타입에 정의됨, 원자성 보장 |
| **시각 진행** | advanceTime에서 모든 만료 예약 처리 | 지연 처리 | 단순성, 명확한 시점 |
| **예약 만료와 소비 제한** | 예약 취소는 허용 | 모두 거절 | 문서의 "예약 취소, 이동, 폐기... 허용" 명시 |

## 검증 계획

### 단위 테스트 (각 기능별)
1. **격리**: quarantine 성공 → 예약 거절 / release 성공 → 예약 가능
2. **보관 등급**: 불일치 용기에 받기/분취/이동/운송 거절
3. **예약 만료**: advanceTime → 만료 예약 EXPIRED / 양 풀어짐 / 소비 불가
4. **운송**: startTransit → 목적 용기 확보 / confirmArrival → 시료 이동 / cancelTransit → 상태 원위치

### 통합 테스트 (기능 간 상호작용)
1. **격리 + 예약**: 격리된 시료의 예약 거절 확인
2. **등급 + 운송**: 운송 목적지 등급 검증
3. **운송 + 예약**: 운송 중 예약 만료 가능
4. **모든 기능 + E5/E6**: 중복 호출, 원자성 검증

### 회귀 테스트
- 기존 4가지 기능(receive, split, reserve, consume, discard, move) 정상 작동 확인
- 각 에러 경로 동작 확인

## 주의사항

1. **원자성**: `Engine.run()` 안에서만 상태 수정
2. **이벤트 기록**: args는 eventId 제외한 인자들로 구성
3. **ID 고유성**: 운송·예약 ID도 이미 사용된 ID 불가
4. **중복 호출**: E5 규칙 — 같은 eventId는 처음 결과 그대로 반환
5. **보관 등급 상속**: split 시 자식은 부모의 등급을 상속 (지정 불가)
