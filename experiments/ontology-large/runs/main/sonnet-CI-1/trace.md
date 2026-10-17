# 0040 — 시료 보관 엔진 확장 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1·브랜치 task/0040-lab 확인, TASKS 점유 | 이미 만들어져 있음 |
| 2 | DEFINE | docs 5개·types·src/lab 읽고 prd 작성 | 애매한 곳은 ontology·주석에서 근거를 찾아 (가정)으로 기록 |
| 3 | PLAN | sdd 작성 | 용기 확보는 occupied 대신 운송 목록으로 계산 |
| 4 | BUILD | src/lab 6개 파일 수정 | 첫 편집이 hook에 막힘(prd 가정 줄에 (가정) 표시 없음) → prd 수정 후 재시도. 스크립트 실행은 거절되어 Edit으로 전환 |
| 5 | BUILD | lab.test.ts 작성 | 내 테스트 단언 1개가 틀렸음(확보된 목적 용기는 운송 중 OCCUPIED) — 구현이 아니라 테스트를 고침 |
| 6 | GATE | pnpm check | ALL PASS (153 테스트, ontology 포함) |
| 7 | RECORD | sdd·prd 체크·TASKS done | JOURNAL은 아래 참고 |
