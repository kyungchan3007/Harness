# 0040 — 시료 보관 엔진 확장 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | TASKS.md에 0040 점유 | 이슈 #1, 브랜치 task/0040-lab |
| 2 | DEFINE | 요청·docs 5개·코드 주석 읽고 prd 작성 | 가정은 prd 애매한 곳에 기록 |
| 3 | BUILD | 격리·등급·만료·운송 구현 | 운송 목적 확보를 occupied의 `transit:<id>` 값으로 표현해 isFree 재사용 |
| 4 | GATE | 테스트 작성, pnpm check | 실패·재전송 시 이력 불변 검증 포함 |
