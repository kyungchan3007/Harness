# 0040 — 연구실 시료 보관 엔진 — SDD

요구사항: [prd.md](prd.md)

## 설계

**읽은 문서:** AGENTS.md, PRD, ontology.json
- **접근:** 메모리 내 상태 머신으로 구현. 매 연산마다: (1) 멱등성 레이어 (2) 검증 단계 (3) 상태 갱신(원자적) (4) 이벤트 기록. 역인덱싱으로 O(1) 조회. 규칙 R1~R8, 불변식 I1~I11 모두 만족.
- **대안·트레이드오프:** 상태 머신(현재 상태만 유지)으로 선택. 이유: R7~R8의 멱등성 재전송 시 "상태 그대로" 반환 필수. args는 명령 직후 복사. 부모-자식 상태 변경은 독립적(R4-6).
- **파일 계획:** `src/lab/lab.ts`에 `createLab()` 구현, `src/lab/types.ts` 그대로.
- **위험:** qty 범위(1~1,000,000), 용기 배정(I2), 이용 가능량 계산(계산 전용), split 원자성.
- **검증 계획:** 각 연산별 단위 테스트(정상+오류), 불변식 검증(I1~I7), 공개 예시 5가지, 멱등성, `pnpm check` 통과.

## 핵심 데이터 구조

```typescript
interface LabState {
  samples: Map<ID, Sample>;
  reservations: Map<ID, Reservation>;
  events: Event[];
  usedSampleIds: Set<ID>;  // 끝난 것 포함
  usedReservationIds: Set<ID>;  // 끝난 것 포함
  eventIdToReceipt: Map<ID, { seq, args }>;  // 멱등성 용
  containerToSample: Map<ID, ID>;  // 역인덱스
  nextSeq: number;
}
```

- **Sample**: sampleId, containerId, custodianId, parentId, rootId, remaining, reserved, consumedQty, discardedQty, status.
- **Reservation**: reservationId, sampleId, qty, status.
- **Event**: eventId, op, args(복사본), seq.

## 수량 계산 규칙

- **이용 가능량**: `available = remaining - reserved` (계산, 저장 안 함).
- **분취 체크**: `Σ(자식 qty) <= 부모의 available`.
- **수량 보존(I1)**: `초기량 = Σ(remaining + consumedQty + discardedQty)`.
