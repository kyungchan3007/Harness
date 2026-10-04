# 0030 — 포인트 적립 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0030`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | prd.md·sdd.md·trace.md 작성, domain.md 추가 | 규칙 문서를 먼저 정하고 구현 진행 |
| 2 | DEFINE | domain.md에 포인트 규칙 추가 | 모든 코드·테스트의 단일 소스 |
| 3 | PLAN | sdd.md에 설계·테스트 계획 문서화 | spec과 구현 대비 추적성 확보 |
| 4 | BUILD | `src/pricing/points.ts` 구현, 단위 테스트 작성 | prd 요구사항과 sdd 설계 대로 |
| 5 | GATE | `pnpm check` 실행 | 타입 검사, 테스트, spec 일관성 확인 |
| 6 | RECORD | JOURNAL.md에 완료 기록 | 완료 증명 및 학습 사항 정리 |
| 7 | REFLECT | LEARNINGS.md에 실험 결과 기록 (필요 시) | 이후 동일 패턴에 적용할 인사이트 |
