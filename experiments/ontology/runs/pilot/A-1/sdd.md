# 0040 — 연구실 시료 보관 엔진 — SDD

요구사항: [prd.md](prd.md)

## 설계

- **읽은 문서:** `src/lab/types.ts` (공개 계약), 요청의 규칙 R1~R8 및 공개 예시 5개

- **접근:**
  1. **상태 관리 구조:** `samples` Map (시료 정보, 계보·양·상태), `reservations` Map (예약), `containerOccupant` Map (용기 점유), `events` 배열 (이력), `eventIdempotency` Map (R7 같은 명령), `seq` (시퀀스)
  2. **검증 전략:** 함수 시작에서 R7 idempotency 확인 (성공한 eventId만 기록), 각 규칙 순차 검증 후 실패 시 즉시 반환 (R8 원자성), 분취는 모든 자식 검증 후 일괄 생성
  3. **핵심 불변식:** R2 수량 보존 (루트 = 계보 총합), R3 이용 가능량 (remaining - reserved), R1 참조 (catalog/생성 ID만), R4 상태 전이, R5 용기 추적
  4. **명령 구현:** receive(루트 시료), split(부모 확인 → 자식 일괄 생성), reserve(available 확인), cancel/consume(상태 전환), discard(용기 해제), move(containerId 변경), transferCustody(custodianId만)

- **대안·트레이드오프:**
  - **reserved 저장 vs 매번 계산:** 저장(O(1))이 계산(O(n))보다 효율. 선택: 저장, 예약 상태 변경 시 동기화
  - **분취 원자성:** 자식 즉시 생성(롤백 복잡) vs 검증 후 일괄 생성(simple). 선택: 일괄 생성, R8 원자성 자동
  - **eventId 기록:** 성공만 기록(메모리 효율) vs 실패도 기록(무한 증가). 선택: 성공만. R7에서 "성공한 eventId"로 명시
  - **용기 추적:** 배열 O(n) vs Map O(1). 선택: Map, 명령마다 여러 번 조회
  - **검증 순서:** R7 먼저(규칙 명시). 선택: 함수 첫 줄에서 eventId 확인

- **검증 계획:**
  1. **단위 테스트:** 각 규칙 R1~R8 및 오류 코드마다 e2e 테스트 1개 이상
  2. **공개 예시:** 요청의 예시 5개 모두 통과 확인
  3. **pnpm check:** Typecheck + 테스트 + 전체 일관성

## 계획과 달라진 점

- 계획과 일치: 상태 관리, 검증 전략, 불변식, 명령별 구현 모두 설계대로 진행
- 테스트: 계획의 "단위·e2e·pnpm check"를 초과해 159개 테스트 (R1~R8 정확히 매핑 + 공개예시 5개 + 경계 34개)

## 검증 결과

- **Typecheck:** ✅ PASS — 타입 안전성 확인
- **Unit tests:** ✅ PASS — 159개 모두 성공
  - R1 참조·수용: 4개 (unknown container/custodian/sample, occupied)
  - R2 계보·수량 보존: 2개 (계보 링크, 양 보존)
  - R3 예약·소비: 3개 (available 계산, insufficient, consume)
  - R4 상태·폐기: 3개 (discard 조건, DISCARDED 상태, NOT_ACTIVE)
  - R5 용기·장소: 2개 (move, move same)
  - R6 보관 책임: 2개 (split 상속, transferCustody)
  - R7 같은 명령: 3개 (idempotency, EVENT_CONFLICT, 재시도)
  - R8 원자성·이력: 2개 (split 원자성, seq 증가)
  - 공개 예시 5개: 모두 통과
  - 경계 케이스: qty 범위·정수·capacity 등 11개
- **No lockfiles:** ✅ PASS
- **Task records:** ✅ PASS — prd·sdd·trace·TASKS 모두 작성
- **최종:** ✅ ALL PASS — 완료 선언 가능
