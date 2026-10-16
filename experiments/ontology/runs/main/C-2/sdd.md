# 0040: 연구실 시료 보관 엔진 — SDD

요구사항: [prd.md](prd.md)

## 설계

- **읽은 문서:** src/lab/types.ts (공개 계약), prd.md (규칙 8개·에러 코드 매트릭스)
- **접근:** Lab 인스턴스는 상태 저장소(시료, 예약, 용기 점유, 이벤트 이력)를 가진 인메모리 엔진. 핵심: (1) 멱등성 우선 (eventId 확인이 R1~R6보다 먼저), (2) 검증-변경 분리 (검증 통과 후 원자성 있게 상태 변경), (3) split 원자성 (여러 자식 생성 중 실패 시 모두 롤백)
- **대안·트레이드오프:**
  1. 계보 전체 수량 검증: 매번 vs 사후. 선택: 이벤트 이력으로 테스트 검증 (성능 · 공간 효율)
  2. 멱등성 판단: 각 명령마다 vs 공통 함수. 선택: executeCommand 래퍼 (코드 중복 최소화)
  3. split 원자성: 롤백 스택 vs 사전 검증 후 한 번에 생성. 선택: 후자 (상태 불변성)
  4. 용기 점유: Map vs 각 컨테이너 객체. 선택: Map<containerId, sampleId | null> (O(1) 조회)
- **파일 계획:** src/lab/lab.ts에 Lab 클래스 (8개 명령 메서드 + snapshot). createLab(catalog) 팩토리 함수. 내부: samples/reservations/containerUsage/successfulEvents/events/nextSeq.
- **위험:** 
  - split 원자성 미흡: 부분 생성 가능성 (검증 완료 후 상태 변경 필수)
  - 멱등성 우선순위: R7.1이 다른 검사보다 먼저 (조건부)
- **검증 계획:** (1) 명령별: 수성공·모든 실패·멱등성·원자성, (2) 규칙별 R1~R8 각각 시나리오, (3) 사용자 예시 5개, (4) 엣지 케이스 (qty 범위, 용기 등), (5) 멱등성 재시도 시나리오

## 계획과 달라진 점

규칙 8개와 예시 5개가 완전히 정의되어 있어 설계 변경 없음. 예상한 대로 진행.

## 검증 결과

(구현 및 테스트 후 기록)

---

## 내부 상태 구조

### Lab 인스턴스의 필드

```typescript
class Lab {
  private catalog: Catalog;
  private samples: Map<ID, SampleState>;
  private reservations: Map<ID, ReservationState>;
  private containerUsage: Map<ID, ID | null>;  // containerId -> sampleId or null
  private successfulEvents: Map<ID, { op: string; args: unknown; receipt: Receipt }>;
  private events: EventView[];
  private nextSeq: number = 1;
}

interface SampleState {
  sampleId: ID;
  parentId: ID | null;
  rootId: ID;
  remaining: Qty;
  reserved: Qty;
  consumedQty: Qty;
  discardedQty: Qty;
  status: SampleStatus;
  containerId: ID | null;
  custodianId: ID;
}

interface ReservationState {
  reservationId: ID;
  sampleId: ID;
  qty: Qty;
  status: ReservationStatus;
}
```

---

## 명령 핸들러 의사 코드 (각 명령)

### 공통 패턴

```
1. 멱등성 확인(eventId, op, args)
   - 성공한 eventId이고 같은 명령·인자면 Receipt 반환 (종료)
   - 성공한 eventId이고 다른 명령/인자면 EVENT_CONFLICT 반환
2. 검증 (부작용 없음)
   - 입력 유효성: R1의 ID, 양, 참조
   - 비즈니스 검증: R2~R6
3. 상태 변경 (검증 통과 후)
   - samples/reservations/containerUsage 업데이트
4. 이력 기록
   - events에 EventView 추가 (seq 증가, args 깊은 복사)
   - successfulEvents에 eventId 기록
5. Receipt 반환 { eventId, seq }
```

### receive(eventId, input)

```
1. 멱등성 확인 → Receipt 또는 ERROR_CONFLICT
2. 검증:
   - qty ∈ [1, 1M] → INVALID_INPUT
   - sampleId 미사용 → ID_TAKEN
   - containerId ∈ catalog → UNKNOWN_CONTAINER
   - custodianId ∈ catalog → UNKNOWN_CUSTODIAN
   - containerUsage[containerId] == null → CONTAINER_OCCUPIED
   - capacity >= qty → CAPACITY_EXCEEDED
3. 상태 변경:
   - samples[sampleId] = { parentId: null, rootId: sampleId, remaining: qty, ... }
   - containerUsage[containerId] = sampleId
4. 이력 기록 (op: "receive", args: { sampleId, containerId, custodianId, qty })
```

### split(eventId, parentId, children)

