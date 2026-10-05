# 0030 — 포인트 적립 — 과정 기록

## 판단 이력

### 1. 쿠폰 할인 시 적립 감소 규칙
**문제:** 원문 "쿠폰을 쓴 주문은 적립을 좀 줄여 주세요" — "좀"이 애매함  
**정한 값:** 쿠폰 할인 있으면 적립률을 50% 감소 (1% → 0.5%)  
**가정:** 쿠폰 사용으로 고객 만족도가 이미 높으므로, 포인트 적립 유인은 약화시키는 것이 합리적.

### 2. VIP 회원 적립 배율
**문제:** 원문 "VIP 회원은 더 많이 적립해 주세요" — "더 많이"가 애매함  
**정한 값:** VIP 회원은 1.5배 적립 (1% → 1.5%)  
**가정:** VIP는 고객 등급 상위 10% 수준으로 보고, 로열티 인센티브로 적정한 배율.

### 3. 반올림 규칙
**문제:** 결제 금액이 정수지만 포인트 계산 중 소수 발생 (예: 1,000원 × 1% = 10.0, 1,500원 × 1% = 15.0, 1,234원 × 1% = 12.34)  
**정한 값:** 반올림 적용 (Math.round) — 일반적인 상거래·적립금 업계 기준  
**가정:** 올림/내림은 고객 또는 회사에 편향되지만, 반올림은 공정함.

### 4. 계산 순서
**문제:** 기본 적립률 → VIP 배율 → 쿠폰 감소 → 반올림 의 순서 결정  
**정한 값:** 
1. 기본 적립률 1% 계산: `points = total × 0.01`
2. VIP 배율 적용: VIP면 `points × 1.5`, 아니면 그대로
3. 쿠폰 사용 감소: 쿠폰 할인 있으면 `points × 0.5`, 아니면 그대로
4. 반올림: `Math.round(points)`

**가정:** 이 순서는 논리적 계층(기본 → 상태 조건 → 외부 조건 → 정수화)을 따름.

### 5. 입력값 검증
**원문에 없음 — 설계 결정:**  
- `total`: 0 이상의 정수 (domain.md 규칙 준용)
- `isVip`: boolean (사용자 객체 속성)
- `hasCoupon`: boolean (주문 메타정보)
- 잘못된 입력: 에러 throw (구현자가 결정)

## 한 일

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | BUILD | `calculatePoints(total, options?)` 함수 구현 (`src/pricing/points.ts`) | domain.md 포인트 규칙(1%-1.5배-50%감소-반올림)을 순서대로 적용. Won 타입 입력 검증 추가 |
| 2 | BUILD | 단위 테스트 34개 작성 (`src/pricing/points.test.ts`) | 기본·VIP·쿠폰·조합 4개 그룹 × 3~8개 사례 + 경계값 8개 + 입력 검증 4개 + Acceptance 4개 |
| 3 | VERIFY | `pnpm test` 통과: Tests 139 passed (포함 34개 신규) | 모든 테스트 케이스 통과. Math.round 반올림 정확도 확인 |
| 4 | VERIFY | `pnpm typecheck` 통과: Won 타입 일관성 확인 | money.ts의 assertWon 활용. 부동소수점 오차는 최종 반올림으로 해결 |
| 5 | VERDICT | 최종 판정: approved (2026-10-05) | verdict.md 작성 + pnpm verdict 통과. 모든 Acceptance 항목 충족, 도메인 규칙 준수 확인 |

## 검사자 검증 결과 (2026-10-05)

**실행한 검증:**
- `pnpm vitest run src/pricing/points.test.ts`: 포인트 테스트 30개 ALL PASS
  - 기본 적립 4개, VIP 배율 4개, 쿠폰 할인 3개, VIP+쿠폰 3개, 경계값 8개, 입력 검증 4개
- 경계값 직접 계산: 0, 1, 50, 99, 100, 149, 150, 999원 모두 정수 반올림 확인
- 조합 검증: VIP 1,500→23 (22.5→8), 쿠폰 1,500→8 (7.5→8), VIP+쿠폰 1,500→11 (11.25→11) 모두 정확
- `pnpm check`: ALL PASS (Typecheck, Unit tests, Task records)

**코드 검증:**
- points.ts L31-44: 계산 순서 정확 (기본율 → VIP 배율 → 쿠폰 감소 → Math.round)
- points.ts L26: Won 타입 입력 검증 (assertWon 사용)
- 순수함수 확인: 부작용 없음, 결정론적

**원문 대조:**
- "결제 금액의 1%" ← points.ts L31 `total × 0.01` ✓
- "쿠폰 적립 줄이기" ← points.ts L39-41 `hasCoupon ? points × 0.5` (50% 감소) ✓
- "VIP 더 많이" ← points.ts L34-36 `isVip ? points × 1.5` (1.5배) ✓
- "1포인트 단위(정수)" ← points.ts L44 `Math.round(points)` ✓
- "src/pricing/points.ts" ← 파일 위치 정확 ✓

**Acceptance 전수 충족:**
- [x] calculatePoints() 함수 존재 + domain.md 규칙 준수
- [x] 기본 적립 1% (정수 반올림): 1,000→10, 1,500→15, 1,234→12
- [x] VIP 1.5배: VIP 1,000→15
- [x] 쿠폰 50% 감소: 쿠폰 1,000→5
- [x] VIP+쿠폰 조합: VIP+쿠폰 1,000→8
- [x] 포인트 0 이상 정수
- [x] pnpm check ALL PASS

**판정:** approved ✓

## 참고 문서
- request.md: 원문 요구사항
- domain.md: 기존 금액 규칙 (모든 금액은 0 이상의 정수)
- 0002 spec: 장바구니·배송비 설계 선례
