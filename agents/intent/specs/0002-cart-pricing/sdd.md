# 0002 — 도메인 전환: 장바구니 금액 계산 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, harness/loop.md, context/architecture.md
- **접근:**
  - `src/cart/`: 상태를 가진 `Cart` 클래스. 불변 규칙(수량·가격 검증, sku 병합)을 여기서 강제한다.
  - `src/pricing/`: `priceCart(items, options)` 순수 함수. 배송 정책은 인자로 주입하고 기본값을 둔다.
  - 금액은 `number` 정수로 다루고, 입력 경계에서 `Number.isInteger`로 검증한다.
- **대안·트레이드오프:**
  - 금액을 `bigint`로: 오버플로에 안전하지만 원화 장바구니 규모에서는 과하고 테스트 가독성이 떨어진다. → 기각. `Number.MAX_SAFE_INTEGER` 초과는 현실적으로 없다.
  - 브랜드 타입 `Won`: 타입 안정성은 좋지만 초기엔 의식(ceremony)이 많다. → 타입 별칭만 두고, 필요해지면 0003 이후 도입.
  - 할인을 `priceCart` 안에서 계산: 0003에서 쿠폰 로직이 가격 계산과 섞인다. → 기각. 할인 금액을 외부에서 받는다.
  - 배송비 기준을 할인 전 금액으로: 구현은 쉽지만 쿠폰으로 무료배송 기준을 넘기는 꼼수가 생긴다. → 기각. 할인 후 금액 기준.
- **파일 계획:** `src/cart/cart.ts`(+test), `src/pricing/price-cart.ts`(+test), `agents/context/domain.md`, architecture.md·README·AGENTS 갱신
- **위험:** 할인 > 상품 합계일 때 음수 금액. → 할인은 0 이상, 상품 합계 이하만 허용하고 위반 시 거부.
- **검증 계획:** 규칙별 단위 테스트, 배송비 경계값 테스트, `pnpm check`

## 검증 결과
- `pnpm check`: ALL PASS (Typecheck, 단위 테스트 13개, lockfile, spec Acceptance)
- 장바구니 규칙 1~5, 배송비 규칙 1~3: 테스트 이름에 규칙 번호를 붙여 domain.md와 1:1로 추적
- 배송비 경계값: 49,999원(유료) / 50,000원(무료), 할인 후 기준 49,999 / 50,000 확인
- 공백: 게이트는 "domain.md의 모든 규칙에 테스트가 있는지"를 검사하지 못한다 → LEARNINGS 실험 후보
