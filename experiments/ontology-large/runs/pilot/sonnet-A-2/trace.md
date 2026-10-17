# 0040 — 시료 보관 엔진 확장 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1, 브랜치 task/0040-lab 사용(이미 체크아웃). TASKS.md 행 추가 | 요청에서 이미 주어짐 |
| 2 | DEFINE | docs/ 5개·types.ts·정책 주석 읽고 prd 작성 | 모호한 곳은 문서 문구 기준으로 가정 표기. 업무 값 없음 |
| 3 | PLAN | sdd 작성: 운송 점유는 기존 `occupied` 맵 재사용 | isFree 한 곳으로 받기·분취·이동·운송 충돌이 모두 막힘 |
| 4 | BUILD | hook이 PRD 가정 줄에 (가정) 표기를 요구해 prd 수정 후 구현. 격리·등급·만료·운송 + lab.test.ts 16개 | 셸 heredoc은 막혀 Edit/Write 사용. 운송 중 금지는 `inTransit`으로 한 곳 판정. 만료는 advanceTime에서 실제 상태 변경 |
| 5 | GATE | `pnpm check` ALL PASS (테스트 144개) | 첫 tsc 오류(테스트의 배열 인덱스 undefined)는 `!`로 수정 |
