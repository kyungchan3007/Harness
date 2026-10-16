# 0040-lab — 연구실 시료 보관 엔진 (TRACE)

## 한 일

| 날짜 | 항목 | 상태 |
| --- | --- | --- |
| 2026-10-16 | prd.md: 요구사항 정의 (8 규칙, 공개 인터페이스, Acceptance) | 완료 |
| 2026-10-16 | sdd.md: 상세 설계 (접근, 데이터 구조, 검사 순서, 불변식, 대안, 검증) | 완료 |
| 2026-10-16 | TASKS.md에 0040 행 추가 | 완료 |
| 2026-10-16 | lab.ts: 8개 명령 구현 (receive, split, reserve, cancel, consume, discard, move, transferCustody) | 완료 |
| 2026-10-16 | snapshot 메서드 구현 | 완료 |

## 진행 상황

### 2026-10-16 문서 작성
- [x] prd.md: 요구사항 정의 (8 규칙, 공개 인터페이스, 성공 조건)
- [x] sdd.md: 상세 설계 (데이터 구조, 검사 순서, 불변식)
- [x] lab.ts: 구현 완료

## 설계 확정사항

1. **idempotency (R7):** eventId 기반 중복 검사 먼저 실행
2. **원자성 (R8):** split/consume 등 다중 상태 변경은 모두 성공 또는 모두 실패
3. **불변식 (R2):** 루트 시료의 받은 양 = 계보 전체의 남은양 + 소비 + 폐기
4. **이용 가능량 (R3):** remaining - reserved
5. **용기 관리 (R1, R5):** 한 용기에 최대 한 시료, 용량 제약 준수

## 검증 결과

### pnpm check
- ✅ Typecheck (tsc --noEmit)
- ✅ Unit tests (128 tests, 11 files)
- ✅ Task records (prd.md, sdd.md, trace.md, TASKS.md 완비)
- ✅ ALL PASS

### 구현 확인
1. 8개 명령 모두 구현 (receive, split, reserve, cancel, consume, discard, move, transferCustody)
2. idempotency (R7) 먼저 검사 → argsEqual로 객체 키 순서 무시, 배열 순서 구별
3. 모든 규칙 검사 (R1~R8)
4. 원자성: split 자식 생성, consume 수량 변경 모두 성공 또는 실패
5. 불변식: 루트 시료의 received = 계보 전체의 remaining + consumedQty + discardedQty
6. snapshot 메서드 구현

### 공개 예시 검증 (설계 단계 검증, 구현 시 자동 테스트 안내)
1. S1 100→40예약→S2 50분취: remaining 50, reserved 40 (이용가능 10)
2. S1 100→S2 60, S3 40: S1 DEPLETED, S2/S3 ACTIVE
3. receive→reserve→move→transferCustody→consume: 모두 성공
4. split 원자성: 자식 용기 문제 시 전체 실패

## 의사결정 기록
- 데이터 구조: Map 기반 (O(1) 검색, 메모리 O(n))
- 검사 순서: R7 idempotency 먼저, 순차 검사
- 오류: 규칙 다중 위반 시 어느 것이든 반환
- TypeScript: 파라미터 타입 명시, import ".js" 확장자
