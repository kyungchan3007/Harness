# 0030 — 포인트 적립 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | DEFINE | prd.md 작성: 문제·목표·비목표·acceptance 정의 | 요구사항이 모호한 부분(쿠폰 감소율, VIP 배율) 명확히 함 |
| 2 | DEFINE | sdd.md 초안 작성: 설계·대안·파일 계획 | domain.md가 단일 소스이므로, 포인트 규칙을 먼저 정의 |
| 3 | CONTEXT | domain.md에 포인트 규칙 1~4 추가 | 쿠폰 50% 감소, VIP 2배, 내림 처리 규칙 정의 |
| 4 | CLAIM | TASKS.md에 0030 행 추가 (in_progress) | 작업 착수 선언 |
| 5 | PLAN | builder 에이전트로 구현 위임 | src/pricing/points.ts, 테스트, pnpm check 통과 목표
| 6 | BUILD | points.ts 구현 (calcPoints 함수) | 순수 함수, 입력 검증(assertWon), 계산식: total × 0.01 × couponRate × vipRate, 내림 처리
| 7 | BUILD | points.test.ts 작성 | 규칙 1~4 각각 + 경계값(0원, 1원, 99원) + 입력 검증 + 옵션 기본값 = 총 32개 테스트 케이스
| 8 | GATE | pnpm check 전체 통과 | typecheck ✅, unit tests ✅, lockfile ✅, task records ✅
| 9 | DONE | 0030-points 브랜치 완료 | 포인트 규칙 1~4 모두 구현, pnpm check ALL PASS
