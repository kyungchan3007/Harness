# SDD 0040 — 시료 보관 엔진 확장 설계

## 아키텍처 개요

### 모듈 구조 (기존)
```
events.ts
  ├─ Engine: 명령 실행·이벤트 기록 관리
  └─ state: 스냅숏 상태 (State 타입)
    ├─ now: Tick
    ├─ samples: Map<ID, SampleView>
    ├─ reservations: Map<ID, ReservationView>
    ├─ transits: Map<ID, TransitView> [추가]
    ├─ occupied: Map<ID, ID> (용기 → 시료)
    └─ events: EventView[]

samples.ts
  └─ sampleCommands: receive, split, discard, move, transferCustody

reservations.ts
  └─ reservationCommands: reserve, cancel, consume

quality.ts
  └─ qualityCommands: quarantine, release [추가]

transit.ts
  └─ transitCommands: startTransit, confirmArrival, cancelTransit [추가]

storage.ts
  └─ Storage: 용기 관리 (get, isFree)
  └─ [추가] isCompatible: 시료와 용기의 등급 적합성 검증

state.ts
  └─ 헬퍼: active, finish
  └─ [추가] inTransit: 운송 중 여부 검사
```

## 데이터 모델 확장

### State (events.ts)
```typescript
interface State {
  now: Tick;
  samples: Map<ID, SampleView>;
  reservations: Map<ID, ReservationView>;
  transits: Map<ID, TransitView>; // [추가]
  occupied: Map<ID, ID>; // [기존] 용기 → 시료
  // [추가] 목적 용기 확보 추적을 위해 occupied를 확장하거나 별도 map 사용
  reserved: Map<ID, ID>; // [추가] 목적 용기 → 운송 ID (운송 중 확보)
  events: EventView[];
}
```

### SampleView 필드 (types.ts에 이미 정의됨)
```typescript
storageGrade: StorageGrade; // 요구 보관 등급
quarantined: boolean;       // 격리 여부
// 기존: sampleId, parentId, rootId, remaining, reserved, 
//      consumedQty, discardedQty, status, containerId, custodianId
```

### ReservationView 필드 (types.ts에 이미 정의됨)
```typescript
expiresAt: Tick | null;  // 만료 시각 (null = 기한 없음)
// 기존: reservationId, sampleId, qty, status
```

### TransitView (types.ts에 이미 정의됨)
```typescript
interface TransitView {
  transitId: ID;
  sampleId: ID;
  sourceContainerId: ID;  // 출발 용기
  targetContainerId: ID;  // 목적 용기
  status: TransitStatus;  // ACTIVE | ARRIVED | CANCELED
}
```

## 구현 계획

### 1단계: 기반 확장 (events.ts, state.ts, storage.ts)

**events.ts**
- State에 `transits` map 추가
- State에 `reserved` map 추가 (목적 용기 확보 추적)

**state.ts**
- `inTransit(s: State, sampleId: ID): boolean` 헬퍼 추가
- `isInActiveTransit(s: State, sampleId: ID): boolean` 추가

**storage.ts**
- `isCompatible(grade: StorageGrade, container: Container): boolean` 추가
  - 컨테이너의 `supportedGrades` 배열에 `grade`가 포함되는지 확인
- `isFree(s: State, containerId: ID): boolean` 기존 로직 유지
  - occupied에 없고, reserved(목적 용기 확보)에도 없어야 함

### 2단계: 명령 구현

#### quality.ts (격리)
```typescript
function qualityCommands(engine: Engine): Pick<Lab, "quarantine" | "release"> {
  return {
    quarantine(eventId, sampleId) {
      return engine.run(eventId, "quarantine", { sampleId }, (s) => {
        const sample = active(s, sampleId);
        if (typeof sample === "string") return sample;
        sample.quarantined = true;
        return null;
      });
    },
    release(eventId, sampleId) {
      return engine.run(eventId, "release", { sampleId }, (s) => {
        const sample = active(s, sampleId);
        if (typeof sample === "string") return sample;
        sample.quarantined = false;
        return null;
      });
    },
  };
}
```

#### samples.ts 수정 (보관 등급 검증)

**receive**
- `storageGrade` 입력 검증
- `storage.isCompatible(input.storageGrade, container)` 검증 → `STORAGE_INCOMPATIBLE`

**split**
- 각 자식 용기가 부모의 `storageGrade` 지원 검증
- 자식은 부모의 `storageGrade` 상속

**move**
- 목적 용기가 시료의 `storageGrade` 지원 검증

**split, reserve, consume 추가 제약**
- `quarantine` 여부 검증: 격리되면 `QUARANTINED` 반환

#### reservations.ts 수정 (만료 및 격리)

**reserve**
- `expiresAt` 입력 검증: `null` 또는 `now < expiresAt < Number.MAX_SAFE_INTEGER`
- 격리 검증: 시료가 격리되면 `QUARANTINED`

**cancel**
- 격리·운송 중이어도 허용 (기존 제약은 적용)

**consume**
- 격리 검증: `QUARANTINED`
- 운송 중 검증: `IN_TRANSIT`

#### reservations.ts 추가 (시각 진행 및 만료)

