# 0030 — 포인트 적립 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0030`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 폴더·문서 생성 | spec 먼저 원칙 |
| 2 | DEFINE | PRD·SDD·Trace 작성 + TASKS 추가 | hook 규칙: PRD 애매함 지점 (가정) 마크, TASKS.md 0030 행 추가 필수 |
| 3 | PLAN | domain.md에 포인트 규칙 4개 추가 | 규칙을 domain.md에서 단일 소스로 관리 |
| 4 | BUILD | points.ts (calculatePoints), points.test.ts 작성 | 기본/쿠폰/VIP/VIP+쿠폰 조합 + 0원 테스트 13개 |
| 5 | GATE | `pnpm check` ✅ ALL PASS | Typecheck / Unit tests (109개) / 태스크 기록 모두 완료 |
| 6 | RECORD | | | |
