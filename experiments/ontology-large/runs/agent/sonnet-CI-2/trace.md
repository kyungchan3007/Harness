# 0040 — 시료 보관 엔진 확장 — Trace

도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남긴다. 아래는 판단과 이유.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1, 브랜치 task/0040-lab, TASKS.md 점유 | 이미 체크아웃됨 |
| 2 | DEFINE | request.md 고정, prd 작성 | 원문이 판정 기준 |
| 3 | PLAN | sdd 작성 | 목적 용기 확보는 occupied에 넣지 않고 ACTIVE 운송에서 파생 |
| 4 | BUILD | state/storage/samples/reservations/quality/transit 구현 + lab.test.ts | 목적 확보는 isFree가 ACTIVE 운송을 스캔. 소비는 격리·운송 검사를 예약 상태 검사 뒤에 둠 |
| 5 | GATE | pnpm check | 첫 시도는 테스트 파일 undefined 타입 오류 → 테스트 수정 |
