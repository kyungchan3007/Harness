# 0030 — 포인트 적립 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace NNNN`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | TASKS.md에 0030 행 추가 (claude, in-progress, #1) | 이슈 #1, 브랜치 task/0030-points |
| 2 | DEFINE | request.md 원문을 읽고 prd.md 작성 | 원문에 정량 기준이 없는 항목(쿠폰 감산폭, VIP 가산폭, 소수 처리, 조합, 0·음수)을 확정 사실처럼 쓰지 않고 "열린 질문 / 가정" Q1~Q8에 잠정값으로 분리 |
| 3 | DEFINE | 코드 확인 (money.ts, cart.ts, price-cart.ts) | 쿠폰·VIP는 코드에 없고 total만 있음 → 세 값 모두 입력으로 받는 순수 함수. 쿠폰은 0003 범위라 구현하지 않음 |
| 4 | PLAN | sdd.md 작성, domain.md에 "포인트 적립 규칙 (0030)" 추가 | 적립률은 bps 정수 4칸 표로 한 곳에 둠(부동소수 오차 회피, 조합 값 개별 조정 가능). 소수는 내림(잠정). 배송비 포함 total 기준(잠정) |
| 5 | BUILD | request.md·prd·sdd·domain.md를 읽고 `src/pricing/points.ts`, `points.test.ts` 작성 (sdd 케이스 22개) | sdd 시그니처·분할 정수 연산 그대로. 정책 bps 4칸은 선택된 칸만이 아니라 호출 시 전부 검증(잘못된 정책을 조기 발견). 기존 코드 수정 없음 |
| 6 | GATE | `pnpm check` | ALL PASS (11 파일, 120 테스트). 계획과 달라진 점 없음, 문서와 어긋난 점 없음 |
