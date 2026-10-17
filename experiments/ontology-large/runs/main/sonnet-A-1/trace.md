# 0040 — 시료 보관 엔진 확장 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1·브랜치 task/0040-lab 확인, TASKS 점유 | 이슈·브랜치는 요청 시점에 이미 있음 |
| 2 | DEFINE·PLAN | 문서 5개·src/lab 읽고 prd·sdd 작성 | 운송 확보를 `occupied`에 넣으면 isFree 한 곳에서 모든 점유 규칙이 해결됨 |
| 3 | BUILD | hook이 prd 가정 줄의 (가정) 표시 누락으로 코드 수정을 막아 prd 보완 후 구현 | 셸 명령은 일부 거절돼 Edit/Write로 진행 |
| 4 | BUILD | 격리·등급·만료·운송 구현, lab.test.ts 16개 | 소비·분취는 QUARANTINED/IN_TRANSIT 검사를 상태 확인(ACTIVE 예약) 뒤에 둠 |
| 5 | GATE | tsc 타입 오류(테스트의 인덱스 접근) 수정 후 pnpm check | |
