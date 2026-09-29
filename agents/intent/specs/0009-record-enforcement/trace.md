# 0009 — 기록 강제 장치 — Trace

> ClauseLens 세션에서 작업해 이 태스크 자체의 자동 기록은 없습니다(e2e 실행분만).

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CONTEXT | 사용자 요청을 제품 설계로 오해해 `task/0009-product-design` 브랜치 생성 → 사용자 정정 | 브랜치 삭제(변경 없음). 요청은 "하네스가 기록을 강제하는지 확인" |
| 2 | CONTEXT | 현재 강제 수준 점검: 게이트는 있는 폴더만 검사, 템플릿 통과, TASKS 미검사 | 빈틈 5개 도출 |
| 3 | VERIFY | 복사본에서 권한 우회(`--dangerously-skip-permissions`) 에이전트 실험 시도 → 권한 분류기가 거부 | 우회하지 않음. 사용자가 강제 장치 먼저 넣기로 결정 |
| 4 | CLAIM | 브랜치 `task/0009-record-enforcement`, TASKS 0009 in-progress | - |
| 5 | DEFINE·PLAN | prd·sdd 작성 | Bash 사전 차단은 오탐 때문에 제외, Stop·게이트로 사후 보완 |
| 6 | BUILD | 판정 로직 `lib/records.mjs` 하나로 통합, hook 3개·게이트가 공유 | hook과 게이트 판정이 어긋나지 않게 |
| 7 | VERIFY | 단위 테스트 32개 PASS, 기존 태스크 폴더 4개도 새 게이트 통과 | 0001·0002·0008 기록이 이미 형식을 만족 |
| 8 | VERIFY | hook 직접 실행: 커밋 없는 repo에서 브랜치 "알 수 없음", Stop이 변경을 놓침 | `symbolic-ref` 대체, staged 변경 수집 추가 |
| 9 | VERIFY | e2e A: 차단 성공. 그러나 차단된 시도가 자동 기록에 없음 | **새 빈틈 발견** → guard가 직접 `blocked` 기록 |
| 10 | VERIFY | e2e B: 첫 Stop에서 돌려보냄 → 에이전트가 trace 작성 → 통과 | 차단 사실이 기록에 안 보임 → stop-check도 `StopBlocked` 기록 |
| 11 | VERIFY | e2e A·B 재실행, 원본 기록을 `e2e/`에 보관 | 증거는 수정 없이 보관 |