```
1. 멱등성 확인
2. 검증:
   - children.length > 0 → INVALID_INPUT
   - children[*].qty ∈ [1, 1M] → INVALID_INPUT
   - parentId ∈ samples → UNKNOWN_SAMPLE
   - parent.status == ACTIVE → NOT_ACTIVE
   - children[*].sampleId 미사용 → ID_TAKEN
   - children[*].containerId ∈ catalog → UNKNOWN_CONTAINER
   - children의 containerId 중복 또는 parent.containerId 포함 → CONTAINER_OCCUPIED
   - containerUsage[children[*].containerId] == null → CONTAINER_OCCUPIED
   - sum(children[*].qty) <= parent.remaining - parent.reserved → INSUFFICIENT
   - children[*]: capacity >= qty → CAPACITY_EXCEEDED
3. 상태 변경 (원자성: 모두 또는 무):
   - 각 child: samples[sampleId] = { parentId, rootId: parent.rootId, ... }
   - 각 child: containerUsage[containerId] = sampleId
   - parent.remaining -= sum(children[*].qty); if == 0: status = DEPLETED
4. 이력 기록 (op: "split", args: { parentId, children: deepCopy(children) })
```

### reserve, cancel, consume, discard, move, transferCustody

(각 명령의 의사 코드는 prd.md의 명령 설명과 유사. 멱등성-검증-변경-이력의 4단계 따름)

---

## 구현 전략

### 1. 멱등성 구현 (R7)

eventId → { op, args, receipt } 매핑

```typescript
private checkIdempotency(eventId: ID, op: string, args: unknown): Result<Receipt> {
  if (this.successfulEvents.has(eventId)) {
    const record = this.successfulEvents.get(eventId)!;
    if (record.op !== op || !this.argsEqual(record.args, args)) {
      return { ok: false, code: "EVENT_CONFLICT" };
    }
    return { ok: true, value: record.receipt };  // 멱등성 (상태 변경 없음)
  }
  return { ok: true, value: null };  // 새 명령
}

private argsEqual(a: unknown, b: unknown): boolean {
  // 객체 키 순서 무시, 배열 순서 구별, 재귀
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => this.argsEqual(x, b[i]));
  }
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    return aKeys.length === bKeys.length && 
           aKeys.every(k => this.argsEqual((a as any)[k], (b as any)[k]));
  }
  return a === b;
}
```

### 2. 검증-변경 분리 (R8 원자성)

```typescript
private executeCommand<T>(
  eventId: ID, op: string, args: unknown,
  validate: () => Result<T>,
  apply: (payload: T) => void
): Result<Receipt> {
  const idem = this.checkIdempotency(eventId, op, args);
  if (!idem.ok || idem.value) return idem.ok ? { ok: true, value: idem.value! } : idem;

  const result = validate();
  if (!result.ok) return result;

  apply(result.value);

  const seq = this.nextSeq++;
  this.events.push({ seq, eventId, op, args: this.deepCopy(args) });
  this.successfulEvents.set(eventId, { op, args: this.deepCopy(args), receipt: { eventId, seq } });

  return { ok: true, value: { eventId, seq } };
}
```

### 3. split 원자성 (R8.3)

```typescript
private split(eventId: ID, parentId: ID, children: Array<{ sampleId: ID; containerId: ID; qty: Qty }>): Result<Receipt> {
  // ... validate (return error if any fail)
  
  // 상태 변경: 모두 성공하거나 모두 실패
  const parent = this.samples.get(parentId)!;
  for (const child of children) {
    this.samples.set(child.sampleId, { parentId, rootId: parent.rootId, ... });
    this.containerUsage.set(child.containerId, child.sampleId);
  }
  parent.remaining -= children.reduce((s, c) => s + c.qty, 0);
  if (parent.remaining === 0) parent.status = "DEPLETED";

  // ... logging
}
```

### 4. 깊은 복사 (R8.4)

```typescript
private deepCopy(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(x => this.deepCopy(x));
  const copy: any = {};
  for (const [k, v] of Object.entries(obj)) {
    copy[k] = this.deepCopy(v);
  }
  return copy;
}
```

---

## 테스트 시나리오

| 규칙/명령 | 테스트 항목 |
|---------|----------|
| R1 | ID_TAKEN, UNKNOWN_*, CONTAINER_OCCUPIED, CAPACITY_EXCEEDED, INVALID_INPUT |
| R2 | 계보 생성, 양의 합, 부모 DEPLETED, 계보 전체 수량 보존 |
| R3 | 이용 가능량, INSUFFICIENT, 소비 전량, RESERVATION_CLOSED |
| R4 | 상태 전이, 폐기 제약, 부모-자식 독립, 용기 반환 |
| R5 | move 검증, split 용기, CONTAINER_OCCUPIED, CAPACITY_EXCEEDED |
| R6 | 책임 상속, transferCustody 독립 |
| R7 | 멱등성 재시도, EVENT_CONFLICT, 실패 eventId 재시도 |
| R8 | 이벤트 로깅, 실패 격리, split 원자성, args 깊은 복사 |
| 예시 | 1~5 모두 통과 |
