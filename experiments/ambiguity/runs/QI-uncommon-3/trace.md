# 0030 — 포인트 적립 기능 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | DEFINE | prd.md: 기본 적립(1%), 쿠폰/VIP 규칙, 계산 예시 작성 | 요구사항 명확화: 모호한 부분 질문 후 답변 수렴 |
| 2 | DEFINE | sdd.md: 알고리즘, 타입, 테스트 케이스 정의 | 구현 전 설계 문서로 확정 |
| 3 | BUILD | src/pricing/points.ts: calculatePoints 구현 | NORMAL 기본 1%, 쿠폰시 0, VIP 3% 적용 |
| 4 | BUILD | src/pricing/points.test.ts: 11개 단위 테스트 작성 | 기본/쿠폰/VIP/반올림/입력검증/엣지케이스 커버 |
| 5 | GATE | pnpm check 실행 → 타입체크·테스트 PASS, trace 형식 FAIL | 표 형식 수정 후 재실행 |
| 6 | GATE | trace.md 표 채우기 → pnpm check PASS | Acceptance 5개 체크박스 모두 완료 |
