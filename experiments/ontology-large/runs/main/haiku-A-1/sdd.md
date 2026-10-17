# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — SDD

- **접근:**
  1. `storage.ts`의 `supports()` 메서드 구현 (기존 스텁)
  2. `samples.ts`의 receive/split/move에 보관 등급 검사 연결
  3. `state.ts`에 `reserved_by_transit` 필드 추가 (운송 목적 용기 확보 관리)
  4. `transit.ts`의 startTransit/confirmArrival/cancelTransit 구현
  5. `reservations.ts`의 advanceTime 구현 + reserve 유효성 추가
  6. `quality.ts`의 quarantine/release 구현 + 기존 명령 격리 검사 연결
  7. 모든 명령에 운송 중 제약 (IN_TRANSIT) 연결

- **대안·트레이드오프:**
  - **상태 필드 vs 맵 추적**: 운송 목적 용기 확보를 상태 필드로 할지 별도 맵으로 할지
    - 선택: 별도 `reserved_by_transit` 맵 (occupied와 동일 패턴)
    - 이유: 운송이 끝날 때까지 확보 유지 필요, 점유와 개념 분리 명확
  - **예약 만료 판정**: 스냅샷마다 만료 확인 vs advanceTime에서만 확인
    - 선택: advanceTime에서만 확인
    - 이유: 실제 시계 없이 논리 시각만 진행하므로, 명령 시점에 만료 판정 필수
  - **분취 자식 등급**: 부모 상속 vs 고정값
    - 선택: 부모 상속
    - 이유: 계보 관계에서 등급도 함께 이어지는 것이 자연스러움

- **검증 계획:**
  1. 단위 테스트: 각 명령 별 성공/실패 케이스 (격리, 보관 등급, 예약 만료, 운송)
  2. 통합 테스트: 명령 조합 (격리 중 예약 취소, 운송 중 예약 생성, 분취 등급 상속)
  3. 경계값 테스트: 시간 역진행, 정확한 만료 시각, 용기 용량 초과
  4. 회귀 테스트: 기존 기능 (receive/split/reserve/cancel/consume/move/discard/transferCustody) 동작

---

## 아키텍처

기존 모듈 구조 유지, 각 기능별 구현 모듈 확장:

```
src/lab/
├── types.ts          (고정: 공개 계약)
├── state.ts          (수정: reserved_by_transit 추가)
├── events.ts         (고정: 명령 실행 프레임)
├── storage.ts        (수정: 완성)
├── samples.ts        (수정: 보관 등급 검사 연결)
├── reservations.ts   (수정: advanceTime 구현)
├── quality.ts        (수정: 격리/해제 구현)
├── transit.ts        (수정: 세 메서드 구현)
└── lab.ts            (수정 안 함)
```

### State 확장 (state.ts)

기존 State에 추가 필드:
- `reserved_by_transit: Map<ID, ID>` — containerId → transitId 목적 용기 확보

### 모듈별 구현 계획

#### 1. storage.ts — 보관 등급 검사

기존 스텁 완성:
- `supports(containerId: ID, grade: StorageGrade): boolean` — 용기가 등급 지원

#### 2. samples.ts — 보관 등급 연결

함수 수정:
- `receive()`: `storage.supports(containerId, storageGrade)` 검사 추가
- `split()`: 각 자식 `storage.supports(containerId, parent.storageGrade)` 검사 추가, 자식 등급 부모 상속
- `move()`: `storage.supports(targetContainerId, x.storageGrade)` 검사 추가
- 모든 함수: `isInTransit(s, sampleId)` 검사 추가

#### 3. transit.ts — 운송

함수 구현:
- `startTransit()`: 유니크 검사, 보관 등급 검사, 점유/확보 설정
- `confirmArrival()`: 시료 옮김, 운송 상태 ARRIVED
- `cancelTransit()`: 운송 상태 CANCELED, 확보 해제

보조 함수:
- `isInTransit(s: State, sampleId: ID): boolean` — 시료가 운송 중인가

#### 4. reservations.ts — 예약 만료

함수 구현:
- `advanceTime()`: 시간 진행, 만료 처리
- `reserve()`: expiresAt 유효성 추가

#### 5. quality.ts — 격리/해제

함수 구현:
- `quarantine()`: 격리 상태 설정
- `release()`: 미격리 상태 설정

#### 6. 모든 명령 — 제약 연결

| 명령 | 격리 | 운송 중 | 보관 등급 |
| --- | --- | --- | --- |
| split | QUARANTINED | IN_TRANSIT | (자동) |
| reserve (새) | QUARANTINED | - | - |
| consume | - | IN_TRANSIT | - |
| discard | - | IN_TRANSIT | - |
| move | - | IN_TRANSIT | STORAGE_INCOMPATIBLE |
| receive | - | - | STORAGE_INCOMPATIBLE |

## 데이터 흐름 예시

### 격리 플로우
```
quarantine(eventId, sampleId)
 → active(s, sampleId) 검사
 → x.quarantined = true
 → 이벤트 기록
```

### 예약 만료 플로우
```
advanceTime(eventId, to)
 → to >= s.now 검사 (INVALID_INPUT)
 → s.now = to
 → for r in s.reservations:
     if r.status === "ACTIVE" && r.expiresAt !== null && r.expiresAt <= to:
       r.status = "EXPIRED"
       s.samples.get(r.sampleId)!.reserved -= r.qty
 → 이벤트 기록
```

### 운송 플로우
```
startTransit(eventId, { transitId, sampleId, targetContainerId })
 → active(s, sampleId), isInTransit(s, sampleId) 검사
 → storage 검사, 보관 등급 검사 (STORAGE_INCOMPATIBLE)
 → s.reserved_by_transit.set(targetContainerId, transitId)
 → s.transits.set(transitId, { ..., status: "ACTIVE" })
 → 이벤트 기록

confirmArrival(eventId, transitId)
 → s.occupied.delete(sourceContainerId)
 → s.occupied.set(targetContainerId, sampleId)
 → s.reserved_by_transit.delete(targetContainerId)
 → x.containerId = targetContainerId
 → transit.status = "ARRIVED"
 → 이벤트 기록

cancelTransit(eventId, transitId)
 → s.reserved_by_transit.delete(targetContainerId)
 → transit.status = "CANCELED"
 → 이벤트 기록
```

## 구현 세부사항

### Storage.isFree 수정

현재: `!s.occupied.has(id)`
수정: `!s.occupied.has(id) && !s.reserved_by_transit.has(id)`

### isInTransit 보조 함수

```typescript
function isInTransit(s: State, sampleId: ID): boolean {
  for (const t of s.transits.values()) {
    if (t.sampleId === sampleId && t.status === "ACTIVE") return true;
  }
  return false;
}
```

### advanceTime 유효성

- `to` 정수 필수, `to >= 0`, `to >= s.now`
- 아니면 `INVALID_INPUT`

### reserve expiresAt 유효성

- `null` (기한 없음) 또는 `expiresAt > s.now`
- 아니면 `INVALID_INPUT`

## 원자성·이력

기존 `engine.run()` 프레임 그대로:
- 명령 성공 시만 상태 변경
- 실패 시 작업 복사본 버림
- 이벤트 하나만 기록 (여러 예약 만료도 `advanceTime` 하나)
