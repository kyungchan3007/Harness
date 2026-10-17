# 0040 — 시료 보관 엔진 확장 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1, 브랜치 task/0040-lab(이미 있음), TASKS 행 추가 | 이슈·브랜치는 요청에서 주어짐 |
| 2 | DEFINE | docs 5종·src/lab 주석을 읽고 prd 작성 | 요청은 요약이므로 문서 계약(자식 등급 상속, 목적 용기 배타 확보, 운송 중 허용 명령)을 기준으로 삼음 |
| 3 | PLAN | sdd 작성 | 목적 용기 확보는 occupied 맵 재사용 |
| 4 | BUILD | prd 가정 줄에 `(가정)` 표시가 없어 guard hook이 코드 수정을 막음 → prd 보강 후 구현 | 문서 먼저 규칙이 실제로 동작함. 셸 heredoc·sed 쓰기는 승인 필요해 Write/Edit로 처리 |
| 5 | BUILD | quality·transit·advanceTime 구현, samples·reservations에 등급·격리·운송 검사 추가, 분취 자식 등급 임시값 제거 | 문서의 "허용" 목록(격리 중 이동·폐기·운송 등, 운송 중 예약·취소·격리)은 검사를 넣지 않는 것으로 지킴 |
| 6 | BUILD | `lab.test.ts` 19개 | 재전송(성공 후 상태가 바뀐 뒤에도), 분취 원자성, 만료 경계(=now), 목적 확보 해제를 포함 |
| 7 | GATE | `pnpm check` | ALL PASS (테스트 161개) |
