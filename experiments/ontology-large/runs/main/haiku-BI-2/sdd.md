# 0040 — 시료 보관 엔진 확장 — SDD

- **접근:** 격리는 `quarantined` 필드 토글로 구현, 보관 등급은 `storage.supports()` 메서드로 검사, 만료는 `advanceTime`에서 일괄 처리, 운송은 2단계 절차로 점유·확보 관리. 모든 정책을 `docs/` 및 `ontology.md`에 따라 구현.

- **대안·트레이드오프:** 운송 점유 관리는 기존 `occupied` 맵 재사용 vs 별도 구조 → 재사용 선택(낮은 복잡도), 만료 처리는 `advanceTime`에서 한 번에 vs 개별 명령마다 → 일괄 처리 선택(명확한 호출 시점), 등급 검사는 `Storage.supports()` vs State 확장 → Storage 메서드 선택(책임 분리).

- **검증 계획:** 기존 회귀 테스트(모든 기존 명령 통과), 불변식 검증(I1-I14), 엣지 케이스(격리+예약, 만료+운송, 등급+상호작용, 원자성, 재전송), `pnpm check` 게이트 통과.

## 설계 원칙

1. **기존 구조 유지:** `src/lab/` 모듈 구조(events.ts, state.ts, samples.ts, reservations.ts, quality.ts, storage.ts, transit.ts) 그대로 유지
2. **types.ts 불변:** 공개 계약은 이미 완성됨, 구현만 채움
3. **정책 준수:** `docs/` 정책 문서와 `agents/context/ontology.md` 온톨로지 완전 준수

## 접근

### 1. 격리 (Quarantine)
- **전략:** 시료의 `quarantined` 불린 필드만 토글, 예약·생애·운송 상태와 무관하게 독립적으로 관리
- **구현 위치:** `quality.ts` 모듈에서 `quarantine`, `release` 명령
- **검사 지점:** `split`, `reserve`, `consume`에서만 검사, 취소·폐기·이동·운송은 허용
- **불변식:** 격리 중에도 기존 예약(상태·양·만료)은 변경되지 않음

### 2. 보관 등급 (Storage Grade)
- **전략:** 용기의 지원 등급 목록(`supportedGrades`)에 정확히 일치(상하 관계 없음) — `storage.supports()` 재사용
- **구현 위치:** 시료 이동 지점(`receive`, `split`, `move`, `startTransit`)에서 검사
- **상속:** 분취 자식은 부모의 `storageGrade`를 이어받음, 이후 변경 불가
- **에러:** `STORAGE_INCOMPATIBLE` 반환

### 3. 예약 만료 (Reservation Expiry)
- **전략:** 논리 시각(`now`)을 절대값으로 관리, `advanceTime` 명령에서 한 번에 만료 처리
- **구현 위치:** `reservations.ts`에서 `advanceTime` 명령, `reserve`에서 `expiresAt` 유효성 검사
- **만료 규칙:** `expiresAt <= now`인 모든 ACTIVE 예약을 `EXPIRED`로 변경, 양만 풀림
- **불변식:** 만료는 예약 양의 해제이지, 시료의 remaining·consumedQty·discardedQty와 무관

### 4. 운송 (Transit)
- **전략:** 2단계 절차(시작→도착/취소)로 구현, 출발 용기는 점유 유지, 목적 용기는 배타적 확보
- **구현 위치:** `transit.ts` 모듈에서 `startTransit`, `confirmArrival`, `cancelTransit` 명령
- **점유 관리:** 기존 `occupied` 맵을 재사용 (출발 용기도, 목적 용기도 같은 map)
- **운송 중 제한:** `split`, `consume`, `discard`, `move`는 불가 (`IN_TRANSIT`), `reserve`, `cancel` 등은 가능

## 구현 계획

### 1. 격리 (`src/lab/quality.ts`)

**명령:** `quarantine`, `release`

