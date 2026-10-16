# 0040 — 연구실 시료 보관 엔진 — 과정 기록

---

## Phase 1: 설계 문서 작성 (2026-10-16)
- [x] prd.md, sdd.md, trace.md 작성
- [x] TASKS.md에 task 0040 등록 (status=in-progress)
- [x] "애매한 곳·가정" 섹션 채우기

## Phase 2: 핵심 구현 (2026-10-16)
- [x] src/lab/lab.ts 구현 (LabImpl 클래스, 8개 명령)
  - receive, split, reserve, cancel, consume, discard, move, transferCustody 구현
  - idempotency 캐시 (R7 같은 eventId 재전송 처리)
  - args 정규화 (객체 키 정렬, 배열 순서 구별)
- [x] 단위 테스트 작성 (src/lab/lab.test.ts)
  - 규칙 R1~R8 테스트 (36개)
  - 불변식 I1 테스트 (수량 보존)
  - 공개 예시 3개 통합 테스트
  - TypeScript 타입 정확성 검사
- [x] pnpm check 통과 (TypeCheck, 테스트, lockfile, spec)
  - Typecheck ✅ PASS
  - Unit tests ✅ PASS (164/164 tests)
  - No npm/yarn lockfiles ✅ PASS
  - Task records ✅ PASS (trace.md 표 작성)

## 완료 — 검증 결과
| 항목 | 상태 | 비고 |
| --- | --- | --- |
| 구현 | ✅ | 8개 명령 + idempotency + args 정규화 |
| 테스트 | ✅ | 36개 (R1~R8) + I1 + 공개 예시 3개 |
| 타입 검사 | ✅ | TypeScript 정확성 |
| 게이트 | ✅ | pnpm check ALL PASS |
