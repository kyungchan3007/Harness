# 0040 — 시료 보관 엔진 확장 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0040`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 브랜치 task/0040-lab 확인, TASKS에 0040 행 추가 | 요청 파일이 이슈 #1과 태스크 0040을 지정 |
| 2 | DEFINE | prd.md·sdd.md 작성 | 요구의 세부 규칙은 docs/ 정책 문서와 types.ts를 따름 |
| 3 | PLAN | 운송 목적 확보를 State.targets로 설계 | 시료 타입·types.ts를 바꾸지 않으려고 상태 맵을 따로 둠 |
| 4 | BUILD | state·storage·samples·reservations·quality·transit 구현 | 운송 확보는 State.targets, 운송 중 판정은 inTransit으로 한 곳에 모음 |
| 5 | BUILD | lab.test.ts 작성 중 기대값 2개 실패 | 구현이 아니라 테스트 오류였음. K4는 비어 있어 CAPACITY_EXCEEDED가 맞다. 같은 eventId 재전송 테스트는 호출마다 새 ID를 쓰고 있었음 → 고침 |
| 6 | GATE | pnpm check | ALL PASS (149 tests) |
| 7 | RECORD | prd 체크박스, sdd 결과, TASKS done, JOURNAL 한 줄 | 커밋은 하지 않음 (요청에 커밋 지시 없음) |
