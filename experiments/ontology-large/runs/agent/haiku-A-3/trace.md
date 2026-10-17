# 0040 — 시료 보관 엔진 확장 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0040`으로 확인).

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1, 브랜치 `task/0040-lab` 확인. `gh` 원격 없음 → 원문은 작업 지시 파일의 요청 섹션을 그대로 `request.md`에 복사 | `pnpm request 1`은 gh 원격이 필요해 실패. 원문 고정 규칙(#155)은 복사로 대체 |
| 2 | DEFINE | prd.md 작성 (Acceptance 10개, 가정 7개) | 요청에 정해지지 않은 값은 docs 근거로 (가정) 표시. 업무 값(금액·비율) 없음 |
| 3 | PLAN | sdd.md 작성: `claimed` 맵으로 운송 목적지 확보, `isFree` 확장 | 출발 용기는 운송 중에도 점유(transit.md), 목적지는 별도 확보 |
| 4 | BUILD | state에 `claimed`(목적 확보) 추가, `isFree`가 점유와 확보를 모두 봄 | 출발 용기는 운송 중에도 점유(transit.md), 목적지만 별도 확보 → 도착·취소 때 되돌리기가 단순 |
| 5 | BUILD | 등급 검사를 받기·분취 자식(상속)·이동·운송 시작에 연결, 분취 임시 AMBIENT 제거 | docs/storage.md의 적용 범위 4곳과 일치 |
| 6 | BUILD | quarantine·release, 예약 expiresAt 검사, advanceTime 만료, 운송 3종 구현 | 모든 명령은 Engine.run을 거쳐 재전송·원자성을 그대로 받음 |
| 7 | VERIFY | 단위 테스트 29개 작성 후 실행 → 1건 실패 | 테스트 오류: G(냉동 전용)가 AMBIENT 시료에 맞지 않음 → 기대값이 아니라 테스트 대상(빈 용기)을 고침 |
| 8 | VERIFY | `pnpm check` ALL PASS | 157개 테스트, 기록 검사 통과 |
| 9 | RECORD | sdd 계획과 달라진 점·검증 결과, prd Acceptance 체크, TASKS done, JOURNAL 한 줄 | 커밋은 지시에 없어 하지 않음 (작업 트리에 남김) |
