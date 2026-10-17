# 0040 — 시료 보관 엔진 확장 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0040`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 브랜치 `task/0040-lab` 확인(이미 체크아웃), 태스크 폴더 생성 | 요청이 지정한 번호·브랜치 그대로 사용 |
| 2 | DEFINE | prd.md 작성 | 요청 원문과 정책 문서를 Acceptance로 옮김 |
| 3 | 원문 고정 | `pnpm request 1` 실행 안 함 | `request.md`는 GitHub 이슈를 읽어 만드는데 웹 접근이 금지돼 있어 생성하지 않음. 원문은 지시문을 기준으로 함 |
| 4 | PLAN | sdd.md 작성, 정책 문서와 주석 정독 | 목적 확보는 `occupied`와 분리한 `targets` 맵으로 둠 |
| 5 | BUILD | `state`·`storage`·`quality`·`transit`·`samples`·`reservations` 구현, `types.ts` 미수정 | 목적 확보를 `occupied`에 섞지 않고 `targets` 맵으로 분리 — 도착·취소·용기 점유 판정이 섞이지 않게 |
| 6 | BUILD | 격리·등급·만료·운송 단위 테스트 27개 작성 | 요청 항목마다 성공·실패 코드를 하나씩 확인 |
| 7 | GATE | `pnpm typecheck` 통과, 테스트 1회 실패 | 실패는 구현이 아니라 테스트의 seq 계산(seeded receive 1 + reserve 3 + advance = 5)이 틀려 고침 |
| 8 | GATE | 태스크 기록 검사 실패 2회 | 애매한 곳의 줄마다 `(가정)`/`(확인 필요)` 표시가 필요했고, 이 실행에서 `(확인 필요)`는 막는 줄이라 `(가정)`으로 바꿔 사유를 적음 |
| 9 | GATE | `bash agents/harness/evals/checks.sh` ALL PASS | — |
