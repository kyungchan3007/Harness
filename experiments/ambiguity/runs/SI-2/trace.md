# 0033 — 포인트 적립 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 태스크 폴더, prd/sdd/trace 작성 + domain.md에 포인트 규칙 5개 추가 | spec 먼저 → 가드레일 강제 |
| 2 | DEFINE | prd.md 애매한 곳 추가 (memberType, 소수 처리, 쿠폰 판정, VIP 타입) | 사용자 요청이 정한 것 확인 후 (확인됨:) 마킹 |
| 3 | PLAN | sdd.md에 함수 설계, 적립률 상수화, 대안 검토 작성 | 0002 형식 참고 |
| 4 | BUILD | calculatePoints(total, discount, memberType) 함수 작성 + 18개 테스트 작성 | domain 규칙 1~5 각 3개 이상 테스트 |
| 5 | GATE | pnpm check: typecheck ✅, 18개 테스트 ✅ | 모든 규칙과 경계값(total=0, total=1) 검증 |
| 6 | RECORD | sdd.md 검증 결과 작성, JOURNAL.md에 기록, 커밋 생성 | Acceptance 1~6 완료, 규칙과 테스트 1:1 추적, 공백 명시 |