**구현 단계:**
1. `active(s, sampleId)` 확인 (UNKNOWN_SAMPLE, NOT_ACTIVE)
2. 이미 같은 상태면 성공 (docs/quality.md)
3. `sample.quarantined` 토글

**검사 위치:**
- `split`: 격리된 부모 → `QUARANTINED`
- `reserve`: 격리된 시료 → `QUARANTINED`
- `consume`: 격리된 시료 → `QUARANTINED`

**기존 명령과의 상호작용:**
- `cancel`: 격리 중에도 가능 (예약 양만 풀림)
- `move`: 격리 중에도 가능
- `discard`: 격리 중에도 가능
- `transferCustody`: 격리 중에도 가능
- `startTransit`: 격리 중에도 가능

### 2. 보관 등급 (`src/lab/storage.ts`, 사용처: `samples.ts`, `reservations.ts`, `transit.ts`)

**기존 메서드 확장:**
- `Storage.supports(containerId: ID, grade: StorageGrade): boolean` 이미 구현됨

**사용 위치:**
1. `receive`: 받기 시 등급 확인
   - `storage.supports(containerId, input.storageGrade)` 확인
   - 실패 → `STORAGE_INCOMPATIBLE`

2. `split`: 분취 자식의 용기 등급 확인
   - 각 자식에 대해 `storage.supports(ch.containerId, parent.storageGrade)` 확인
   - 분취 자식 생성 시 `storageGrade: parent.storageGrade` 설정 (현재 TODO)

3. `move`: 이동 대상 용기 등급 확인
   - `storage.supports(targetContainerId, x.storageGrade)` 확인

4. `startTransit`: 운송 목적 용기 등급 확인
   - `storage.supports(targetContainerId, x.storageGrade)` 확인

### 3. 예약 만료 (`src/lab/reservations.ts`)

**명령:** `advanceTime(eventId, to)`

**구현 단계:**
1. `to` 유효성 검사: 정수, >= 0, >= s.now
   - 범위 벗어남 → `INVALID_INPUT`

2. `s.now = to`

3. 모든 ACTIVE 예약 순회
   - `expiresAt !== null && expiresAt <= now` 조건 확인
   - 해당 예약 상태를 `EXPIRED`로 변경
   - 해당 시료의 reserved 감소

4. 하나의 이벤트로 기록

**`reserve` 메서드 수정:**
- `expiresAt` 유효성 검사 추가
  - `null` 또는 정수 && `> s.now`
  - 아니면 `INVALID_INPUT`

### 4. 운송 (`src/lab/transit.ts`)

**명령:** `startTransit`, `confirmArrival`, `cancelTransit`

**상태 모델:**
- 운송 ID는 종류별 고유 (끝난 것도 재사용 불가)
- 운송 상태: ACTIVE → ARRIVED/CANCELED
- 시료는 운송 중일 때만 1개 ACTIVE 운송 가능

**State 확장:**
- `transits: Map<ID, TransitView>` 이미 있음
- 목적 용기 확보 추적: `occupied` 맵으로 (이미 있음, 출발 용기 점유로도 사용)

**`startTransit` 구현:**
1. `transitId` 유효성: 새로운 ID → ID_TAKEN, 없으면 생성
2. 시료 확인: `active(s, sampleId)`
3. 운송 중 확인: 해당 시료의 기존 ACTIVE 운송 없음 → `IN_TRANSIT`
4. 목적 용기 확인:
   - 존재 → `UNKNOWN_CONTAINER`
   - 비어 있음 (occupied 맵 확인) → `CONTAINER_OCCUPIED`
   - 용량 확인: `sample.remaining <= container.capacity` → `CAPACITY_EXCEEDED`
   - 등급 확인: `storage.supports(targetContainerId, sample.storageGrade)` → `STORAGE_INCOMPATIBLE`
5. 운송 생성:
   - `s.transits.set(transitId, { transitId, sampleId, sourceContainerId: sample.containerId, targetContainerId, status: "ACTIVE" })`
   - 목적 용기 확보: `s.occupied.set(targetContainerId, sampleId)` (임시로, 도착 후 해제)
   - 출발 용기는 이미 occupied에 있음

