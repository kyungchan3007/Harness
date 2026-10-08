# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, domain.md, src/pricing/price-cart.ts
- **접근:**
  - `src/pricing/points.ts`: `calculatePoints(total, options)` 순수 함수
  - 입력: `total`(결제 금액, Won), `options`({ isVip?: boolean, hasCoupon?: boolean })
  - 출력: 정수 포인트
  - 금액은 `number` 정수로 다루고, 입력 경계에서 `Number.isInteger`로 검증
  - 반올림: `Math.round(value * 10) / 10` 대신 `Math.round(value)` (이미 소수 1자리)
- **비목표로 제외:** 포인트 이력, 사용/만료, 타입 안정성(0030 이후)
- **대안·트레이드오프:**
  - 쿠폰·VIP 로직을 별도 함수로 분리: 지금은 한 함수에서 처리하고, 나중에 필요하면 분리한다. 현재 조건이 3가지뿐이므로 과하다.
  - 포인트를 브랜드 타입으로: 금액처럼 `Won` 타입을 만들 수 있지만, 0002와 동일하게 `number`로 진행하고 나중에 도입.
  - 적립률을 설정값으로: 1%, 3%를 상수 또는 `options`로 둘 수 있는데, 규칙이 고정되었으므로 상수 처리.
- **파일 계획:** 
  - `src/pricing/points.ts` (함수)
  - `src/pricing/points.test.ts` (테스트)
  - `agents/context/domain.md` (규칙 추가)
  - `trace.md` (과정 기록)
- **위험:** 부동소수점 연산 오류 (1.5 ≠ 1.50000001)
  - → `Math.round` 후 비교
- **검증 계획:** 규칙별 단위 테스트 (최소 5개), `pnpm check`

## 구현 계획
1. `calculatePoints` 함수 작성
   - VIP + 쿠폰 X → 3% 적립
   - VIP 아님 + 쿠폰 O → 0% 적립
   - VIP 아님 + 쿠폰 X → 1% 적립
2. 경계값 테스트 (49원, 50원, 반올림)
3. `pnpm check` PASS 확인
