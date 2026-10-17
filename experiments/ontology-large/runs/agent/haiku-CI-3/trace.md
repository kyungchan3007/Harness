# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0040`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 브랜치 task/0040-lab(이슈 #1)에서 작업, TASKS 0040 in-progress 등록 | AGENTS 1번 규칙: 구현 전 태스크 점유 |
| 2 | DEFINE | prd.md 작성, 애매한 곳 4개를 (가정)으로 적음 | 요청 문구와 docs가 충돌하는 곳은 없었음. 업무 값(금액·비율)은 없어서 (확인 필요) 없음 |
| 3 | PLAN | sdd.md 작성, 명령별 검사 순서 확정 | 여러 규칙을 동시에 어기는 호출은 E6 4번에 따라 순서를 정해 고정 |
| 4 | BUILD | state·storage·quality·samples·reservations·transit 구현, 점유 확보는 `claimed` 맵 | 운송 목적지를 `occupied`에 넣으면 도착 때 점유 주체가 섞여 분리함 |
| 5 | BUILD | 분취 자식 등급은 부모 등급 상속, TODO 임시값(AMBIENT) 제거 | docs/storage.md와 engine 정책이 상속을 정함, 호출자 지정 불가 |
| 6 | TEST | 신규 lab.test.ts 23개 작성 후 실행, 실패 2건 | 실패 원인은 테스트 기대값(운송 전 충돌 가정, 복수 규칙 중 코드 하나만 기대). 구현을 고치지 않음 |
| 7 | TEST | 같은 테스트에서 양 100 시료를 용량 10 용기로 이동 → CAPACITY_EXCEEDED | 용량 초과가 옳은 결과. 테스트 시료를 양 5로 바꿈 |
| 8 | GATE | `bash agents/harness/evals/checks.sh` ALL PASS, `pnpm onto:check` PASS | 게이트 통과 후 기록 단계로 이동 |
