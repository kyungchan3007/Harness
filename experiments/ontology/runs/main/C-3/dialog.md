## AI

완료했습니다! 태스크 0040 연구실 시료 보관 엔진이 성공적으로 구현되었습니다.

## 완료 요약

**구현 내용:**
- `src/lab/lab.ts`에 `createLab` 함수와 Lab 인터페이스 완전 구현
- 8가지 명령 모두 구현: receive, split, reserve, cancel, consume, discard, move, transferCustody
- R1~R8 규칙 완전 준수
  - R7 멱등성: eventId 기반으로 같은 명령 재전송시 첫 결과 반환 (args deep copy로 불변성 보장)
  - R8 원자성: split은 자식 모두 생성하거나 모두 실패

**테스트 결과:**
- ✅ 게이트 ALL PASS (테스트 139개 모두 통과)
- ✅ 타입 검사: 문제 없음
- ✅ 작업 기록 검증: 통과

**문서:**
- prd.md: 요구사항 정의, 8가지 규칙, 오류 코드
- sdd.md: 접근 방식, 설계 결정, 대안·트레이드오프, 검증 계획
- trace.md: 작업 내력 기록

**git commit:**
- 브랜치: task/0040-lab
- 커밋: 허점·보완·컨텍스트·토큰 섹션 포함
- JOURNAL.md 및 TASKS.md 업데이트 완료