```typescript
advanceTime(eventId, to) {
  return engine.run(eventId, "advanceTime", { to }, (s) => {
    if (!Number.isInteger(to) || to < s.now) return "INVALID_INPUT";
    s.now = to;
    
    // expiresAt <= now인 ACTIVE 예약 모두 EXPIRED
    for (const [id, res] of s.reservations) {
      if (res.status === "ACTIVE" && res.expiresAt !== null && res.expiresAt <= s.now) {
        res.status = "EXPIRED";
        // 시료의 reserved 감소
        const sample = s.samples.get(res.sampleId);
        if (sample) sample.reserved -= res.qty;
      }
    }
    return null;
  });
}
```

#### transit.ts (운송)

**startTransit**
- 시료가 이미 운송 중인지 검증: `IN_TRANSIT`
- 시료 ACTIVE 검증
- 목적 용기 존재·비어 있음·확보 안 됨 검증
- 용량 검증
- 목적 용기 보관 등급 검증: `storage.isCompatible`
- `transits` map에 새 운송 추가
- `reserved` map에 목적 용기 → 운송 ID 기록

**confirmArrival**
- 운송 존재 및 ACTIVE 검증
- 시료를 목적 용기로 이동
- 출발 용기 비우기
- 운송 상태 → `ARRIVED`
- `reserved` map에서 목적 용기 제거

**cancelTransit**
- 운송 존재 및 ACTIVE 검증
- 운송 상태 → `CANCELED`
- `reserved` map에서 목적 용기 제거

#### samples.ts 수정 (운송 중 금지)

**split, consume, discard, move**
- `inTransit(s, sampleId)` 검증: `IN_TRANSIT`

### 3단계: 통합

#### lab.ts
- 이미 모든 명령 모듈을 조립하는 구조이므로 변경 없음

## 검증 전략

### 단위 테스트 (기존 패턴)
1. 각 명령의 성공 경로
2. 각 ErrorCode 경로
3. 재전송 (같은 eventId 처리)

### 통합 테스트
1. 격리된 시료의 분취·예약·소비 거절
2. 보관 등급 불일치 거절
3. 만료 시각 정확히 만남 (경계)
4. 운송 중 금지 명령
5. 운송 도착 후 용기 점유 변경
6. 불변식 유지 (계보 수량, 용기 점유, 이벤트 seq)

## 위험 요소 및 완화

| 위험 | 완화 |
|-----|-----|
| 목적 용기 확보와 occupied의 일관성 | 용기 상태를 occupied/reserved로 명확히 분리, 매 명령에 검증 |
| 운송 중 만료된 예약 처리 | 만료는 격리·용기·운송을 바꾸지 않음 (reservations.md) |
| 격리·운송 중 제약의 복합성 | 각 명령에서 제약 순서 명확히 (격리 먼저, 그 다음 운송) |
| 시각 진행 시 대량 만료 | advanceTime 이벤트는 하나, 모든 만료 예약 처리하고 seq는 1만 증가 |

## 코드 조직

### 기존 파일 수정
- `src/lab/events.ts`: State에 transits, reserved 추가
- `src/lab/state.ts`: inTransit 헬퍼 추가
- `src/lab/storage.ts`: isCompatible 메서드 추가, isFree 수정
- `src/lab/samples.ts`: 보관 등급·격리·운송 중 검증 추가
- `src/lab/reservations.ts`: 격리·운송 중·시각 진행 처리 추가

### 새 파일 (기존 구조 유지)
- `src/lab/quality.ts`: quarantine, release
- `src/lab/transit.ts`: startTransit, confirmArrival, cancelTransit

### 테스트
- 기존 테스트는 유지 (회귀 검증)
- 새 기능 테스트 추가 (src/lab/**.test.ts 패턴)

## 의존성 관계

```
events.ts (State 관리)
  ← samples.ts (시료 명령)
  ← reservations.ts (예약+시각)
  ← quality.ts (격리)
  ← transit.ts (운송)
  ← storage.ts (용기 적합성)
  ← state.ts (헬퍼)
```

모든 명령은 Engine.run()을 통해 트랜잭션 처리되므로 의존성 순환은 없다.

## 설계

- **접근:**
  1. 기존 기능을 그대로 유지하고 새 기능을 추가 (격리, 보관 등급, 예약 만료, 운송)
  2. State에 `reserved` map 추가 (transits는 이미 있음, 목적 용기 확보 추적)
  3. Engine.run()으로 모든 명령 래핑하여 원자성 보장
  4. 각 명령에서 제약 검증 순서 통일 (존재 → 상태 → 제약)

- **대안·트레이드오프:**
  - 목적 용기 확보: occupied only vs reserved map 분리 → 별도 reserved map (명확성)
  - 만료된 예약 정리: 즉시 vs 기록 유지 → 기록 유지 (감시 추적성)
  - split 등급 검증: 호출자 책임 vs 구현에서 검증 → 구현에서 검증 (방어적)

- **검증 계획:**
  - 단위 테스트: reserve expiresAt (null/미래/과거), split 등급, quarantine/release, transit 명령
  - 불변식 검증: I8 (원자성), I9 (재전송), I12 (등급), I13 (만료), I14 (운송)
  - 경계값: 만료 시각 정확히 만남 (expiresAt === now), 운송 중 금지 명령
