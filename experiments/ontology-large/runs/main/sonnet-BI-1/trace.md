# 0040 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1, 브랜치 `task/0040-lab`은 이미 있음. TASKS.md에 0040 행 추가 | 요청에서 이슈·브랜치가 주어짐 |
| 2 | DEFINE | docs 5개·types.ts·모듈 주석·ontology를 읽고 prd 작성 | 요청은 요약일 뿐이라 문서 계약을 기준으로 삼음. 애매한 곳은 모두 문서·types 근거의 (가정)으로 적음 |
| 3 | PLAN | sdd 작성 | 목적 용기 확보를 `occupied` 맵 재사용으로 표현 — 점유 판정을 `isFree` 한 곳에 둠 |
| 4 | BUILD | state(`inTransit`)·quality·transit·samples·reservations·storage 수정 | 운송 중 금지 검사를 `finish`·`move`의 `occupied.delete` 앞에 둠(확보가 새는 것 방지). 분취 자식 null 항목은 예외 대신 INVALID_INPUT |
| 5 | VERIFY | `lab.test.ts` 19개 작성, 2건 실패 | 둘 다 테스트 오류: 헬퍼 기본 인자가 `expiresAt: undefined`를 null로 바꿈 / 운송 중 시료로 목적 용기 검사를 해 IN_TRANSIT이 먼저 걸림. 구현은 그대로 두고 테스트만 고침 |
| 6 | GATE | `pnpm check` | ALL PASS (테스트 147개) |
