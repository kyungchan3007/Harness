# 0040 — 연구실 시료 보관 엔진 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** 요청 규칙 R1~R8, ontology.json (I1~I11)
- **접근:**
  1. 11개 불변식을 상태 검사에 녹인다
  2. R7 재전송 감지: eventId별 기록(op, args, seq) 저장, 깊은 비교로 args 확인
  3. R8 원자성: 모든 검사 먼저, 실패하면 상태 불변, split은 한 거래
  4. Map 기반 상태: samples, reservations, events, containers 맵
  5. args 복사: 깊은 복사로 호출한 쪽의 객체 변형으로부터 보호
- **대안·트레이드오프:**
  - args 깊은 복사 vs. 얕은 복사: 깊은 복사 선택 (R8-3 "받을 때의 값")
  - eventId별 전체 기록 vs. 최신 N개만: 전체 기록 선택 (단순, 명확)
  - 검사 순서: 규칙에서 "자유"라 명시, 논리적 그룹 순서 구현 (조기 실패 효율)
- **파일 계획:** `src/lab/lab.ts` (createLab + 8 명령 + snapshot)
- **검증 계획:**
  1. 단위 테스트 (각 명령): 성공 + 오류 코드별 + R7 재전송 + R8 원자성
  2. 불변식 검증: I1~I11 반례 + 모든 명령 후 만족 확인
  3. 통합: 공개 예시 5개 + 복합 시나리오
  4. 게이트: `pnpm check` (타입, 린트, 테스트)

## 데이터 구조 (내부)

```typescript
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

interface ContainerState {
  containerId: ID;
  locationId: ID;
  capacity: Qty;
  occupiedBySampleId: ID | null;
}

interface EventRecord {
  op: string;
  args: unknown;
  seq: number;
  receipt: Receipt;
}

interface State {
  samples: Map<ID, SampleState>;
  reservations: Map<ID, ReservationState>;
  events: Map<ID, EventRecord>;
  eventSeq: number;
  catalogs: {
    locationIds: Set<ID>;
    custodianIds: Set<ID>;
    containers: Map<ID, ContainerState>;
  };
}
```

## 알고리즘 (각 명령의 흐름)

1. **R7 캐시 확인:** eventId가 이미 기록되어 있으면
   - args가 같음 → 처음 Receipt 반환
   - args가 다름 → EVENT_CONFLICT 반환
2. **모든 검사 수행:** 입력 검사 → ID 중복 → 참조 체크 → 상태 체크 → 계산 검사
3. **상태 업데이트:** 실패 없으면 모든 변경 적용
4. **이벤트 기록:** seq 증가, eventId 저장, Receipt 반환

### 각 명령의 주요 검사
- **receive:** qty 범위, sampleId 미사용, containerId/custodianId 존재, 용기 비어있음, 용량 확인
- **split:** 자식 1개 이상, 부모 ACTIVE, 각 자식의 qty/sampleId/containerId 검사, 총 qty ≤ available
- **reserve:** qty 범위, reservationId 미사용, sampleId 존재 ACTIVE, qty ≤ available
- **cancel, consume:** reservationId 존재 및 ACTIVE
- **discard:** sampleId 존재 ACTIVE, ACTIVE 예약 없음
- **move:** sampleId 존재 ACTIVE, targetContainerId 존재, 비어있음, 용량 확인
- **transferCustody:** sampleId 존재 ACTIVE, custodianId 존재

## 구현 세부사항

- **deepEqual:** 객체는 키 정렬 후 비교, 배열은 순서 유지해서 비교
- **copyArgs:** 깊은 복사, 배열과 객체 재귀 처리
- **snapshot:** seq 순 정렬 후 SampleView/ReservationView/EventView 반환
