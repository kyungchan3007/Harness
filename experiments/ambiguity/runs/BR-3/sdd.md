# 0030 — 포인트 적립 기능 — SDD

요구사항: [prd.md](prd.md)

## 설계

- **읽은 문서:**
  - request.md (원문 이슈)
  - agents/context/domain.md (도메인 규칙)
  - src/pricing/price-cart.ts (기존 금액 계산 함수)
  - src/money.ts (Won 타입 정의)

- **접근:**
  - 결제 금액(`total`)과 할인액(`discount`), VIP 여부(`isVip`)를 인자로 받아 포인트를 계산한다.
  - 기본 공식: `points = round((total − discount) × 0.01)`
  - VIP 배율 적용: VIP일 경우 `points × 1.5`
  - 정수 반올림은 JavaScript의 `Math.round()` 사용

- **대안·트레이드오프:**
  - **쿠폰 감소 방식:**
    - 대안 A (선택): 할인액을 포인트에서 제외 → `round((total − discount) × 0.01)`
    - 대안 B: 고정 비율로 감소 (예: 50%) → 복잡도 증가, 할인액 반영 불명확
    - 선택 이유: 공식이 단순하고 할인액을 명확히 반영함
  
  - **VIP 배율:**
    - 대안 A: 2배 → 너무 큼
    - 대안 B (선택): 1.5배 → 적절한 수준
    - 대안 C: 고정 포인트 추가 → 규모가 클수록 부공정
    - 선택 이유: 업계 표준 VIP 배율

  - **정수 반올림:**
    - 대안 A (선택): Math.round() → 표준 반올림, 예측 가능
    - 대안 B: Math.floor() → 보수적 (고객 손실)
    - 대안 C: Math.ceil() → 과대 지급
    - 선택 이유: 공정성과 고객 만족도

- **파일 계획:**
  - `src/pricing/points.ts`: 함수 `calculatePoints(total, discount?, isVip?)` 구현
  - `src/pricing/points.test.ts`: 테스트 케이스 작성
  - `agents/context/domain.md`: 포인트 규칙 (1~6) 추가

- **위험:**
  - 소수점 계산에서 부동소수점 오류 가능성 → Math.round() 사용으로 완화
  - 음수 결과 가능성 → min(result, 0)으로 조정
  - VIP 적용 후 반올림 순서 (결과 차이 있음) → 최종 반올림으로 통일

- **검증 계획:**
  - 단위 테스트:
    - 기본 케이스: 100원 → 1포인트, 150원 → 2포인트, 199원 → 2포인트, 200원 → 2포인트 (반올림 검증)
    - 할인 적용: total=1000원, discount=100원 → round((1000-100)×0.01) = round(9) = 9포인트
    - VIP 적용: 10포인트 (기본) → 15포인트 (VIP)
    - 할인+VIP: total=1000원, discount=100원, isVip=true → round(9 × 1.5) = round(13.5) = 14포인트
    - 음수 방지: 음수 결과는 0으로 조정 (논리적으로 할인액이 total을 초과하지 않으면 발생하지 않음)
    - 빈 장바구니: total=0 → 0포인트
    - 큰 수: total=50000원 → 500포인트, 50000원 + VIP → 750포인트

## 계획과 달라진 점

(구현 후 trace.md에서 기록할 예정. 현재: 없음)

## 검증 결과

(구현 후 기록 예정)
