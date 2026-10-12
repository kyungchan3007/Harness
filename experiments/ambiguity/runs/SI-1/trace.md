# 0033 — 포인트 적립 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0033`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | prd.md, sdd.md, trace.md 생성 | 규칙: 문서 먼저. 이미 이슈 #1이 있으므로 이슈 생성 스킵. |
| 2 | DEFINE | PRD에 확인 필요 항목 (VIP 배율, 적립 기준) 기입 | 가드 규칙: 업무 값은 (가정) 불가 → (확인 필요) 필수. |
| 3 | DEFINE | 사용자 답변 수집: VIP 2배, 기준 subtotal-discount(배송비 제외) | 정해진 값으로 PRD 갱신. |
| 4 | DEFINE | domain.md에 포인트 규칙 1~6 추가 | prd Acceptance 항목. |
| 5 | DEFINE | TASKS.md에 0033 추가 (in-progress) | 규칙: TASKS.md에서 점유. |
| 6 | PLAN | SDD: 함수명·입력·계산식 결정 | subtotalMinusDiscount를 받아 floor(x*0.01)*배율로 계산. |
| 7 | BUILD | `src/pricing/points.ts` 구현 | calculatePoints(subtotalMinusDiscount, options) 순수 함수. |
| 8 | BUILD | `src/pricing/points.test.ts` 테스트 18개 작성 | 규칙 1~6 + 경계값 + 대금액 + 입력 검증. |
| 9 | GATE | `pnpm check` 실행 | 전부 PASS: typecheck, 136개 test(포함 18개 points test), lockfile, task records |
| | | | |
