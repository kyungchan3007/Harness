# 0040 — Lab Sample Storage Engine — SDD

요구사항: [prd.md](prd.md)

## 설계

- **접근:**
  1. LabImpl 클래스: Catalog로 유효 엔티티 정의, 메서드별로 검증→상태 업데이트→이력 기록
  2. 멱등성: eventLog Map으로 성공한 eventId 추적, 재전송 시 첫 Receipt 반환
  3. 원자성: 검증 단계에서 모두 실패 확인 후, 통과하면 상태 한 번에 업데이트

- **대안·트레이드오프:**
  1. eventLog: Map<ID, { seq, args }> vs 배열/객체 → Map이 O(1) 멱등성 검사, 이력 보존 분리에 용이
  2. deepEqual로 객체 키 정렬 비교 vs JSON.stringify → 키 순서 무시 요구, 배열 순서 구별 요구를 만족
  3. 상태 업데이트 전 검증 완료 vs 부분 업데이트+롤백 → 원자성 보장이 간단함
  4. args 받을 때 깊은 복사 vs 참조 유지 → R8에서 "호출자가 나중에 고쳐도 이력은 그대로" 요구

- **파일 계획:**
  - src/lab/lab.ts: LabImpl 클래스 (8개 메서드 + snapshot)
  - src/lab/lab.test.ts: 7개 공개 예시 + 엣지 케이스 테스트

- **검증 계획:**
  1. 정합성: 규칙 R1~R8 별로 성공/실패 케이스 + 엣지 케이스
  2. 공개 예시: 5가지 + 계보 깊이, 예약 다중 추가 조합
  3. 멱등성: eventId 재전송 시 동일 Receipt 반환, 상태 불변
  4. 원자성: split 중 한 child 실패 시 전체 롤백, 이벤트 미기록
  5. 경계값: qty=1, qty=1000000, capacity=1 등
  6. pnpm check (타입·린트·테스트) PASS

## 내부 구조

### 자료구조

```typescript
class LabImpl {
  validLocationIds: Set<ID>;
  validCustodianIds: Set<ID>;
  containerMap: Map<ID, { locationId: ID; capacity: Qty }>;
  
  samples: Map<ID, InternalSample>;
  containers: Map<ID, ID | null>;  // containerId → sampleId (또는 null)
  reservations: Map<ID, InternalReservation>;
  
  eventLog: Map<ID, { seq: number; args: unknown }>;
  events: EventView[];
  seq: number;
  
  usedSampleIds: Set<ID>;
  usedReservationIds: Set<ID>;
}
```

### 핵심 불변식

1. **용기 점유**: 한 용기는 최대 한 ACTIVE 샘플 보유
2. **용량**: remaining ≤ container.capacity
3. **예약**: reserved ≤ remaining, ACTIVE 샘플만 예약 가능
4. **계보**: parent 상태 변화가 child에 영향 없음
5. **수량 보존**: rootId 기준으로 ∑remaining + ∑consumedQty + ∑discardedQty = 최초 receive 양
6. **ID 중복**: 모든 ID 공간에서 한 번 사용된 ID는 재사용 불가

### 메서드별 알고리즘

**receive**: 멱등성 검사 → 검증(qty, ID 미사용, 용기 유효·비어있음·용량) → 샘플 생성 & 용기 배정 → 이력 기록

**split**: 멱등성 검사 → 검증(부모 ACTIVE, 자식들 미사용, 용기 유효·비어있음, available ≥ ∑qty) → 부모 qty 감소 & 부모 DEPLETED 여부 판정 → 자식들 생성 → 이력 기록

**reserve**: 멱등성 검사 → 검증(샘플 ACTIVE, reservationId 미사용, available ≥ qty) → 예약 생성 & sample.reserved 증가 → 이력 기록

**cancel**: 멱등성 검사 → 검증(예약 ACTIVE) → 예약 CANCELED & sample.reserved 감소 → 이력 기록

**consume**: 멱등성 검사 → 검증(예약 ACTIVE) → 예약 CONSUMED & remaining·reserved·consumedQty 업데이트→ DEPLETED 여부 판정 → 이력 기록

**discard**: 멱등성 검사 → 검증(샘플 ACTIVE, 예약 없음) → discardedQty 증가 & remaining 0 & DISCARDED → 용기 비우기 → 이력 기록

**move**: 멱등성 검사 → 검증(샘플 ACTIVE, 용기 유효·비어있음·용량, 현재 용기 ≠ 대상) → 이전 용기 비우기 & 새 용기에 배정 → 이력 기록

**transferCustody**: 멱등성 검사 → 검증(샘플 ACTIVE, custodianId 유효) → custodianId 업데이트 → 이력 기록

### 멱등성 구현

```typescript
private checkIdempotence(eventId: ID, args: unknown): Result<Receipt> | null {
  if (this.eventLog.has(eventId)) {
    const logged = this.eventLog.get(eventId)!;
    if (this.deepEqual(args, logged.args)) {
      return { ok: true, value: { eventId, seq: logged.seq } };  // 재사용
    }
    return { ok: false, code: "EVENT_CONFLICT" };
  }
  return null;  // 새 eventId
}
```

deepEqual은 객체 키를 정렬해서 비교하고, 배열 순서는 구별합니다.
cloneArg는 깊은 복사로 호출 시점의 인자를 보존합니다.
