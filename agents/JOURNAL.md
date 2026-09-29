# JOURNAL — 태스크 목차 (append-only)

태스크당 한 줄. 자세한 과정은 각 태스크 폴더의 `trace.md`(직접)·`trace.auto.jsonl`(자동)에 있다.

| 날짜 | 태스크 | 결과 | 드러난 공백 | 기록 |
| --- | --- | --- | --- | --- |
| 2026-09-29 | 0001 뼈대 구성 | 게이트 ALL PASS | CI 없음 → 0007 | [trace](intent/specs/0001-bootstrap/trace.md) |
| 2026-09-29 | 0002 장바구니 금액 계산 | 테스트 13개, ALL PASS | 규칙↔테스트 누락을 게이트가 못 잡음 | [trace](intent/specs/0002-cart-pricing/trace.md) |
| 2026-09-29 | 0008 PRD·SDD·Trace 분리 + hooks 자동 기록 | 테스트 19개, e2e 2종, ALL PASS | 이 태스크 자체는 harness-lab 밖 세션이라 자동 기록 없음 | [trace](intent/specs/0008-trace-observability/trace.md) |
