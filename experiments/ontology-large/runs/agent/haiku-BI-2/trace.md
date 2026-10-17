# 0040 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0040`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 브랜치 `task/0040-lab`(이미 체크아웃) · TASKS.md 0040 행 추가 | 요청이 작업 번호·이슈 #1을 지정함. git remote가 없어 `pnpm request` 대신 request.md에 요청 원문을 옮김 |
| 2 | EXPLORE | `src/lab/*`, `docs/*`, ontology 읽음 | 스텁 4묶음(quality·reservations의 advanceTime·transit)과 TODO 2곳(split 등급 AMBIENT, supports 미연결)을 확인 |
| 3 | DEFINE | prd.md·sdd.md·request.md 작성 | 분취 자식 격리는 false, advanceTime `to == now` 허용 등 요청에 없는 곳은 PRD "애매한 곳·가정"에 (가정)으로 남김 |
| 4 | BASELINE | `pnpm check` 실행 | 테스트 128개 PASS, 레코드 검사만 폴더 없음으로 실패 → 기록 작성 후 통과 대상 |
| 5 | BUILD | state에 `targets`(운송 목적 확보)·`inTransit`·`isGrade`·`isTick` 추가, storage `isFree`가 확보를 포함, samples·quality·reservations·transit 구현 | 운송 확보를 `occupied`에 섞지 않고 `targets`로 분리 (docs/transit.md 출발 용기 점유와 목적 확보를 구별) |
| 6 | BUILD | split 자식 등급 TODO를 부모 등급 상속으로 교체, supports TODO 제거 | docs/storage.md의 적용 범위(받기·분취·이동·운송 목적지)에 맞춤 |
| 7 | FIX | 셸 체인 실수: `sed -i`(BSD 인자 오류)로 뒤 명령이 실행되지 않아 quality.ts가 스텁인 채로 남음 → 다시 작성 | 테스트 "격리" 실패로 발견. 빠진 파일을 확인하고 다시 씀 |
| 8 | VERIFY | 신규 테스트 13개 중 1개 실패: startTransit에서 목적 확보가 등급보다 먼저 걸림 | 구현은 docs 규칙 중 하나의 코드를 돌려주는 것이므로 테스트 기대값을 CONTAINER_OCCUPIED로 정정 |
| 9 | RECORD | prd Acceptance 체크, sdd 검증 결과, JOURNAL·TASKS 갱신 | `pnpm check` ALL PASS 확인 후 완료 처리 |
