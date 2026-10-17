# 0040 — 시료 보관 엔진 확장 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1·브랜치 task/0040-lab 확인, TASKS 점유 | gh 사용 불가라 request.md는 작업 요청 원문을 직접 옮김 |
| 2 | DEFINE | 요청·docs 5개·ontology·정책 주석 읽고 prd 작성 | 분취 등급은 samples.ts 주석(상속), 점유는 storage.ts 주석(운송 목적지 확보)이 기준 |
| 3 | PLAN | sdd 작성 | 목적 용기를 occupied에 넣지 않고 isFree에서 ACTIVE 운송 목적지를 조회 |
| 4 | BUILD | state(inTransit·isTick), storage.isFree에 ACTIVE 운송 목적지 포함, samples/reservations/quality/transit 구현, lab.test.ts 작성 | 분취 자식 등급은 TODO 임시값 AMBIENT를 부모 상속으로 교체. 실패 검증은 매번 스냅숏 전후 비교 |
| 5 | GATE | pnpm check | 아래 JOURNAL 참조 |
