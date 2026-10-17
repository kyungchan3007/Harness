# 0040 — 시료 보관 엔진 확장 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1·브랜치 task/0040-lab 확인, TASKS.md 점유 | 이슈·브랜치는 이미 있음 |
| 2 | DEFINE/PLAN | 문서 5개·src/lab 전부 읽고 prd·sdd 작성 | 점유를 `occupied` 하나로 통일하면 운송 확보 규칙이 isFree에 자동 반영됨 |
| 3 | BUILD | guard hook이 prd의 (가정) 표기 누락·"업무 값" 문구를 막음 → prd 문구 수정 후 재시도 | 수치 해당 없음 줄은 불필요해 "문서에 없는 수치 규칙은 더하지 않는다"로 바꿈 |
| 4 | BUILD | state(inTransit·isTick), quality, transit, samples, reservations 구현 | 분취 자식 등급은 부모 상속(samples.ts 주석), 격리·운송 검사는 부모/시료 기준. 기존 E5 재전송은 Engine.run이 이미 먼저 처리 |
| 5 | GATE | 첫 `pnpm check`는 테스트 파일의 noUncheckedIndexedAccess 타입 오류로 FAIL → `?.`로 수정 | 검사를 약화하지 않고 테스트 코드만 고침 |
| 6 | RECORD | 재실행 ALL PASS, prd 체크박스·sdd 검증 결과·TASKS·JOURNAL 갱신 | 커밋은 요청이 없어 하지 않음 |
