# 0002 — 장바구니 금액 계산 — Trace

> hooks 자동 기록(0008) 도입 전 태스크라 **사후 재구성한 에이전트 자체 기록**입니다. 자동 기록(`trace.auto.jsonl`)은 없습니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 브랜치 `task/0002-cart-pricing`, TASKS에 0002 in-progress | guardrails상 main 직접 push 금지 |
| 2 | DEFINE | `domain.md`에 규칙 번호 부여, spec 작성 | 규칙의 단일 소스를 코드 밖에 둠 |
| 3 | PLAN | 대안 4개 검토 (bigint, 브랜드 타입, 할인 내장, 배송 기준) | 할인 전 기준은 쿠폰 꼼수 여지 → 할인 후 기준 |
| 4 | BUILD | `money.ts`, `cart/`, `pricing/` + 테스트 13개 | 테스트 이름에 `규칙 N` 부여 |
| 5 | GATE | `pnpm check` ALL PASS (첫 시도) | - |
| 6 | REFLECT | 규칙↔테스트 누락을 게이트가 못 잡는 공백 발견 | LEARNINGS 실험 후보로 등록 |
| 7 | RECORD | 커밋, PR #1 생성 | 사용자 선택 |
