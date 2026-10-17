# 0040-lab SDD — 시료 보관 엔진 확장 설계

## 개요

기존 모듈 구조를 따라 새 기능을 구현합니다. 각 명령 집합은 독립적인 모듈로, `Engine`을 통해 재전송 판정·원자성·이력을 관리합니다.

---

## 1. 아키텍처

### 계층
```
Lab (public) ←── Commands (modules) ←── Engine + Storage + State
    ↓                                        ↓
[createLab] ────→ [sampleCommands]      [run() / E5 E6]
                 [reservationCommands]  [copyState]
                 [qualityCommands]      [occupied map]
                 [transitCommands]
```

### 기존 모듈 (수정 필요)
- **samples.ts**: receive, split, split에서 storageGrade 상속 + 보관 등급 검사
- **reservations.ts**: advanceTime 추가 + 격리·운송 중 제한

### 새 모듈
- **quality.ts**: quarantine, release
- **transit.ts**: startTransit, confirmArrival, cancelTransit

---

## 2. State 확장

현재 `State` (src/lab/state.ts)에서 관리하는 것:
- `now: Tick` — 논리 시각 (0에서 시작)
- `samples: Map<ID, SampleView>` — 모든 시료 (생명주기 포함)
- `reservations: Map<ID, ReservationView>` — 모든 예약
- `transits: Map<ID, TransitView>` — 모든 운송
- `occupied: Map<ID, ID>` — 용기 → 시료 (또는 운송 예약)
- `seen: Map<ID, ...>` — 재전송 판정 (E5)

### 필요한 변경
1. **운송 예약 추적**: `occupied` 맵에서 "이 용기는 운송 목적지로 예약됨"을 구별
   - 현재: `occupied.has(id)` → 점유 여부
   - 필요: 운송 예약 상태도 확보(CONTAINER_OCCUPIED) 판정에 포함

**설계:** `occupied` 맵의 용도를 명확히 유지. 운송 목적 용기는 `occupied`에 특수한 마커로 추가할 수 있음.
- 대안 1: `occupied` 맵에 특수 ID 저장 (예: `"__transit_N"`)
- 대안 2: 별도 맵 `transitTargets: Map<ID, ID>` (용기 → 운송 ID)

**선택: 대안 2** — 명확성과 테스트 용이성

### State 인터페이스 확장
```typescript
export interface State {
  // 기존
  now: Tick;
  samples: Map<ID, SampleView>;
  reservations: Map<ID, ReservationView>;
  transits: Map<ID, TransitView>;
  events: EventView[];
  seen: Map<ID, { op, key, receipt }>;
  occupied: Map<ID, ID>;
  
  // 신규
  transitTargets: Map<ID, ID>;  // 용기 → 운송 ID (목적 용기 예약 추적)
}
```

---

## 3. Storage 확장

### 기존 메서드
- `get(id: ID): ContainerInfo | undefined`
- `isFree(s: State, id: ID): boolean` — `!s.occupied.has(id)`
- `supports(id: ID, grade: StorageGrade): boolean` — 보관 등급 지원

### 필요한 변경
- `isFree()`에서 `transitTargets`도 확인
- 보관 등급 검사를 명시적으로 호출하는 위치 확인 및 추가

### 수정 코드
```typescript
isFree(s: State, id: ID): boolean {
  return !s.occupied.has(id) && !s.transitTargets.has(id);
}
```

---

## 4. 각 모듈별 구현

### 4.1 samples.ts (수정)

#### receive
- **신규**: 보관 등급 검사 추가
  ```
  if (!storage.supports(input.containerId, input.storageGrade))
    return "STORAGE_INCOMPATIBLE";
  ```

#### split
- **기존**: 자식 양 합 검사, 자식 용기 배정
- **신규 1**: 보관 등급 검사 (각 자식 용기)
  ```
  for (const ch of children) {
    if (!storage.supports(ch.containerId, parent.storageGrade))
      return "STORAGE_INCOMPATIBLE";
  }
  ```
- **신규 2**: storageGrade 상속 (현재 TODO 제거)
  ```
  storageGrade: parent.storageGrade,  // 부모 등급 상속
  ```
- **신규 3**: 격리된 시료 제한
  ```
  if (parent.quarantined) return "QUARANTINED";
  ```
- **신규 4**: 운송 중 제한
  ```
  if (s.transitTargets.has(parent.containerId)) return "IN_TRANSIT";
  ```

#### move
- **신규**: 보관 등급 검사, 운송 중 제한
  ```
  if (!storage.supports(targetContainerId, x.storageGrade))
    return "STORAGE_INCOMPATIBLE";
  if (s.transitTargets.has(x.containerId)) return "IN_TRANSIT";
  ```

#### discard
- **신규**: 운송 중 제한
  ```
  if (s.transitTargets.has(x.containerId)) return "IN_TRANSIT";
  ```

---

### 4.2 reservations.ts (수정)

#### reserve
- **신규**: 격리된 시료 제한
  ```
  if (x.quarantined) return "QUARANTINED";
  ```
- **신규**: 입력 검증 (expiresAt)
  ```
  if (input.expiresAt !== null) {
    if (!Number.isInteger(input.expiresAt) || input.expiresAt < s.now)
      return "INVALID_INPUT";
  }
  ```

#### consume
- **신규**: 격리된 시료 제한
  ```
  if (x.quarantined) return "QUARANTINED";
  ```

#### advanceTime (신규)
```typescript
advanceTime(eventId, to) {
  return engine.run(eventId, "advanceTime", { to }, (s) => {
    if (!Number.isInteger(to) || to < s.now) return "INVALID_INPUT";
    
    s.now = to;
    
    // 만료 판정: expiresAt <= now 인 ACTIVE 예약 찾기
    for (const r of s.reservations.values()) {
      if (r.status === "ACTIVE" && r.expiresAt !== null && r.expiresAt <= to) {
        r.status = "EXPIRED";
        s.samples.get(r.sampleId)!.reserved -= r.qty;
      }
    }
    return null;
  });
}
```

