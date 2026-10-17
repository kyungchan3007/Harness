# 0040 — 시료 보관 엔진 확장 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1·브랜치 task/0040-lab 확인, TASKS에 0040 in-progress 등록 | 이슈·브랜치는 요청에서 이미 준비됨 |
| 2 | DEFINE | AGENTS·ontology·docs 5개·src/lab 전부 읽고 prd.md 작성 | 요청은 요약일 뿐이라 문서·주석 정책(자식 등급 상속, 운송 확보, 격리가 안 막는 명령)을 Acceptance에 반영 |
| 3 | PLAN | sdd.md 작성 | 운송 목적 확보를 `occupied` 재사용으로 설계 — isFree 한 곳으로 모든 경로를 막기 위해 |
| 4 | BUILD | 코드 첫 수정이 hook에 막힘 — prd 가정 줄에 (가정) 표시 없음, "확인 필요" 문구가 사람 답 대기로 인식됨 | 가정 줄에 (가정: 근거)를 붙이고 업무 수치 없음 줄은 삭제. 검사를 약화하지 않고 문서를 고침 |
| 5 | BUILD | state·storage·samples·reservations·quality·transit 구현, lab.test.ts 작성 | 변경은 모든 검사 뒤에만 → 실패 시 복사본이 버려져 원자성 유지. 분취는 자식 전부 검사 후 반영. 만료는 `expiresAt <= now`(경계 포함)로 한 이벤트 안에서 처리 |
| 6 | GATE | `pnpm check` ALL PASS (155 tests, onto:check 포함) | 첫 실행에 통과, 되돌림 없음 |
| 7 | RECORD | sdd 검증 결과·prd 체크·TASKS done·JOURNAL | 커밋은 요청이 없어 하지 않음 |
