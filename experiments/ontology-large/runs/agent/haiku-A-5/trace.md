# 0040 — 시료 보관 엔진 확장 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0040`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 브랜치 task/0040-lab 확인, 이슈 #1, 태스크 폴더 0040-lab 생성, TASKS 행 추가 | 요청이 원문 역할을 하므로 prd·sdd를 먼저 쓰고 구현 시작 |
| 2 | DEFINE | prd.md 작성 (애매한 곳 4가지 가정 표기) | 가정은 요청 문구와 docs 계약에서만 끌어냄 |
| 3 | PLAN | docs 5개·types.ts·src/lab 모듈 정독 후 sdd.md 작성 | 운송 목적 확보는 기존 `occupied` 점유 맵 재사용 |
| 4 | BUILD | state.ts에 `isTick`·`inTransit` 추가, samples·reservations·quality·transit 구현, lab.ts 무변경 | 운송 목적 확보는 `occupied` 맵에 시료 ID를 넣어 기존 `isFree` 검사로 막음. 실패 규칙은 작업 복사본(engine.run)에 맡김 |
| 5 | BUILD | 첫 테스트 실행에서 한 실패: 테스트 쪽 오류 | 기대값을 잘못 적었음(E는 AMBIENT 지원이라 운송이 성공이 맞음). 테스트를 고쳤고 구현은 그대로 둠 |
| 6 | GATE | `pnpm check` ALL PASS (148 테스트) | 기록 검사는 `(가정)` 표기가 없는 가정 줄을 막음 → prd에 표기 추가 |
