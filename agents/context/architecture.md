# Architecture

- 런타임: Node 22+, TypeScript(strict, ESM/NodeNext)
- 패키지 매니저: pnpm 전용 (npm/yarn lockfile은 게이트에서 차단)
- 테스트: Vitest (`src/**/*.test.ts`). 테스트 이름에 domain.md 규칙 번호를 붙인다 (예: `규칙 3: ...`)

## 모듈

| 경로 | 역할 | 성격 |
| --- | --- | --- |
| `src/money.ts` | `Won` 타입, 금액 검증 | 공용 |
| `src/cart/` | `Cart`: 상품 줄 추가·수량 변경·삭제, 장바구니 규칙 강제 | 상태 있음 |
| `src/pricing/` | `priceCart()`: 상품 합계·할인·배송비·결제 금액 | 순수 함수 |

- 할인 금액은 `priceCart`가 직접 계산하지 않고 인자로 받는다. 쿠폰 계산(0003)은 별도 모듈에서 할인 금액을 만든다.
- 도메인 규칙은 [domain.md](domain.md)가 단일 소스다.
