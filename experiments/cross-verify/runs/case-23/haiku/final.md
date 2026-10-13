판정을 작성합니다.

---

판정: **rejected**

### 근거

- **규칙 12 위반**: 51번 줄 `(coupons as Coupon[]).sort(...)`가 입력 배열을 수정합니다. 함수 서명에서 `coupons: readonly Coupon[]`으로 선언했지만, `as Coupon[]`로 타입 캐스팅하여 `sort()` 메서드를 호출하면 런타임에 배열이 in-place로 정렬되어 원본 입력이 변경됩니다. 규칙에서 명시한 "넘겨받은 `items`·`coupons`를 바꾸지 않습니다"에 위반됩니다.

### 확인한 것

- **규칙 1 (정률 할인, 원 미만 버림)**: `Math.floor((base * coupon.value) / 100)` ✓  
  입력: 20000 × 10% → 출력: 2000 (올바름)

- **규칙 2 (정액 쿠폰 상한)**: `Math.min(coupon.value, base)` ✓  
  입력: 기준금액 1000, 정액 5000 → 출력: 1000 (올바름)

- **규칙 3 (maxDiscount 제한)**: 기준 4000, maxDiscount 3000 → 출력: 3000 ✓

- **규칙 4 (minOrder 조건)**: 상품 합계 10000 < minOrder 50000 → 할인 0, 오류 없음 ✓

- **규칙 7 (적용 순서)**: 상품 쿠폰 7000 + 주문 쿠폰 3300 = 10300 ✓

- **규칙 8 (중복 검증)**: 같은 SKU 쿠폰 2개 → CouponError, 주문 쿠폰 2개 → CouponError ✓

- **규칙 9 (쿠폰 검증)**: 정률 0%/101% → CouponError, 정액 0원 → CouponError ✓

- **규칙 11 (빈 장바구니)**: 빈 배열 → 모두 0 ✓

- **타입 체크**: `pnpm check` ALL PASS ✓

- **코드 분석**: 51번 줄 `(coupons as Coupon[]).sort(...)` 명확한 배열 수정 ❌
