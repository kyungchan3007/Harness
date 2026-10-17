# 0040 — 시료 보관 엔진 확장 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0040`으로 확인).

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1·브랜치 `task/0040-lab`은 이미 있음을 확인, TASKS.md에 0040 점유 | 이슈·브랜치는 요청에서 이미 준비됨 → 새로 만들지 않음 |
| 2 | DEFINE | AGENTS.md·docs 5개·src/lab 전부 읽고 prd.md 작성 | 모호한 곳(등급 입력 검증, `to` 경계, 용량 검사)은 (가정)으로 적음. 업무 값은 없어 확인 필요 없음 |
| 3 | PLAN | sdd.md 작성 | 운송 목적 확보는 `occupied` 재사용 — `isFree`가 받기·분취·이동·운송을 한 곳에서 막게 함 |
| 4 | BUILD | 코드 수정 시도 → guard hook이 prd를 막음: 가정 줄마다 `(가정)` 필수, "업무 값 없음" 줄이 업무 값 가정으로 오탐 | 검사를 피하지 않고 가정 줄에 표시를 달고, 실제 모호함이 아닌 군더더기 줄은 삭제 |
| 5 | BUILD | quality·transit·reservations(만료·`advanceTime`)·samples(등급·격리·운송 중 검사) 구현, `lab.test.ts` 18개 | 모든 상태 변경은 검사 뒤에만 → 실패 시 원자성은 `Engine.run`의 작업 복사본이 보장. 분취 자식 등급은 부모 상속 |
| 6 | GATE | `pnpm check` | ALL PASS (타입 오류 2건은 테스트의 `[0]` undefined → `?.`로 수정) |
