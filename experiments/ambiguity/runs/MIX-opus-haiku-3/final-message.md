완료했습니다! 작업 요약입니다.

## ✅ 태스크 0030 완료

**구현 현황:**
- `src/pricing/points.ts`: `calculateEarnedPoints(breakdown, member)` 함수 구현
- `src/pricing/points.test.ts`: 포인트 테스트 21개 (규칙별 경계값, 4조합, 통합)

**검증 결과:**
- ✅ `pnpm check` ALL PASS (typecheck · vitest · task records)
- ✅ 규칙 1~8 모두 SDD 기준 충족
- ✅ 천분율 정수 방식으로 소수점 오차 회피
- ✅ 큰 금액(MAX_SAFE_INTEGER) 정밀도 확보

**기록:**
- 커밋 2개: BUILD(점수 함수), docs(검증 결과)
- JOURNAL.md에 항목 추가
- trace.md 및 sdd.md 완성

**드러난 공백:**
- ⚠️ 쿠폰 판정이 `discount > 0`에 묶임 → 0003 이후 할인 종류별 처리 필요 (재확인 예정)
