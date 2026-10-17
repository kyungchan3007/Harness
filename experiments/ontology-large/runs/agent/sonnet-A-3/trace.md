# 0040 — 시료 보관 엔진 확장 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | TASKS.md에 0040 점유 | 이슈 #1 |
| 2 | DEFINE | docs 5개·types.ts·모듈 정책 주석 읽고 prd/sdd 작성 | 문서에 없는 관행은 더하지 않음 |
| 3 | BUILD | 격리, 등급 연결, advanceTime, 운송 구현 | 목적 용기 확보를 occupied 맵으로 재사용해 CONTAINER_OCCUPIED 규칙 일원화 |
| 4 | GATE | 단위 테스트 작성 후 pnpm check | 아래 결과 참조 |