**`confirmArrival` 구현:**
1. 운송 확인: `s.transits.get(transitId)`
   - 없음 → `UNKNOWN_TRANSIT`
   - 상태 ACTIVE 아님 → `TRANSIT_CLOSED`
2. 시료 이동: 출발 → 목적
   - 출발 용기 해제: `s.occupied.delete(sourceContainerId)`
   - 목적 용기 배정: `s.occupied.set(targetContainerId, sampleId)`
   - 시료의 containerId 업데이트: `sample.containerId = targetContainerId`
3. 운송 상태: `transit.status = "ARRIVED"`

**`cancelTransit` 구현:**
1. 운송 확인: `s.transits.get(transitId)`
   - 없음 → `UNKNOWN_TRANSIT`
   - 상태 ACTIVE 아님 → `TRANSIT_CLOSED`
2. 목적 용기 확보 해제: `s.occupied.delete(targetContainerId)`
   - 출발 용기는 이미 occupied에 있으니 그대로
3. 운송 상태: `transit.status = "CANCELED"`

**운송 중 명령 제한:**
- `split`: 시료의 ACTIVE 운송 확인 → `IN_TRANSIT`
- `consume`: 시료의 ACTIVE 운송 확인 → `IN_TRANSIT`
- `discard`: 시료의 ACTIVE 운송 확인 → `IN_TRANSIT`
- `move`: 시료의 ACTIVE 운송 확인 → `IN_TRANSIT`
- `startTransit`: 같은 시료의 다른 ACTIVE 운송 → `IN_TRANSIT`

**헬퍼 함수:**
```typescript
function inTransit(s: State, sampleId: ID): boolean {
  for (const t of s.transits.values()) {
    if (t.status === "ACTIVE" && t.sampleId === sampleId) return true;
  }
  return false;
}
```

## 대안·트레이드오프

### 1. 운송 점유 관리: occupied 맵 재사용 vs 별도 구조

**선택:** occupied 맵 재사용

- **이유:**
  - 기존 `occupied: Map<ID, ID>` (containerId → sampleId)는 출발 용기 점유만 관리
  - 목적 용기 확보도 같은 맵에 저장 (도착 후 출발 해제, 목적 설정)
  - 불변식: 용기당 최대 1개 시료 또는 확보만 가능 (I2, I14)
  - 복잡도: 낮음, 일관성 유지 용이

- **대안:** 목적 용기 확보를 별도 맵 (`reservedContainers`)으로 관리
  - 장점: 두 상태를 명확히 분리
  - 단점: 중복 코드, 동기화 부담, 불변식 검증 어려움

### 2. 만료 처리: advanceTime에서 한 번에 vs 개별 명령마다

**선택:** advanceTime에서 한 번에 (일괄 처리)

- **이유:**
  - 정책: "시각 진행 시 expiresAt <= now인 ACTIVE 예약은 모두 EXPIRED로 상태 변경" (reservations.md, 불변식 I13)
  - 호출 시점이 명확: `advanceTime` 명령 1회 = 1 이벤트
  - 성능: O(예약 개수) 한 번, 기존 명령마다 검사하지 않아도 됨

- **대안:** 개별 명령(`reserve`, `cancel`, `consume`)마다 만료 확인
  - 장점: 만료 상태 조기 감지
  - 단점: 폴링 패턴, 불필요한 검사, 이벤트 수 증가

### 3. 등급 검사 위치: Storage 메서드 vs State 확장

**선택:** Storage.supports() 메서드 + 명령별 호출

- **이유:**
  - 기존: `storage.supports(containerId, grade)` 이미 구현됨
  - 일관성: 모든 이동(receive, split, move, startTransit)에서 같은 로직
  - 책임: 저장소 정책 = Storage 모듈

