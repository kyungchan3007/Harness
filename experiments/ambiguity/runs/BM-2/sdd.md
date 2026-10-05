# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** domain.md (금액·정수 규칙), 0002 prd.md·sdd.md (금액 계산 선례)
- **접근:**
  - `calculatePoints(total, options?)` 순수 함수. `total`은 결제 금액(0 이상 정수), `options.isVip`, `options.hasCoupon` 플래그로 조건을 받는다.
  - 계산 순서: 기본 1% → VIP 배율 (1.5x) → 쿠폰 감소 (0.5x) → Math.round
  - 입력 검증: `total`이 0 이상 정수인지 확인. 위반 시 에러 throw.
  - 금액은 `number` 정수로 다루고, 최종 포인트도 0 이상의 정수.

- **대안·트레이드오프:**
  - 쿠폰 감소율 50% vs 고정값 차감: 50%는 비례적이고 직관적 → 50% 선택.
  - VIP 배율 1.5x vs 1.2x vs 2x: 1.5x는 적정한 보상 수준 → 1.5x 선택.
  - 반올림 Math.round vs Math.floor vs Math.ceil: 반올림이 공정하고 업계 표준 → round 선택.
  - 사용자 객체 참조 vs 플래그: 플래그가 현재는 단순하고 충분함 → 플래그 선택.

- **파일 계획:** 
  - `src/pricing/points.ts`: `calculatePoints()` 함수 + 타입 정의
  - `src/pricing/points.test.ts`: 단위 테스트 (기본·VIP·쿠폰·조합, 경계값, 입력 검증)
  - `agents/context/domain.md`: 포인트 규칙 섹션 추가

- **위험:** 
  - 부동소수점 오차 (0.1 + 0.2 ≠ 0.3) → Math.round 최종 반올림으로 완화
  - VIP·쿠폰 조합 순서 불명확 → SDD와 domain.md에서 순서 명시로 완화
  - 0포인트 처리 (금액 낮음) → 현재는 0도 허용, 추후 비즈니스 정책 필요

- **검증 계획:**
  - 단위 테스트: 기본·VIP·쿠폰·조합 4개 시나리오 × 3개 이상 입력값 ≥ 12개
  - 경계값: 0, 50, 100, 999, 1000, 1234, 50000
  - 입력 검증: 음수, 소수, null, undefined 확인
  - `pnpm check`: 타입 체크, 테스트, 스펙 Acceptance 검사
  - 도메인 규칙 추적: 테스트 이름에 규칙 번호 (0002 선례 준용)

## 검증 결과

(구현자가 진행 후 업데이트)

- 테스트 실행 결과: 
- 게이트 통과: 
- 스펙 Acceptance 체크:
