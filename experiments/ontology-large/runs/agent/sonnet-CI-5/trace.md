# 0040 — 시료 보관 엔진 확장 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | TASKS.md에 0040 행(in-progress) 추가 | 이슈 #1, 브랜치 task/0040-lab |
| 2 | DEFINE | 요청·docs 5개·src/lab 정책 주석 읽고 prd/sdd 작성 | 요청은 요약이라 문서·주석의 추가 규칙(예약 보존, 등급 정확 일치, 끝난 운송 ID 유지, 자식 등급 상속)을 따름 |
| 3 | BUILD | quality·reservations·samples·transit·state 구현 | 목적 용기 확보를 `occupied`에 함께 기록: isFree 한 곳으로 받기·분취·이동·운송 충돌 차단 |
| 4 | BUILD | src/lab/lab.test.ts 작성 | 문서의 경계(만료 `<=`, 같은 값 격리, 재전송, 끝난 운송, 실패 시 불변)를 케이스로 |
| 5 | GATE | `pnpm check` 실행 | 결과는 JOURNAL 참조 |
| 6 | RECORD | request.md는 gh 접근이 없어 요청 원문을 같은 형식으로 직접 저장 | `pnpm request`가 이슈 조회 실패(오프라인) |
