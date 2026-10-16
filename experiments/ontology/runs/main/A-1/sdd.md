# 0040 — 연구실 시료 보관 엔진 — SDD

요구사항: [prd.md](prd.md)

## 설계

- **읽은 문서:** AGENTS.md, types.ts (공개 계약)
- **접근:**
  - `src/lab/lab.ts`에 `createLab(catalog: Catalog): Lab` 함수 구현
  - Lab 상태: samples(ID → SampleState), reservations(ID → ReservationState), eventLog(eventId → 성공한 명령 기록)
  - 각 메서드는 먼저 R7(같은 eventId 재전송)을 검사하고, 규칙 R1~R6을 순서대로 적용
  - 모든 검증 실패 시 상태 변경 없이 오류 코드 반환 (R8 원자성)
  - 시료 계보(parentId, rootId): 계보 전체의 수량 보존 추적

- **상태 구조:**
  ```
  SampleState {
    sampleId, parentId, rootId, 
    remaining, reserved, consumedQty, discardedQty, 
    status, containerId, custodianId
  }
  ReservationState {
    reservationId, sampleId, qty, status
  }
  EventLog { eventId → { op, args, seq, timestamp } }
  ```

- **대안·트레이드오프:**
  - 깊은 계보 추적 vs 플랫 구조: 자식만 부모 참조 → 필요하면 루트까지 추적. 성능 충분.
  - 예약 취소/소비를 메서드로 vs 한 명령으로: 분리가 규칙을 명확히 함. 선택.
  - 이벤트 로그 저장 vs 재계산: 로그가 감사 추적·재전송 처리에 필수.
  - 수량 검증을 각 메서드에서 vs 헬퍼로: 헬퍼로 정리하되 R2·R3·R8 원자성을 명확히.

- **파일 계획:**
  - `src/lab/lab.ts`: Lab 구현, 8개 메서드 (receive, split, reserve, cancel, consume, discard, move, transferCustody)
  - 테스트는 pnpm 게이트(test suite)에서 확인
  - types.ts는 고정(수정 금지)

- **위험:**
  - R7 비교: 객체 키 순서 무시, 배열 순서는 구별 → JSON 정규화 필요
  - R2 수량 보존: 분취 중 부분 실패 시 원자성 → 모든 자식 검증 후 한 번에 적용
  - R3 이용 가능량 = 남은 양 - reserved 합: 예약/소비/취소 시 일관성 유지
  - R4 DEPLETED/DISCARDED는 용기 해제: 다음 분취/예약 검사에서 containerId null 확인

- **검증 계획:**
  - 각 규칙(R1~R8)별 경계 사례
  - 규칙 조합(예: split 후 예약 후 소비)
  - 같은 eventId 재전송 검증
  - `pnpm check` ALL PASS

## 검증 결과

(구현 후 기록)
