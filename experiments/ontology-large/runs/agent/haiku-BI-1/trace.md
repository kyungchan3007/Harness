# 0040 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 브랜치 `task/0040-lab` 확인, 이슈 #1 | 요청이 지정한 번호·브랜치 그대로 사용 |
| 2 | DEFINE | prd.md 작성 (애매한 곳 가정 기록) | 요청에 없는 순서·세부 값은 docs·ontology 표를 기준으로 가정 |
| 3 | PLAN | sdd.md 작성: 운송 목적 확보를 `targeted` 맵으로 분리, 분취 자식 등급 상속 | `occupied`에 섞으면 finish·move가 출발·목적을 구별해야 해서 기각 |
| 4 | RECORD-PRE | `pnpm request 1` 실패 | 원격 저장소가 없어 `gh issue view`가 동작하지 않음 → request.md는 만들지 않음, 판정 기준은 요청 원문으로 둠 (sdd 계획과 달라진 점에 기록) |
| 5 | BUILD | state·storage·samples·reservations·quality·transit 구현, `types.ts`·`lab.ts`는 그대로 | 공개 계약 파일은 손대지 않음. 명령의 검사 순서는 ontology 5절 표를 따름 |
| 6 | VERIFY | tsc PASS, lab 테스트 첫 실행 1건 실패 → 테스트 작성 오류 | 같은 활성 격리 재설정은 성공이 맞음. 테스트 기대값을 계약에 맞게 고침 (구현은 그대로) |
| 7 | GATE | checks.sh 실행, 태스크 기록 검사에서 가정 표시 누락 1건 → prd 문구 수정 | 검사를 약화하지 않고 가정 칸을 채움 |
