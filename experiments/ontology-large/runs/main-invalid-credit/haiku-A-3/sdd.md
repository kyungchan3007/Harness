# 0040 — 시료 보관 엔진: 격리·보관 등급·예약 만료·운송 — SDD

요구사항: [prd.md](prd.md)

## 설계

- **접근:**
  - 모듈별 기능 추가: 각 기능을 해당 모듈에서 구현하되, 기존 API와 상태 구조는 최소 변경
  - 상태 필드 추가: `State.reservedContainers` Map을 추가하여 운송 중 목적 용기 확보 추적
  - 기존 규칙 준수: engine.md·quality.md·storage.md·reservations.md·transit.md의 정책을 모두 구현하고 테스트로 검증
  - 원자성 보장: 모든 명령이 Engine.run()을 거치므로 E5(재전송)·E6(원자성) 자동 준수
  
- **대안·트레이드오프:**
  - 운송 목적 용기 확보: `State.reservedContainers: Map<transitId, targetContainerId>` 선택 (장점: 추적 명확, 중복 확보 방지 간단 / 대안: 용기당 운송 ID 리스트는 복잡도 증가)
  - 격리 중 예약: 새 예약·소비만 거절, 기존 예약은 유지·취소 허용 (장점: 기존 약속 이행 가능 / 대안: 모든 예약 차단은 가혹)
  - 만료 판정: `advanceTime`에만 처리, `reserve` 시 미래만 허용 (장점: 이벤트 명확, 일관성 / 대안: 매 명령 만료 확인은 오버헤드)

- **검증 계획:**
  - 단위 테스트: 격리(상태 전환·명령 거절·허용), 보관 등급(receive·split·move·startTransit), 예약 만료(advanceTime·reserve·cancel·consume), 운송(시작·도착·취소·중 금지·허용), E5 재전송, E6 원자성
  - 통합 테스트: 격리된 시료의 운송 거절, 운송 도착 후 격리 가능, 다중 운송 목적 용기 중복 방지
  - `pnpm check` ALL PASS

### 통합 테스트

- 격리된 시료의 운송 시작 거절 (`QUARANTINED`)
- 운송 도착 후 격리 가능 (도착은 격리 여부 미변경)
- 예약 만료 후 시각 역행 불가 (상태 영구 반영)
- 다중 운송 간 목적 용기 중복 확보 방지

## 1. 아키텍처 개요

기존 모듈 구조 유지:
- `lab.ts`: 진입점 (변경 없음)
- `events.ts`: 명령 실행·재전송·이력 (변경 없음)
- `state.ts`: 상태 및 조회 (변경 없음)
- `samples.ts`: 시료 명령 (보관 등급 검사 추가, 하드코딩 값 제거)
- `reservations.ts`: 예약·시각 명령 (advanceTime 구현)
- `quality.ts`: 격리 명령 (quarantine, release 구현)
- `transit.ts`: 운송 명령 (세 메서드 모두 구현)
- `storage.ts`: 용기 조회 (변경 없음, supports() 메서드 이용)

## 2. 상태 변경

### State 추가 필드 (state.ts)

운송 중 목적 용기 확보 추적:
```
/** transitId → targetContainerId */
reservedContainers: Map<ID, ID>
```

초기화: `initialState()`에서 `reservedContainers: new Map()` 추가
복사: `copyState()`에서 `reservedContainers: new Map(s.reservedContainers)` 추가

## 3. 보관 등급 검사 로직

### Storage 메서드 활용

`storage.ts`의 `supports(id, grade)` 메서드를 이용해 매번 검사:

```typescript
if (!storage.supports(targetContainerId, sample.storageGrade)) {
  return "STORAGE_INCOMPATIBLE";
}
```

### 적용 위치

1. **samples.ts - receive()**: 입력 용기가 시료의 요구 등급 지원 여부 확인
2. **samples.ts - split()**: 자식 각각의 용기가 부모의 등급(상속됨) 지원 여부 확인
3. **samples.ts - move()**: 목적 용기가 시료의 등급 지원 여부 확인
4. **transit.ts - startTransit()**: 목적 용기가 시료의 등급 지원 여부 확인

## 4. 격리 구현 (quality.ts)

### quarantine(eventId, sampleId)

```typescript
return engine.run(eventId, "quarantine", { sampleId }, (s) => {
  const x = active(s, sampleId);
  if (typeof x === "string") return x;
  x.quarantined = true;
  return null;
});
```

이미 격리됐어도 성공.

### release(eventId, sampleId)

```typescript
return engine.run(eventId, "release", { sampleId }, (s) => {
  const x = active(s, sampleId);
  if (typeof x === "string") return x;
  x.quarantined = false;
  return null;
});
```

이미 해제됐어도 성공.

### 격리 상태 검사

다음 명령 시작 시 검사 (이미 ACTIVE 검사 후):

- `split()`: `if (parent.quarantined) return "QUARANTINED";`
- `reserve()`: `if (x.quarantined) return "QUARANTINED";`
- `consume()`: 예약의 시료를 확인하여 격리됐으면 `QUARANTINED` (이미 reserve에서 검사됨)

## 5. 예약 만료 구현 (reservations.ts)

### advanceTime(eventId, to)

