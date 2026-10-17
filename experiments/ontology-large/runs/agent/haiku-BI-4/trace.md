# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | TASKS.md에 0040 in-progress 행 추가, 브랜치 `task/0040-lab` 확인 | 요청이 이슈 #1·브랜치를 지정함. 이슈 생성·`gh issue develop`은 이미 되어 있다고 요청에 명시됨 |
| 2 | DEFINE | prd.md 작성, 애매한 곳 5개 (가정) 표기 | 업무 값(금액·비율)이 없어 (확인 필요) 항목은 없음. 등급 상속·운송 점유 방식은 저장소 정책 주석이 정한 값을 따름 |
| 3 | PLAN | sdd.md 작성, `claimed` 맵 방식 선택 | 목적 용기를 `occupied`에 넣으면 `occupied`의 의미(시료가 있는 용기)가 깨짐 → 별도 맵 |
| 4 | BUILD | state·storage·samples·reservations·quality·transit 구현, lab.test.ts 18개 작성 | 명령 순서 검사를 docs 원문 순서에 맞춤. 만료는 expiresAt <= now를 advanceTime 한 번에 처리 |
| 5 | GATE | 첫 시도에 tsc·vitest 전부 PASS, checks.sh ALL PASS | 테스트가 첫 실행에 통과해, 실패 후 스냅숏 동일·재전송 테스트가 실제로 잡는지 기존 구현을 되돌려 보는 확인은 하지 않음 (한계) |
| 6 | RECORD | sdd 검증 결과, prd Acceptance 체크, TASKS done, JOURNAL 한 줄 | 이슈 동기화(`pnpm issue-sync`)는 gh 연결이 없어 실행하지 않음 |
