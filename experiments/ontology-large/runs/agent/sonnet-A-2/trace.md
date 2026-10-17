# 0040 — 시료 보관 엔진 확장 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | TASKS.md 등록, 이슈 #1·브랜치 task/0040-lab 사용 | 이미 만들어져 있음 |
| 2 | DEFINE | docs 5개·src/lab 읽고 prd 작성 | 정책 주석(자식 등급 상속, 운송 점유)을 계약으로 취급 |
| 3 | BUILD | quality·transit 구현, samples·reservations에 검사 연결 | 운송 목적 확보를 `occupied`로 표현해 기존 isFree 재사용 |
| 4 | BUILD | lab.test.ts 작성 | 실패 시 이력·상태 불변과 재전송을 함께 확인 |
| 5 | GATE | `pnpm check` | 결과는 최종 보고 |
