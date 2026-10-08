# 0030 — 포인트 적립 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0030`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1·브랜치 `task/0030-points`는 사람이 준비. TASKS.md에 0030 행 추가(status=blocked, 질문 대기) | 이슈·브랜치가 이미 있어 새로 만들지 않음 |
| 2 | DEFINE | domain.md·price-cart.ts·money.ts를 읽고 prd.md 작성 | 요청의 "좀"·"더 많이"는 수치가 없고, "결제 금액"은 domain.md에서 배송비 포함(total)이라 기준이 갈림. 쿠폰(0003)·회원 등급은 도메인에 아직 없음 → 추측 구현 금지 지시에 따라 Q1~Q9로 정리 |
| 3 | PLAN | sdd.md 초안(구조·파일 계획만, 수치 미정) | 구조(순수 함수 + Policy 상수)는 기존 `priceCart`/`ShippingPolicy` 패턴을 따르므로 답과 무관하게 정할 수 있음 |
| 4 | 대기 | 사람에게 질문 전달, BUILD 보류 | 답을 받기 전 코드·domain.md를 고치지 않음 |
| 5 | DEFINE | 요청자 답(Q1~Q9)을 prd에 표로 고정, Acceptance 확정 | Q8·Q9는 위임받음 → 범위는 계산 함수만, 상한·하한 없음으로 정함(가장 작은 범위, 나중에 확장 가능). 요청 원문 "결제 금액"과 답 "subtotal"이 다르므로 prd에 해석을 명시 |
| 6 | PLAN | sdd 접근 확정 | `Math.round(subtotal*0.01)`는 x.5 경계에서 부동소수 오차 위험 → 정수 연산 `floor((subtotal*percent+50)/100)` 선택 |
| 7 | 막힘 | domain.md 수정이 guard hook에 차단됨 | 초안 prd 제목 `## Acceptance (잠정 …)`을 hook이 인식 못 함. prd·sdd 확정 후 재시도해 통과 → JOURNAL 공백에 기록 |
| 8 | BUILD | domain.md 규칙 1~6, points.ts, points.test.ts(11개) | 쿠폰 판별은 답대로 `discount > 0`. 0003에서 쿠폰 외 할인이 생기면 깨질 수 있어 sdd 위험에 남김 |
| 9 | GATE | `pnpm check` ALL PASS (116 tests) | 한 번에 통과 |
| 10 | RECORD | sdd 검증 결과, prd 체크, JOURNAL, TASKS=done | `pnpm issue-sync`(GitHub 이슈 #1 갱신)와 커밋은 외부 반영이라 사람 확인 후 진행 |
