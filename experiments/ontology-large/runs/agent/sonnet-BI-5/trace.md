# 0040 — 시료 보관 엔진 확장 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | TASKS.md에 0040 점유, 브랜치 task/0040-lab(#1) | 이미 체크아웃됨 |
| 2 | DEFINE | ontology·docs 5개·src/lab 읽고 prd/sdd 작성 | 새 규칙 없이 문서 계약만 따름 |
| 3 | BUILD | 격리·advanceTime·운송 구현, 등급/격리/IN_TRANSIT 검사를 receive·split·reserve·consume·discard·move에 연결 | 목적 용기 확보는 occupied 재사용으로 isFree 한 곳 유지 |
| 4 | BUILD | 테스트 작성. 내 이벤트 수 계산 실수 2건을 테스트 쪽에서 수정 | 구현 오류 아님(이벤트 수 세기 착오) |
| 5 | GATE | `pnpm check` 실행 | 결과는 마지막 메시지 |
