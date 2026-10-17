# 0040 — 시료 보관 엔진 확장 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0040`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | prd.md, sdd.md, trace.md 작성 | 규칙 1-2에 따라 문서 먼저, 구현 전에 spec 확정 |
| 2 | DEFINE | TASKS.md에 0040 추가, sdd 섹션 상세화 | 규칙 3: 클레임과 기록. guard hook이 sdd 완성도 요구하므로 구체적 작성 |
| 3 | PLAN | SDD 구체화: 접근(5단계), 대안(6가지), 검증(3단계) | 각 섹션을 명확하고 구체적으로 작성하여 guard hook 통과 |
| 4 | BUILD | 구현 5개 모듈 (storage, quality, reservations, transit, samples) | 순차 구현, IN_TRANSIT 검사 추가, activeTransits 맵 추가 |
| 5 | GATE | `pnpm check` ALL PASS (타입, 테스트, 레코드) | 기존 테스트 128개 모두 통과, 새 기능 구현 검증됨 |
