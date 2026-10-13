명백한 버그를 발견했습니다. 코드 69번 줄에서:
- `discountOf(c, subtotal, subtotal)` ← 상품 쿠폰의 기준이 **줄 금액**(`line.unitPrice * line.quantity`)이 아니라 **subtotal** 사용
- `+ 0 * line.quantity` ← 의미 없는 표현

이는 다음 규칙들을 위반합니다:
- **규칙 5**: 상품 쿠폰의 기준 금액은 대상 상품 줄의 금액이어야 함
- **규칙 2**: 정액 쿠폰도 줄 금액을 초과하지 않아야 함

최종 검증을 위해 공식적인 검사 결과를 정리합니다.

---

## 판정: **rejected**

### 근거
- **규칙 5 위반**: 상품 쿠폰의 기준 금액이 줄 금액이 아님
  - 입력: `items=[{sku:"A", unitPrice:10000, qty:1}, {sku:"B", unitPrice:5000, qty:2}]`, `coupons=[{scope:"item", sku:"A", type:"rate", value:50}]`
  - 기대: discount=5,000 (상품 A의 줄 금액 10,000 × 50%)
  - 실제: discount=10,000 (subtotal 20,000 × 50%)

- **규칙 2 위반**: 정액 쿠폰이 줄 금액을 초과할 수 있음
  - 입력: `items=[{sku:"A", unitPrice:5000, qty:1}, {sku:"B", unitPrice:10000, qty:1}]`, `coupons=[{scope:"item", sku:"A", type:"fixed", value:8000}]`
  - 기대: discount=5,000 (min(8000, 줄금액 5000))
  - 실제: discount=8,000 (min(8000, subtotal 15000))

- **코드 문제**: 69번 줄의 `+ 0 * line.quantity`는 의미 없는 표현 (항상 0)

### 확인한 것
- 규칙 5: 상품 쿠폰의 기준 금액을 실제 입력으로 검증 → **위반 확인**
- 규칙 2: 정액 쿠폰의 상한 검증 → **위반 확인**
- 규칙 4: minOrder 조건 → ✓ 통과
- 규칙 8: 중복 쿠폰 검증 → ✓ 통과
- 규칙 9: 쿠폰 값 검증 → ✓ 통과
- 타입 검사: `pnpm check` → ✓ 통과 (단, 테스트 파일 미작성)
