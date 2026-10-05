# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, domain.md (0002 배송비 규칙 참고), src/pricing/price-cart.ts (순수 함수 패턴)
- **접근:**
  - `src/pricing/points.ts`: `calculatePoints(total: number, hasDiscount: boolean, isVip: boolean): number` 순수 함수
  - 적립율 계산: 기본 1%, 쿠폰 적용 시 0.5%, VIP 1.5배
  - 내림 처리: `Math.floor()`
  - 포인트는 정수만 반환 (최소 0)
- **대안·트레이드오프:**
  - 쿠폰과 VIP 적용 순서: VIP가 배수를 곱하므로 먼저 적립율을 정하고(기본/쿠폰) 그 다음 VIP 배수 적용 — 구현이 명확하고 계산 순서가 일정함.
  - 함수 인자를 객체로: `{total, hasDiscount, isVip}` 형태면 가독성이 좋지만, 현재는 인자가 적으므로 위치 인자로 유지.
- **파일 계획:**
  - `agents/context/domain.md`: 포인트 규칙 추가 (규칙 4개)
  - `src/pricing/points.ts`: 함수 1개 (calculatePoints)
  - `src/pricing/points.test.ts`: 단위 테스트 5개 이상
- **위험:** 소수점 처리 실수 → `Math.floor()`로 명시적 내림. 테스트에서 경계값(100원, 150원, 200원 등) 확인.
- **검증 계획:** 적립율별 테스트, VIP+쿠폰 조합, 0원 케이스, `pnpm check`

## 계획과 달라진 점
없음

## 검증 결과
- `pnpm check`: ALL PASS (Typecheck, 단위 테스트 13개 + 기존 96개, lockfile, spec records)
- 포인트 규칙 1~4: 테스트 이름에 규칙 번호를 붙여 domain.md와 1:1로 추적
- 내림 처리: 150원(1.5% 실제값)→1, 200원(0.5% 실제값 1) 등 경계값 확인
- 조합: VIP(1.5배), 쿠폰(0.5%), VIP+쿠폰(0.75%), 0원 입력 모두 검증
