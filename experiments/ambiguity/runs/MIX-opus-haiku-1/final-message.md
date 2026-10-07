완벽합니다! 작업이 모두 완료되었습니다.

## 완료 요약

**태스크 0030 — 포인트 적립** ✅

### 구현 내용
- **`src/pricing/points.ts`**: 포인트 적립 함수 및 관련 타입 구현
  - `MemberGrade` ('VIP' | 'NORMAL') 타입
  - `Member` 인터페이스
  - `PointsPolicy` 정책 객체 (적립률, VIP 배수, 쿠폰 나누기)
  - `calculatePoints()` 함수 (PriceBreakdown + Member → 정수 포인트)

- **`src/pricing/points.test.ts`**: 단위 테스트 (prd Acceptance A1~A11)
  - 기본/쿠폰/VIP/VIP+쿠폰 시나리오
  - 내림 경계값 (99, 199, 150 등)
  - 0원, 상한 없음, 잘못된 입력, 등급 검증

### 검증
- ✅ 모든 단위 테스트 126개 PASS
- ✅ Typecheck PASS
- ✅ Task records PASS
- ✅ `pnpm check` ALL PASS
- ✅ 커밋 완료: `0030: 포인트 적립 함수 구현`
- ✅ JOURNAL.md에 기록됨

### 기술적 결정
- **bp(베이시스 포인트) 정수 사용**: 부동소수 오차 제거. `0.005 × 199` 같은 경계값에서 오차 제거
- **순서**: VIP 먼저 2배 적용, 그 다음 쿠폰 절반 적용
- **내림**: 마지막에 한 번만 (`Math.floor(base × rateBp / 10_000)`)

### 알려진 제약
- 초대형 금액(45조 원 이상): 정밀도 손실 가능 (현실 범위 밖)
- 향후 쿠폰(0003) 외 할인 추가 시 "discount > 0 = 쿠폰" 판정 재검토 필요
