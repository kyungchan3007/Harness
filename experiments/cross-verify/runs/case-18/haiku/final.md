이제 명확한 결론을 낼 수 있습니다. 규칙 8의 명백한 위반을 확인했습니다.

---

## 판정

**판정: rejected**

### 근거

1. **규칙 8 위반** — 장바구니에 없는 상품의 상품 쿠폰
   - 입력: `items=[{sku:"A",...}]`, `coupons=[{scope:"item",sku:"B",type:"rate",value:10}]`
   - 기대: `CouponError` 발생
   - 실제: `TypeError: Cannot read properties of undefined (reading 'unitPrice')` 발생
   - 원인: 59줄의 `continue`로 인해 validation을 skip하고, 66-70줄의 계산 루프에서 `items.find()`가 undefined를 반환함

2. **규칙 8 추가 위반** — 같은 sku 쿠폰 중복 체크 실패 (모두 skip되는 경우)
   - 입력: `items=[{sku:"A",...}]`, `coupons=[{scope:"item",sku:"B",type:"rate",value:10},{scope:"item",sku:"B",type:"rate",value:20}]`
   - 기대: 중복 감지 후 `CouponError` 발생
   - 실제: `TypeError` 발생 (중복 체크가 작동하지 않음)
   - 원인: 첫 번째 쿠폰이 skip되어 `seen`에 추가되지 않으므로, 두 번째 쿠폰에서도 `seen.has(sku)`가 false 반환

### 확인한 것

- **규칙 1** (정률 할인 계산): ✓ `1000 × 33 / 100 = 330`, 원 미만 버림 확인
- **규칙 2** (정액 상한): ✓ 기준금액 초과 방지 (`Math.min` 사용)
- **규칙 3** (maxDiscount): ✓ `100000 × 50% = 50000` 요청 시 10000으로 제한
- **규칙 4** (minOrder): ✓ 조건 미충족 시 할인 0원
- **규칙 5** (상품 쿠폰 기준금액): ✓ `unitPrice × quantity` 줄 금액 사용
- **규칙 6** (주문 쿠폰 기준금액): ✓ `subtotal - itemDiscount` 사용
- **규칙 7** (적용 순서): ✓ 상품 쿠폰 후 주문 쿠폰 처리
- **규칙 8-1** (상품 쿠폰 1장): ✓ 정상 케이스에서 중복 감지
- **규칙 8-2** (주문 쿠폰 1장): ✓ 2개 이상 시 정확히 에러
- **규칙 8-3** (장바구니 없는 상품): **✗ TypeError 발생 (CouponError 필요)**
- **규칙 9** (유효성 검사): ✓ 정률/정액/maxDiscount/minOrder 모두 검증
- **규칙 11** (빈 장바구니): ✓ 모든 금액 0
- **규칙 12** (원본 수정 안 함): ✓ readonly 사용, 원본 배열 미수정
