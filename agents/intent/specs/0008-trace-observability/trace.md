# 0008 — PRD·SDD·Trace 분리 + hooks 자동 기록 — Trace

> 이 태스크는 hooks를 만드는 태스크라, 작업 세션이 harness-lab 밖(ClauseLens 세션)에서 돌았습니다. 그래서 이 태스크 자체의 자동 기록은 없고, e2e 검증 실행분만 자동 기록에 남습니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | PR #1 브랜치(`task/0002-cart-pricing`)에 이어서 작업 | 사용자 지시: PR #1에 추가 |
| 2 | CONTEXT | hooks 입력 형식을 공식 문서로 확인하도록 별도 에이전트 실행 | stdin 필드명·이벤트명을 추측하면 조용히 기록이 빠질 수 있음 |
| 3 | BUILD | 0001·0002 spec을 폴더로 옮기고 prd/sdd로 분리, trace는 사후 재구성 | 재구성임을 파일 상단에 명시 (자체 기록의 신뢰도 구분) |
| 4 | BUILD | `git rm`으로 마지막 템플릿을 지우자 templates 폴더가 사라져 템플릿 쓰기 실패 | 폴더를 다시 만들고 재작성. 되돌림 1회 |
| 5 | CONTEXT | hooks 문서 확인 결과 수신: PostToolUseFailure 존재, exit 2만 차단 | 매처 문법·실패 이벤트 필드명은 문서가 불명확 → e2e로 확인하기로 |
| 6 | BUILD | 게이트에 폴더 검사 추가 → 0008 sdd 누락으로 FAIL | 의도한 실패. 검사가 동작함을 확인 |
| 7 | BUILD | `trace.mjs`, settings.json, 단위 테스트 작성 → 19개 PASS | 순수 함수를 분리해 hook을 테스트 가능하게 |
| 8 | VERIFY | 복사본 repo에서 `claude -p` e2e → 5개 이벤트 기록, 마스킹 동작 | macOS에 `timeout` 명령이 없어 첫 실행 실패, 제거 후 재실행 |
| 9 | BUILD | 프로젝트 경로 단독 표기가 `..`로 보여 `<project>`로 수정 | 사소하지만 기록을 읽는 사람이 헷갈림 |
| 10 | VERIFY | e2e 기록을 sed로 고쳐 증거로 쓰려다 되돌림 | 증거를 손대면 안 됨 → 재실행한 원본으로 교체 |
| 11 | VERIFY | 비태스크 브랜치 e2e → `.unassigned.jsonl`, git 미추적 확인 | Acceptance 4번 |
