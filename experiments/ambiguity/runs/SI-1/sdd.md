# 0033 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계

- **읽은 문서:** AGENTS.md, domain.md, architecture.md, 0002 SDD
- **접근:**
  - `src/pricing/points.ts`에 `calculatePoints(subtotalMinusDiscount, options?)` 순수 함수 구현.
  - 포인트는 `Math.floor(subtotalMinusDiscount * 0.01)` 으로 계산.
  - `options`에 `isVip?: boolean` 옵션으로 VIP 배율(2배) 적용.
  - 입력 `subtotalMinusDiscount`는 할인 후 상품 금액(`subtotal - discount`)이고, 배송비는 제외.

- **대안·트레이드오프:**
  - 포인트를 `number` vs `bigint`: 1% 계산 규모에서 `number`로 충분. 오버플로우 없음.
  - 옵션을 객체 vs 개별 인자: 객체로 통일하여 확장성 고려.
  - VIP 배율을 2로 하드코딩: 현재 사양에 맞음. 향후 필요시 옵션화.

- **파일 계획:** 
  - `src/pricing/points.ts` (주 로직)
  - `src/pricing/points.test.ts` (테스트 6개+)
  - `agents/context/domain.md` (규칙 추가)

- **위험:**
  - 부동소수점 연산에서 1% 계산 오차: `Math.floor()`로 항상 내림.
  - `total < 0`인 경우: 입력 경계에서 0 이상 검증 (priceCart에서 이미 보장).

- **검증 계획:** 규칙별 단위 테스트, 경계값(99원/100원), VIP 배율, 할인 유무 테스트.

## 계획과 달라진 점

없음.

## 검증 결과

- `pnpm check`: ALL PASS (Typecheck, 단위 테스트 136개 포함 18개 points 테스트, lockfile, task records)
- 포인트 규칙 1~6: 테스트 이름에 규칙 번호를 붙여 domain.md와 1:1로 추적 (규칙 1,2,3,4,5,6 각 1~2개)
- VIP 배율: 2배 검증 (calculatePoints(1000, {isVip:true}) = 20)
- 경계값: 99원(0포인트) / 100원(1포인트), VIP 99원(0) / 100원(2) 확인
- 버림 연산: Math.floor() 검증 (1234원 → 12포인트, 1299원 → 12포인트)
- 할인 효과: 할인 없음(10,000 → 100포인트) vs 할인 3,000(7,000 → 70포인트) 비교
- 입력 검증: 음수·소수점 거부 확인
- 공백: 없음.
