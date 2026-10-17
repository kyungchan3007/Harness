# 0040 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1, 브랜치 `task/0040-lab`(이미 체크아웃) | 요청에서 제공됨 |
| 2 | DEFINE | AGENTS·ontology·docs 5개·src/lab 전체 읽고 prd 작성 | 운송 시작 용량 검사는 문서에 직접 문구 없음 → E1.3·I3에서 도출해 가정으로 적음 |
| 3 | PLAN | sdd 작성 | 확보는 `occupied` 재사용(storage.ts 주석이 isFree 규칙을 정의) |
| 4 | BLOCK | guard hook이 src 수정 차단 — prd "애매한 곳" 줄마다 (가정) 표시 필요 | 줄마다 (가정)을 달아 prd 재작성. 문서 먼저 규칙이 실제로 동작함 |
| 5 | BUILD | state(isTick·inTransit), quality, transit, reservations(만료·격리·운송), samples(등급·격리·운송) | 모든 명령이 engine.run 작업 복사본에서 실행돼 원자성·재전송은 새로 짤 필요 없음 |
| 6 | GATE | tsc가 테스트의 `transits[0]` 가능한 undefined 지적 → `!` 추가 | 테스트 쪽 문제, 검사는 약화하지 않음 |
| 7 | GATE | `pnpm check` ALL PASS (테스트 143개, 이 중 신규 15개) | |
| 8 | RECORD | prd 체크박스·TASKS done·JOURNAL 갱신. `pnpm issue-sync`·커밋은 하지 않음 | 이슈 동기화는 GitHub 접근이 필요하고, 커밋은 요청되지 않아 보류 |
