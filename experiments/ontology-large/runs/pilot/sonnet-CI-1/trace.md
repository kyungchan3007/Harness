# 0040 — 시료 보관 엔진 확장 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1, 브랜치 task/0040-lab, TASKS 점유 | 요청에 명시된 이슈·브랜치 사용 |
| 2 | DEFINE·PLAN | 문서 5개·src/lab 읽고 prd·sdd 작성 | 목적 용기 확보는 occupied와 분리한 held로 두기로 함(I2 보존) |
| 3 | BUILD | state(held·inTransit)·storage·samples·reservations·quality·transit 구현, lab.test.ts 16개 | split 자식 등급은 부모 상속(samples.ts 주석). guard hook이 (가정) 표기 없는 prd 줄을 막아 표기 보강 |
| 4 | GATE | pnpm check ALL PASS | 테스트에서 eventId 재사용 실수 1회(테스트 오류, 엔진은 EVENT_CONFLICT로 올바름) |
