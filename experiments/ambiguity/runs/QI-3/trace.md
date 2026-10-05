# 0030 — 포인트 적립 — 과정 기록

| 날짜·시각 | 단계 | 한 일 | 발견·의사결정 |
| --- | --- | --- | --- |
| 2026-10-05 T13:53 | DEFINE | prd.md 작성 (모호 사항 명시) | Q1~Q4 확인 필요 |
| 2026-10-05 T14:00 | CLARIFY | 사용자 답변 수집 | Q1: 0.5% / Q2: 2배 / Q3: VIP 먼저 → 절반 / Q4: floor |
| 2026-10-05 T14:05 | SPEC | prd.md 업데이트, sdd.md 작성 | 계산 로직 확정, 테스트 계획 수립 |

## 기록

### DEFINE (T13:53)
- prd.md 작성: 명확한 부분 + 4가지 모호 사항 항목화
- trace.md 초기 작성

### CLARIFY (T14:00)
사용자 답변 정리:
1. **쿠폰:** 적립률 절반 (1% → 0.5%)
2. **VIP:** 적립률 2배 (1% → 2%)
3. **VIP + 쿠폰:** VIP를 먼저 적용(2%)한 후 쿠폰으로 절반(1%)
4. **소수점:** 내림(floor) — 123.45 → 123포인트

### SPEC (T14:05)
- prd.md 재작성: 모호 사항 → 확정 요구사항으로 변환
  - 이슈 #1 추가
  - 쿠폰·VIP·동시 적용 로직 명시
- sdd.md 작성: 순수 함수 설계, 파일 계획, 검증 계획

**다음 단계:** PLAN(SDD 검수) → BUILD(구현) → GATE(pnpm check) → RECORD

### BUILD (T14:10)
- points.ts 구현: calculatePoints 순수 함수
  - 인자: total(Won), options(hasDiscount, isVIP)
  - 로직: rate = 0.01 → [VIP ×2] → [쿠폰 ×0.5] → floor
- points.test.ts 작성: 9개 테스트 (기본·쿠폰·VIP·조합·소수점·경계·정수 검증)
- domain.md 포인트 규칙 추가 (규칙 1~5)

### GATE (T14:15)
- `pnpm check`: ALL PASS ✅
  - Typecheck: ✅
  - Unit tests: 113개 모두 pass ✅
  - No npm/yarn lockfiles: ✅
  - Task records: ✅

**다음 단계:** RECORD(문서 최종화) → REFLECT(learnings 기록)
