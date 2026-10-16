# 0040 — 연구실 시료 보관 엔진 — trace

| 날짜 | 작업 | 결과 |
| --- | --- | --- |
| 2026-10-16 DEFINE | prd.md, sdd.md, trace.md 작성 | 규칙 R1~R8 명시, 위험 4가지 식별 |
| 2026-10-16 BUILD | src/lab/lab.ts (536줄), src/lab/lab.test.ts (470줄) | 테스트 70개 작성 |
| 2026-10-16 GATE | pnpm check | (진행 중) |

## 상세 기록

### DEFINE (2026-10-16)
- prd.md 작성: 문제(시료 관리 엔진), 목표(계보·수량·상태·예약·용기·책임 추적), 비목표(저장소, 동시, 시각)
- sdd.md 작성: 자료구조(samples/reservations Map, events 배열), 원칙 (R7 → R1~R6 → R8 순)
- trace.md 초기화
- TASKS.md에 0040 항목 추가 (owner: claude, status: in-progress)

### BUILD (2026-10-16)
- src/lab/lab.ts: createLab 함수 구현
  - 내부 타입: Sample, Reservation, EventRecord
  - 8개 메서드: receive, split, reserve, cancel, consume, discard, move, transferCustody
  - 검증: isValidQty, isContainerOccupied
  - 중복 호출: checkDuplicate (sortKeys로 args 비교)
  - 이용 가능량: recalculateReserved, getAvailable
- src/lab/lab.test.ts: vitest 스타일, 70개 테스트
  - 예시 1~5: 통합 테스트
  - R1~R8: 규칙별 단위 테스트
  - 기타: 오류 코드 19개

### GATE (2026-10-16)
- Typecheck: 파일 확장자 (.js), event 타입 수정
- Tests: vitest expect 사용, chai 제거, 타입 가드 (!r.ok && r.code)
- `pnpm check` ✅ ALL PASS (Typecheck, Unit tests, Lockfiles, Task records)
