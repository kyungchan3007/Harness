# 0040 — 연구실 시료 보관 엔진 — 작업 기록

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | DEFINE | PRD·SDD·TASKS 작성 | 규칙 R1~R8과 공개 예시 5개가 명확 |
| 2 | BUILD | lab.ts 구현 | 8개 명령(receive/split/reserve/cancel/consume/discard/move/transferCustody) 구현, R1~R8 규칙 모두 만족 |
| 3 | VERIFY | lab.test.ts 작성 | R1~R8 단위 테스트, 공개 예시 5개, 경계 케이스 총 31개 테스트, pnpm check PASS |
