# 0030 — 포인트 적립 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0030`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1·브랜치 `task/0030-points`는 이미 있음. TASKS.md에 0030 행 추가(in-progress, 질문 대기) | 사람이 준 이슈·브랜치를 그대로 사용 |
| 2 | DEFINE | domain.md·price-cart.ts를 읽고 prd.md 작성. 요청의 모호한 점 7개를 "열린 질문"으로 정리 | "좀 줄여", "더 많이"는 수치가 없고, "결제 금액"은 배송비 포함 여부가 갈림. 쿠폰(0003)은 코드에 없어 판정 기준도 없음. 사람 지시대로 추측 구현하지 않음 |
| 3 | PLAN | sdd.md 초안(순수 함수 + Policy 객체, 정수 bp 계산) | 수치와 조합 규칙은 답변 후 확정. 코드 작성은 보류 |
| 4 | 막힘 | 질문 답변 대기 | 답 받으면 domain.md 포인트 규칙 → prd Acceptance 확정 → BUILD |
| 5 | DEFINE | 2026-10-07 요청자 답변을 prd "질문과 답"에 표로 기록, Acceptance 확정. Q7(범위·상한·0원)은 위임받아 결정: 계산만, 상한 없음, 0원 → 0, 잘못된 입력 → RangeError | 위임된 결정도 근거가 남도록 prd·domain.md 양쪽에 명시 |
| 6 | 막힘 | domain.md 수정이 guard hook에 막힘("Acceptance에 체크박스 없음") | 1차 prd의 제목을 `## Acceptance (질문 답변 후 확정)`으로 써서 hook이 Acceptance 절로 인식 못 함. 제목을 `## Acceptance`로 고치자 통과 |
| 7 | PLAN | sdd 확정: 정수 bp + `PointsPolicy`, 분자·분모 따로 곱해 마지막에 한 번만 내림 | 소수 비율 곱셈의 부동소수 오차·이중 내림을 피하기 위함 |
| 8 | BUILD | `points.ts`·`points.test.ts` 작성 | 부동소수 오차가 실제로 나는지 1~199,999원 범위로 측정 → 기본 비율에선 안 남. "한 번만 내림" 테스트를 의미 있는 사례(VIP 배수를 내림 뒤에 곱하면 150원 → 2, 정답 3)로 교체 |
| 9 | GATE | `pnpm check` ALL PASS (116 테스트) | 첫 실행에 통과 |
| 10 | RECORD | sdd 달라진 점·검증 결과, prd Acceptance, JOURNAL, TASKS done | |
