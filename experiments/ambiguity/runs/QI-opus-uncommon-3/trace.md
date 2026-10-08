# 0030 — 포인트 적립 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0030`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1·브랜치 `task/0030-points`(사용자가 준비). TASKS.md에 0030 등록 | 이슈·브랜치는 이미 있으므로 새로 만들지 않음 |
| 2 | DEFINE | domain.md·price-cart.ts·money.ts 확인 후 prd.md 작성 | domain.md에 회원/VIP/포인트 개념이 없고 쿠폰(0003)도 미구현. 요청의 "좀 줄여", "더 많이"는 수치가 없음 |
| 3 | DEFINE | 모호한 점을 prd "열린 질문" Q1~Q8로 정리 | 요청자가 "모호하면 추측 말고 질문"을 명시. 수치·반올림을 추측하면 틀린 규칙이 테스트까지 통과해 버림 |
| 4 | PLAN | sdd.md에 잠정 접근만 기록 | 확정 설계는 답을 받은 뒤 |
| 5 | GATE | `pnpm check` 1회 FAIL("접근" 항목 없음) → 라벨 수정 후 PASS | `**접근 (잠정…):**`처럼 라벨에 글을 붙이면 검사가 못 읽음. 라벨은 그대로 두고 메모는 본문에 |
| 6 | 막힘 | 사람의 답 대기. TASKS status=blocked | BUILD로 넘어가지 않음. 코드·domain.md 미변경 |
| 7 | DEFINE | 요청자 답 Q1~Q8 수신 → domain.md "포인트 적립 규칙" 1~6, architecture.md 모듈 표, prd 질문·답·Acceptance 갱신. TASKS=in-progress | 문서 먼저. 원문 "결제 금액"과 Q1 답(subtotal)이 다름 → prd에 "답이 기준"으로 명시. Q7은 "알아서" → 계산만(YAGNI)으로 정하고 비목표에 적음 |
| 8 | PLAN | sdd 확정: `calculatePoints(breakdown, member)`, 정수 퍼센트 + `floor((s×r+50)/100)` 반올림 | 정책 객체 주입은 요구에 없어 상수로. 역할 분리는 prd에 표시가 없어 메인에서 직접 진행 |
| 9 | BUILD | `src/pricing/points.ts`·`points.test.ts` 작성 | 런타임 잘못된 등급·금액은 RangeError(`assertWon` 재사용) |
| 10 | GATE | `pnpm check` ALL PASS (117 tests) | |
| 11 | 되돌림 | sdd에 쓴 "`1005*0.01=10.049999…`" 예시를 node로 확인 → 실제 `10.05`. 0~2천만 원 전수 대조에서 단순 `Math.round(s*0.01)`도 차이 0건 | 근거 없는 주장을 문서·테스트 이름에 남길 뻔함. 정수 연산은 유지하고 테스트 이름("부동소수 함정")과 sdd 대안 설명을 사실대로 수정 |
| 12 | RECORD | sdd 달라진 점·검증 결과, JOURNAL, TASKS=done | 커밋·issue-sync는 사용자 확인 후(외부 반영) |
