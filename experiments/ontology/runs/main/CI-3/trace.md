# 0040 — 연구실 시료 보관 엔진 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | DEFINE | prd.md 작성: 8개 명령, 11개 불변식 | 요청 규칙(R1~R8) + ontology.json(I1~I11) 정리 |
| 2 | DEFINE | sdd.md 작성: 데이터 구조, 알고리즘, 검증 계획 | 내부 설계를 명시적으로 문서화 |
| 3 | DEFINE | TASKS.md에 0040 행 추가, 상태=in_progress | 작업 시작 표시 |
| 4 | BUILD | `src/lab/lab.ts` 구현: createLab + 8명령 + snapshot | deepEqual/copyArgs 헬퍼로 R7/R8 구현 |
| 5 | BUILD | import 확장자 .js 추가, 파라미터 타입 추가 | typecheck 오류 해결 |
| 6 | BUILD | trace.md 표 작성 및 typecheck/unit test 오류 수정 | import .js 확장자, 파라미터 타입 추가 |
| 7 | GATE | `pnpm check` ALL PASS (typecheck, tests, 문서 규칙) | 완료 조건 만족 |
