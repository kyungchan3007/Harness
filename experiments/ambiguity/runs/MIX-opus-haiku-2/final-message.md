완료했습니다! 📦

## 요약

**0030 포인트 적립** 태스크를 성공적으로 구현했습니다.

### 구현 내용
- **`src/pricing/points.ts`**: `calculatePoints(breakdown, member)` 순수 함수
  - 기준 금액: `subtotal - discount` (배송비 제외)
  - 적립률 4가지: NORMAL 1% / NORMAL+쿠폰 0.5% / VIP 2% / VIP+쿠폰 1%
  - 정수 basis point(bp) 사용으로 부동소수 오차 원천 차단
  - 모든 입력 검증 (RangeError 거부)

- **`src/pricing/points.test.ts`**: 30개 테스트 케이스
  - 대표 예시, 버림 경계, 0원·상한, 입력 거부 모두 커버
  - 테스트 이름에 "포인트 규칙 N:" 붙임

### 게이트 결과
✅ **ALL PASS** (Typecheck, Unit tests 124/124, Task records)

### 기록
- `trace.md`: 구현 과정 및 게이트 통과 기록
- `prd.md`: 9개 Acceptance 항목 모두 체크 ✓
- `TASKS.md`: 0030 상태 done 반영
- `JOURNAL.md`: 2026-10-07 기록 추가

커밋: [허점] 0003(쿠폰) 미구현 → 향후 쿠폰 외 할인 생기면 판단 필요
