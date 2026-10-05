# 0030 — 포인트 적립 — 과정 기록

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 요구사항 명확화 (쿠폰 적립률 절반, VIP 2배, 조합 규칙, 내림 처리) | 사용자가 6가지 질문에 답변해 모호함 제거 |
| 2 | DEFINE | prd.md·sdd.md·trace.md 작성, TASKS.md 0030 행 추가, domain.md 포인트 규칙 1~5 추가 | AGENTS.md "문서 먼저" 규칙 준수. hooks가 폴더·문서 검증 |
| 3 | BUILD | src/pricing/points.ts 구현, src/pricing/points.test.ts 작성 (규칙 1~5 각각, 조합·경계값 테스트 11개) | 계산 순서: base 1% → VIP ×2 → 쿠폰 ÷2 → 내림 |
| 4 | GATE | pnpm check: 118 passed (기존 107 + 포인트 11개) | TypeCheck·Unit Tests·Task Records ALL PASS |
| 5 | RECORD | trace.md 기록 (BUILD·GATE 단계) | 판정 게이트 통과, 완료 선언 가능 |
