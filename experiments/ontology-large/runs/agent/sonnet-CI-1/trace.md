# 0040 — 시료 보관 엔진 확장 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace NNNN`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1·브랜치 task/0040-lab 확인, TASKS 행 추가 | 이슈와 브랜치는 이미 있어 새로 만들지 않음 |
| 2 | DEFINE/PLAN | docs 5개와 모듈 주석을 읽고 prd·sdd 작성 | 운송 확보를 occupied에 섞지 않고 targets 표로 분리 (I2 보존) |
| 3 | BUILD | state·storage·samples·reservations·quality·transit 구현, lab.test.ts 작성 | `pnpm request 1`은 gh를 쓸 수 없어 실패 → 요청 원문을 request.md로 그대로 옮김 (원문 고정 취지 유지) |
| 4 | GATE | vitest 18개·tsc·pnpm check 실행 | 만료는 `expiresAt <= to`(경계 포함), 새 예약은 `expiresAt > now`만 허용해 I13 유지 |
