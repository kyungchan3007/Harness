# 0030 — 포인트 적립 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0030`으로 확인).

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | TASKS.md에 0030을 in_progress로 등록, 브랜치 task/0030-points 확인 | 태스크 시작 |
| 2 | DEFINE | prd.md, sdd.md 작성 (spec 작성) | PRD는 요구사항·수용 기준, SDD는 설계·검증 계획 |
| 3 | PLAN | domain.md에 포인트 규칙 1~4 추가 (기본 적립·할인 조정·VIP 배수·최소값 보장) | 포인트 계산 로직을 규칙으로 명시화 |
| 4 | BUILD | src/pricing/points.ts 구현: calculatePoints(total, {discount, isVip}) 순수 함수 작성 | 기본 포인트 - 할인 포인트, VIP 2배, 최소 0 |
| 5 | BUILD | src/pricing/points.test.ts 작성: 도메인 규칙 1~4 각 테스트, 경계값 테스트, 복합 시나리오 | 규칙별 1개 이상 테스트, 음수 방지 확인 |
| 6 | GATE | `pnpm check` 실행: Typecheck ✅, Unit tests ✅, Lockfiles ✅, Task records 확인 | trace.md 작성 후 재실행 예정 |
| 7 | RECORD | trace.md 작성 (이 파일) | 과정 기록 완료 |
