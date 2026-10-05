# 0030 — 주문 시 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계

- **읽은 문서:** AGENTS.md, domain.md (0002·포인트 규칙), 0002 sdd.md (설계 패턴 참고)
- **접근:**
  - `src/pricing/points.ts`: 순수 함수 `calculatePoints(total, options?)` 구현.
  - 시그니처: `calculatePoints(total: number, options?: { couponUsed?: boolean; isVip?: boolean }): number`
  - 금액은 `number` 정수로 다루고, 입력 경계에서 `Number.isInteger`로 검증 (0002 패턴 따름).
  - 포인트 적립: base = total × 0.01, 반올림 후 정수로 변환.
  - 쿠폰/VIP 적용: 곱셈 규칙 (base × 0.8 if coupon, base × 1.5 if VIP, 둘 다면 × 1.2).
  - Math.round 사용하여 소수점 반올림 (0.5 이상 올림).

- **대안·트레이드오프:**
  - 적립률을 constants로 정의 vs 하드코딩: constants로 정의하면 domain.md 규칙과의 추적이 쉽다 → 채택.
  - 쿠폰 감지: 호출자가 boolean으로 명시 vs 할인 금액으로 유추: boolean 명시가 명확하고 0003 설계가 정되면 조정 가능 → 채택.
  - VIP 상태 소스: 주문 서비스(0005)에서 전달 → 이 모듈은 순수 함수로만 유지.
  - 최소값 0 vs 1: domain.md 규칙 7에서 0 허용 → 채택 (원문 "1포인트 단위"는 단위를 의미, 최소값 아님).
  - 오버플로우: number 타입이므로 MAX_SAFE_INTEGER 이내면 안전 (0002와 동일).

- **파일 계획:**
  - `src/pricing/points.ts`: 계산 함수 + 타입 정의 (Point = number)
  - `src/pricing/points.test.ts`: 규칙별 테스트 (domain.md 규칙 1~8 대응)
  - `agents/context/domain.md`: 포인트 규칙 1~8 추가
  - 기존 `src/pricing/price-cart.ts`와 통합 지점: 호출자가 priceCart 결과의 total을 calculatePoints에 전달 (0005에서)

- **위험:**
  - 쿠폰/VIP 중복 계산 실수: 곱셈 순서 명시 (1% × 0.8 × 1.5 = 1.2%).
  - 부동소수점 오차 (0.01 * total): 최종 반올림으로 흡수, 테스트 케이스에서 경계값 포함.
  - VIP/쿠폰 인자 누락 시 기본값: options 선택적, 기본값은 둘 다 false.

- **검증 계획:**
  - 단위 테스트:
    - 규칙 1: 포인트 정수성 (0002 domain.md 패턴처럼 Number.isInteger 검증)
    - 규칙 2: 기본 1% (총 5개 케이스: 100, 1000, 10000, 50000, 99999)
    - 규칙 3: 쿠폰 사용 (동일 금액으로 80% 확인)
    - 규칙 4: VIP (동일 금액으로 150% 확인)
    - 규칙 5: VIP + 쿠폰 (120% 확인)
    - 규칙 6: 반올림 경계값 (0.5 이상: 9501 → 95, 미만: 9500 → 95, 정확: 10000 → 100)
    - 규칙 7: 0포인트 허용 (반올림 후 0 < 1인 경우)
    - 규칙 8: 빈 주문 (total = 0 → 0포인트)
  - `pnpm check`: Typecheck, 단위 테스트, spec Acceptance

## 계획과 달라진 점

(작업 후 기록)

## 검증 결과
