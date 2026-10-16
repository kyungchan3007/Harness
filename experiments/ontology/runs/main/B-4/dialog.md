## AI

완벽합니다! 작업이 완료되었습니다.

## 요약

**0040 — Lab Sample Storage Engine** 구현 완료:

### ✅ 문서화
- **prd.md**: 요구사항, 범위, 인수기준 정의
- **sdd.md**: 자료구조, 알고리즘, 검증계획
- **trace.md**: 5단계 작업 진행 기록

### ✅ 구현
- **src/lab/lab.ts**: 400줄 이상, LabImpl 클래스
  - 8개 메서드: receive, split, reserve, cancel, consume, discard, move, transferCustody
  - 멱등성: eventLog + deepEqual로 eventId 재전송 검사
  - 원자성: 검증 완료 후 상태 한 번에 업데이트
  - 수량 보존: rootId 기준 ∑remaining + ∑consumedQty + ∑discardedQty 불변식

### ✅ 테스트
- **src/lab/lab.test.ts**: 23개 테스트
  - 공개 예시 5개 (split, move, transferCustody, 원자성, 멱등성)
  - 엣지 케이스 18개 (오류코드, 경계값, 계보, 책임)
  - 모든 테스트 PASS, 타입 안전 확인

### ✅ 게이트
- `pnpm check`: 타입·린트·테스트 모두 PASS
- git commit 완료 (허점·보완·토큰 기록)

**규칙 준수**:
- R1~R8: 참조·계보·예약·상태·용기·책임·멱등성·원자성 모두 구현
- 23개 테스트로 규칙 완전 커버