```typescript
return engine.run(eventId, "advanceTime", { to }, (s) => {
  // 입력 검사
  if (!Number.isInteger(to) || to < 0 || to > Number.MAX_SAFE_INTEGER) return "INVALID_INPUT";
  if (to < s.now) return "INVALID_INPUT";
  
  // 시각 진행
  s.now = to;
  
  // 만료 예약 처리
  for (const r of s.reservations.values()) {
    if (r.status === "ACTIVE" && r.expiresAt !== null && r.expiresAt <= to) {
      r.status = "EXPIRED";
      s.samples.get(r.sampleId)!.reserved -= r.qty;
    }
  }
  
  return null;
});
```

### reserve() 예약 만료 시각 검사

```typescript
if (input.expiresAt !== null) {
  if (!Number.isInteger(input.expiresAt) || input.expiresAt < 0 || input.expiresAt > Number.MAX_SAFE_INTEGER) return "INVALID_INPUT";
  if (input.expiresAt <= s.now) return "INVALID_INPUT";
}
```

## 6. 운송 구현 (transit.ts)

### startTransit(eventId, input: { transitId, sampleId, targetContainerId })

```typescript
return engine.run(eventId, "startTransit", input, (s) => {
  // 입력 검사
  if (typeof input.transitId !== "string" || typeof input.sampleId !== "string" || typeof input.targetContainerId !== "string") {
    return "INVALID_INPUT";
  }
  if (s.transits.has(input.transitId)) return "ID_TAKEN";
  
  // 시료 검사
  const x = active(s, input.sampleId);
  if (typeof x === "string") return x;
  if (x.quarantined) return "QUARANTINED";
  
  // 목적 용기 검사
  const tc = storage.get(input.targetContainerId);
  if (!tc) return "UNKNOWN_CONTAINER";
  if (!storage.isFree(s, input.targetContainerId)) return "CONTAINER_OCCUPIED";
  if (x.remaining > tc.capacity) return "CAPACITY_EXCEEDED";
  if (!storage.supports(input.targetContainerId, x.storageGrade)) return "STORAGE_INCOMPATIBLE";
  
  // 운송 생성 및 목적 용기 확보
  s.transits.set(input.transitId, {
    transitId: input.transitId,
    sampleId: input.sampleId,
    sourceContainerId: x.containerId!,
    targetContainerId: input.targetContainerId,
    status: "ACTIVE",
  });
  s.reservedContainers.set(input.transitId, input.targetContainerId);
  
  return null;
});
```

### confirmArrival(eventId, transitId)

```typescript
return engine.run(eventId, "confirmArrival", { transitId }, (s) => {
  const t = s.transits.get(transitId);
  if (!t) return "UNKNOWN_TRANSIT";
  if (t.status !== "ACTIVE") return "TRANSIT_CLOSED";
  
  // 시료 이동
  const x = s.samples.get(t.sampleId)!;
  s.occupied.delete(x.containerId!);
  s.occupied.set(t.targetContainerId, t.sampleId);
  x.containerId = t.targetContainerId;
  
  // 운송 상태 업데이트 및 목적 용기 확보 해제
  t.status = "ARRIVED";
  s.reservedContainers.delete(transitId);
  
  return null;
});
```

### cancelTransit(eventId, transitId)

```typescript
return engine.run(eventId, "cancelTransit", { transitId }, (s) => {
  const t = s.transits.get(transitId);
  if (!t) return "UNKNOWN_TRANSIT";
  if (t.status !== "ACTIVE") return "TRANSIT_CLOSED";
  
  // 운송 상태 업데이트 및 목적 용기 확보 해제
  t.status = "CANCELED";
  s.reservedContainers.delete(transitId);
  
  return null;
});
```

### 운송 중 금지 명령 검사

다음 메서드 시작 시 확인 (ACTIVE 검사 후):

```typescript
// 시료가 운송 중인가?
const inTransit = Array.from(s.transits.values()).some(
  (t) => t.status === "ACTIVE" && t.sampleId === sampleId
);
if (inTransit) return "IN_TRANSIT";
```

적용: `split()`, `consume()`, `discard()`, `move()`

### Storage.isFree() 업데이트

목적 용기 확보 고려:

```typescript
isFree(s: State, id: ID): boolean {
  return !s.occupied.has(id) && !Array.from(s.reservedContainers.values()).includes(id);
}
```

## 7. 분취 자식 등급 상속

### samples.ts - split()

자식 생성 시 등급 설정:
```typescript
storageGrade: parent.storageGrade,  // 부모 등급 상속
```

현재 하드코딩된 `"AMBIENT"` 제거.

## 8. 테스트 전략

- 격리: 격리 상태 전환, 격리 중 명령 거절
- 보관 등급: 호환/비호환 용기, 각 명령에서 검사
- 예약 만료: 시각 진행, 만료 판정, 양 풀림
- 운송: 시작·도착·취소, 중 금지/허용 명령, 목적 용기 확보·해제

## 9. 모듈 간 의존성

- `quality.ts`: `active()`, `Engine` 사용
- `reservations.ts`: `active()`, `isQty()`, `Engine` 사용
- `transit.ts`: `active()`, `Engine`, `Storage` 사용
- `samples.ts`: `storage.supports()` 추가 호출
- `storage.ts`: `reservedContainers` 반영

## 10. 위험 요소

1. **상태 복사**: `copyState()`에 `reservedContainers` 추가 필수
2. **E5 재전송**: eventId 재사용 시 이전 transit 상태도 고려 (canon 함수는 이미 처리)
3. **원자성**: 운송 시작 실패 시 목적 용기 확보 미생성 (이미 구현됨)
4. **E6 원자성**: 여러 예약 만료는 한 이벤트 하나로 (loop에서 상태만 변경)
