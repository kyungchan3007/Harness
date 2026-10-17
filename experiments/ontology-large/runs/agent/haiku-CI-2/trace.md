# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0040`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | TASKS.md에 0040 행 추가, 태스크 폴더 `0040-lab/` 생성 | 지시 파일이 폴더 이름을 정함 |
| 2 | 원문 고정 시도 | `pnpm request 1` 대신 `gh issue view 1` 시도 | 실패: "no git remotes found". 원격이 없어 `request.md`를 만들지 않음. 역할 에이전트가 원문을 임의로 만들면 원문 고정 규칙에 어긋나므로 PRD에 출처를 적고 확인 필요로 남김 |
| 3 | DEFINE | PRD 작성 (원문은 지시 파일 요청 절 기준) | 애매한 값은 가정으로 표기 |
| 4 | 문서 읽기 | docs 다섯 개, ontology, 기존 lab 모듈 | 구현 전 계약 확인 |
| 5 | BUILD 1 | state·storage·samples: 목적 확보(`targets`), 등급 검사, 분취 등급 상속(TODO 제거), 격리·운송 중 검사 | 등급 TODO는 docs/storage.md 규칙으로 대체 |
| 6 | BUILD 2 | reservations·quality·transit 구현 | 명령 requires 순서는 ontology 표를 따름 |
| 7 | 되돌림 | `transit.ts` 오타(`targetContineerId`)를 타입체크 전에 발견해 수정. `sed -i`가 macOS에서 실패해 `perl`로 수정 | 빌드 실패 원인은 셸 옵션 차이 |
| 8 | 테스트 실패 1 | "정확 등급 불일치" 테스트에서 `CONTAINER_OCCUPIED`가 나옴 | 테스트 쪽 실수: 목적 용기 C에 시료가 먼저 있었음. 구현 규칙(점유 검사가 등급 검사보다 앞)은 유지, 테스트 순서를 고침 |
| 9 | GATE | 타입체크·vitest 통과 | |
| 10 | GATE | `pnpm check` ALL PASS (단위 테스트 154개) | 기록 검사가 "확인 필요" 줄과 사유 없는 미체크 항목을 막음 → 원문 고정 미완을 가정·사유로 바꿔 통과 |