---

### 4.3 quality.ts (신규 구현)

```typescript
export function qualityCommands(engine: Engine): Pick<Lab, "quarantine" | "release"> {
  return {
    quarantine(eventId, sampleId) {
      return engine.run(eventId, "quarantine", { sampleId }, (s) => {
        const x = active(s, sampleId);
        if (typeof x === "string") return x;
        x.quarantined = true;
        return null;
      });
    },

    release(eventId, sampleId) {
      return engine.run(eventId, "release", { sampleId }, (s) => {
        const x = active(s, sampleId);
        if (typeof x === "string") return x;
        x.quarantined = false;
        return null;
      });
    },
  };
}
```

---

### 4.4 transit.ts (신규 구현)

```typescript
export function transitCommands(
  engine: Engine,
  storage: Storage
): Pick<Lab, "startTransit" | "confirmArrival" | "cancelTransit"> {
  return {
    startTransit(eventId, input) {
      return engine.run(eventId, "startTransit", input, (s) => {
        if (s.transits.has(input.transitId)) return "ID_TAKEN";
        
        const x = active(s, input.sampleId);
        if (typeof x === "string") return x;
        if (s.transitTargets.has(x.containerId)) return "IN_TRANSIT";
        
        const target = storage.get(input.targetContainerId);
        if (!target) return "UNKNOWN_CONTAINER";
        if (!storage.isFree(s, target.containerId)) return "CONTAINER_OCCUPIED";
        if (!storage.supports(target.containerId, x.storageGrade))
          return "STORAGE_INCOMPATIBLE";
        
        s.transits.set(input.transitId, {
          transitId: input.transitId,
          sampleId: x.sampleId,
          sourceContainerId: x.containerId!,
          targetContainerId: target.containerId,
          status: "ACTIVE",
        });
        s.transitTargets.set(target.containerId, input.transitId);
        return null;
      });
    },

    confirmArrival(eventId, transitId) {
      return engine.run(eventId, "confirmArrival", { transitId }, (s) => {
        const t = s.transits.get(transitId);
        if (!t) return "UNKNOWN_TRANSIT";
        if (t.status !== "ACTIVE") return "TRANSIT_CLOSED";
        
        const x = s.samples.get(t.sampleId)!;
        
        // 시료를 목적 용기로 이동
        s.occupied.delete(t.sourceContainerId);
        s.occupied.set(t.targetContainerId, t.sampleId);
        x.containerId = t.targetContainerId;
        
        // 운송 상태 업데이트
        t.status = "ARRIVED";
        s.transitTargets.delete(t.targetContainerId);
        
        return null;
      });
    },

    cancelTransit(eventId, transitId) {
      return engine.run(eventId, "cancelTransit", { transitId }, (s) => {
        const t = s.transits.get(transitId);
        if (!t) return "UNKNOWN_TRANSIT";
        if (t.status !== "ACTIVE") return "TRANSIT_CLOSED";
        
        // 운송 상태 업데이트
        t.status = "CANCELED";
        s.transitTargets.delete(t.targetContainerId);
        
        return null;
      });
    },
  };
}
```

---

## 5. 통합 체크리스트

### 타입 안전성
- [ ] `State` 인터페이스 확장 (transitTargets)
- [ ] `copyState` 함수 업데이트 (transitTargets 복사)
- [ ] `initialState` 함수 업데이트 (transitTargets 초기화)

### 정책 준수
- [ ] E1: 참조·수용 — 모든 새 명령에서 검증
- [ ] E2: 계보·수량 — split에서 (이미 구현, 유지)
- [ ] E3: 상태·폐기 — 격리·예약 만료는 status와 독립
- [ ] E5: 재전송 — Engine.run()이 자동 처리
- [ ] E6: 원자성 — Engine.run()이 자동 처리

### 상호작용
- [ ] **격리 + 예약 만료**: EXPIRED 예약은 기존 예약 그대로 (격리 상태와 독립)
- [ ] **운송 + 시각 진행**: 운송 중 예약 만료 가능 (만료가 운송 상태 변화 없음)
- [ ] **운송 + 보관 등급**: startTransit에서 목적 용기 검사
- [ ] **다중 실패**: E5 판정 후 다른 검사 진행 (순서 명시 필요)

- **접근:** 기본 전략·각 영역별 구현 방침
  - 기존 Engine 재전송 판정(E5)·원자성(E6) 활용으로 중복 구현 방지
  - 모듈별 책임 분리 — 각 기능 영역(quality, transit, reservations)을 독립적 모듈로 구성
  - State 최소 확장 — `transitTargets` 맵 추가로 운송 목적 용기 추적
  - 기존 코드·계약 유지 — E1~E6 정책은 모든 새 명령에서 일관되게 적용

- **대안·트레이드오프:** 명확성과 유지보수성 우선
  - 운송 목적 용기 추적 방식: 별도 맵 `transitTargets: Map<ID, ID>` 선택 (명확성·타입 안전성·테스트 용이)
  - 트레이드오프: 명확성 우선 (비용: 상태 필드 1개 추가, 메모리·복사)

- **검증 계획:** 자동 검증·테스트 범위·완료 기준
  - 자동 검증: pnpm check (타입 안전성, ESLint, 테스트)
  - 테스트 범위: 각 기능별 정상/오류 케이스, 경계 조건, 원자성, 상호작용
  - 완료 기준: pnpm check 전체 통과, 모든 테스트 녹색, 기존 테스트 회귀 없음
