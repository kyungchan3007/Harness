# 0040 — 시료 보관 엔진 확장 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | TASKS.md 점유, 이슈 #1·브랜치 task/0040-lab 사용 | 이미 만들어져 있음 |
| 2 | DEFINE | docs 5개·src/lab 전 모듈 읽고 prd 작성 | 정책 주석(분취 등급 상속, 운송 점유)이 구현 지시를 담고 있음 |
| 3 | PLAN | sdd 작성 | 운송 확보를 occupied 맵으로 표현해 isFree 재사용 |
| 4 | BUILD | quality·samples·reservations·transit 구현, lab.test.ts 작성 | 만료는 expiresAt <= now, 이벤트 1개 |
| 5 | GATE | pnpm check ALL PASS (테스트 128개) | 검사 약화 없음 |
