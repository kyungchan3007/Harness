# 0040 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | DEFINE | prd.md: 요구사항·범위·인수기준 | 규칙이 명확해서 애매한 곳 없음 (가정만 3가지 기록) |
| 2 | DESIGN | sdd.md: 자료구조·알고리즘·검증계획 | LabImpl 클래스로 메모리 기반 상태머신, deepEqual로 멱등성 검사, 원자성은 검증→업데이트 순서로 |
| 3 | BUILD | src/lab/lab.ts: 8메서드 + snapshot + 멱등성 로직 | 1000줄 이하, deepEqual은 키 정렬로 순서 무시, cloneArg는 깊은 복사 |
| 4 | TEST | 23개 테스트: 공개예시·엣지·타입안전 | 타입 가드 명시화(r.ok ? r.value : r.code), split 테스트 수정 (available = remaining - reserved) |
| 5 | GATE | pnpm check 전: 타입·린트 OK, 테스트 23/23 PASS | trace.md 표 추가 필요, 검증 완료 후 JOURNAL 기록 |
