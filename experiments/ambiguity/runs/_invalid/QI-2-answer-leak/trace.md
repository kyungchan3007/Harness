# Trace 0030 — 포인트 적립

| 판단 | 이유 | 한 일 |
| --- | --- | --- |
| 문서 먼저 | guard hook 강제 | PRD 작성 (요구사항 명확화, 완료 조건) |
| 문서 먼저 | 구현 전 설계 | SDD 작성 (알고리즘, 테스트 계획) |
| 타입 활용 | 기존 `PriceBreakdown` 재사용 | `src/pricing/points.ts` 구현 |
| 전수 테스트 | 5개 규칙 + 엣지 케이스 | `src/pricing/points.test.ts` 작성 (15개 케이스) |
| 반올림 확인 | 소수 절삭(floor) 검증 | 계산 오류 수정 후 테스트 재작성 |
