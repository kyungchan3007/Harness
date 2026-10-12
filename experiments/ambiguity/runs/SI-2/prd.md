# 0033 — 포인트 적립 — PRD

## PRD
- **문제:** 주문 후 포인트 적립이 없어서 고객 충성도 프로그램이 작동하지 않는다.
- **목표:** 주문 결제 금액에 따라 포인트를 적립하는 기능을 만든다. 기본 적립률, 쿠폰 적용 시 조정, VIP 회원 보너스를 지원한다.
- **비목표:** 포인트 사용·충전·만료, HTTP API, 영속화.
- **이슈:** #1

## Requirements

| 요구사항 | 형식 |
| --- | --- |
| 기본 적립률은 결제 금액의 1% | `Math.floor(total × 0.01)` |
| 쿠폰을 쓴 주문은 적립률 0.5% | discount > 0일 때 `Math.floor(total × 0.005)` |
| VIP 회원은 적립률 2배 | memberType === 'VIP'일 때 1% → 2%, 쿠폰 적용 시 0.5% → 1% |
| 포인트는 정수 | 1포인트 단위, 소수점 없음 |
| 결제 금액 0은 포인트 0 | 빈 주문, 취소 주문 등 |

## 애매한 곳·가정
- memberType 기본값은 'NORMAL' — 입력값이 없으면 기본 적립률 1% 적용 (확인됨: 기본 1% 적립)
- 결제 금액은 domain.md에서 정의한 대로 0 이상의 정수 — 소수점 계산 후 `Math.floor()` 적용 (확인됨: 1포인트 단위)
- 쿠폰 할인이 0이 아닌지로만 판단 — "쿠폰 사용 여부"를 discount > 0으로 판정 (확인됨: 쿠폰 사용 시 적립 감소)
- VIP 회원 타입은 정확히 'VIP'(대문자) — 소문자나 공백 포함 시 일반 회원 취급 (가정)

## Acceptance
- [x] `calculatePoints(total, discount, memberType)` 함수가 domain.md 포인트 규칙 1~5를 지킨다 (규칙마다 테스트 1개 이상)
- [x] 기본 적립: total=100,000, discount=0, memberType='NORMAL' → 1000 포인트
- [x] 쿠폰 적용: total=100,000, discount=10,000, memberType='NORMAL' → 500 포인트
- [x] VIP 기본: total=100,000, discount=0, memberType='VIP' → 2000 포인트
- [x] VIP 쿠폰: total=100,000, discount=10,000, memberType='VIP' → 1000 포인트
- [x] 경계값: total=0 → 0포인트, total=1 (기본) → 0포인트, total=100 (VIP) → 2포인트
- [x] `src/pricing/points.ts`에 구현
- [x] `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