- **대안:** State에 검사 메서드 추가 (`State.canStore()`)
  - 장점: 중앙화된 검사
  - 단점: 책임 혼재, 모듈 간 의존성 증가

## 검사 규칙 정리

| 검사 | 위치 | 에러 |
| --- | --- | --- |
| 격리 분취/예약/소비 | split/reserve/consume | QUARANTINED |
| 등급 일치 | receive/split/move/startTransit | STORAGE_INCOMPATIBLE |
| 운송 중 | split/consume/discard/move/startTransit | IN_TRANSIT |
| 만료 예약 검사 | cancel/consume에서는 ACTIVE 상태만 확인 (이미 구현) | RESERVATION_CLOSED |

## 테스트 전략

1. **기존 기능:** 모든 기존 명령이 통과하는지 확인
2. **격리:**
   - quarantine/release 중복 호출 성공
   - 격리 중 분취/예약/소비 거절
   - 격리 중 취소/폐기/이동/운송 허용
3. **보관 등급:**
   - 등급 불일치 시 receive/split/move/startTransit 거절
   - 분취 자식이 부모 등급 상속
4. **예약 만료:**
   - advanceTime으로 시각 진행
   - 만료 예약 자동 상태 변경
   - 만료 후 cancel/consume 거절
5. **운송:**
   - startTransit/confirmArrival/cancelTransit 정상 동작
   - 운송 중 제한 명령 거절
   - 운송 목적 용기 확보 확인

## 검증 계획

### 1. 기존 기능 회귀 테스트
- **대상:** `receive`, `split`, `reserve`, `cancel`, `consume`, `discard`, `move`, `transferCustody`
- **목표:** 새 기능 추가 전후로 기존 명령의 동작이 변하지 않았는지 확인
- **방법:** 기존 테스트 케이스 전체 통과 확인, `pnpm check` 게이트 통과

### 2. 정책 불변식 검증 (I1-I14)
- **I1:** 계보마다 받은 양 = Σ(remaining + consumedQty + discardedQty)
  - `receive`, `split`, `consume`, `discard` 후 확인
- **I2:** ACTIVE 시료와 용기의 1:1 관계, 끝난 시료는 containerId null
  - 격리·운송 추가 후에도 관계 유지
- **I3:** remaining ≤ 용기 용량, 0 ≤ reserved ≤ remaining
  - 예약 만료 후, 운송 도착 후 확인
- **I4:** reserved = 그 시료의 ACTIVE 예약 양 합
  - advanceTime으로 예약 만료 후 확인
- **I6, I7, I8, I9:** 이벤트·이력 일관성 (기존)
- **I12:** 시료의 등급은 지원 목록에 정확히 들어 있고, 변경 불가
  - 분취·이동·운송 후 확인
- **I13:** ACTIVE 예약의 expiresAt > now
  - advanceTime 후 확인
- **I14:** ACTIVE 운송의 시료와 용기, 목적 용기 확보 상태
  - startTransit → confirmArrival/cancelTransit 흐름 확인

### 3. 엣지 케이스

**격리 + 예약·분취:**
- 격리된 시료의 새 예약 거절 ✓
- 격리된 시료의 분취 거절 ✓
- 격리된 시료의 기존 예약 취소는 허용 ✓

**만료 + 운송:**
- 운송 중인 시료의 예약이 시각 진행으로 만료되는지 확인
- 만료된 예약 양은 풀리지만, 시료는 여전히 운송 중

**등급 + 격리·운송:**
- 격리된 시료의 이동은 여전히 등급 검사 필요
- 운송 중인 시료는 목적 용기 등급 확인 필요

**원자성:**
- 여러 자식 분취 중 하나라도 등급 부적합하면 전부 실패
- 운송 목적 용기 확보 후 시료 이동 전 실패 → 롤백

**재전송 (E5):**
- 성공한 명령의 재전송: 격리·운송 등 새 명령도 처음 Receipt 그대로 반환
- 실패한 명령의 재전송: 기록 없으므로 재실행
