# trace.md — 0040-lab 작업 과정

| 날짜 | 단계 | 한 일 |
|------|------|------|
| 2026-10-16 | DEFINE | prd.md 작성: 8개 규칙(R1~R8) + 공개 API 계약, TASKS.md 등록(0040), prd 서식 통일(제목, 이슈, Acceptance 체크박스, 애매한 곳·가정) |
| 2026-10-16 | PLAN | sdd.md 작성: 데이터 구조(Map 기반 상태 관리), 8개 메서드의 검증·연산 알고리즘, 원자성 보장(split 원자적), eventId 중복 제거(R7), 대안·트레이드오프(bullet point 형식), 검증 계획(단위/통합 테스트) |
| 2026-10-16 | BUILD | src/lab/lab.ts 구현: createLab 팩토리 함수, deepCopy/deepEqual 유틸(Record<string, unknown> 타입 안정), 8개 메서드 (각 R1~R8 검사 로직 포함), snapshot() 반환, 타입 명시화(ID 리터럴 op 타입) |
| 2026-10-16 | GATE | pnpm check PASS: 타입체크 ✅, 테스트 139개 통과 ✅, 태스크 기록 검증 ✅ |
