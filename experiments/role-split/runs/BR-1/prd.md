# 0030 — 쿠폰 적용 — PRD

- **이슈:** #1
- **문제:** 장바구니에 쿠폰을 적용할 수 없어서 할인 기능이 없다.
- **목표:** 정률·정액 쿠폰을 상품·주문 범위에 적용하고, 중복 제한과 유효성을 검증하는 기능을 추가한다. 규칙은 [domain.md](../../context/domain.md)의 쿠폰 규칙(0030)을 따른다.
- **비목표:** 쿠폰 데이터베이스, HTTP API, 기존 장바구니·배송비 규칙 변경.

## Acceptance

### 규칙 1-3: 할인액 계산
- [x] 정률 쿠폰은 기준금액 × value / 100이고 원 미만은 버린다 (예: 1000원 50% = 500원, 1001원 50% = 500원)
- [x] 정액 쿠폰은 value원이지만 기준금액을 초과하지 않는다 (예: 기준금액 1000원에 2000원 쿠폰 → 1000원 할인)
- [x] maxDiscount가 있으면 그 쿠폰의 할인금액은 maxDiscount를 넘지 않는다

### 규칙 4: minOrder 조건
- [x] minOrder가 있으면 할인 전 상품합계가 minOrder 이상일 때만 적용하고, 미충족 시 오류 아님 (할인 0원)

### 규칙 5: 상품 쿠폰 기준금액
- [x] 상품 쿠폰의 기준금액은 대상 상품 줄의 금액(unitPrice × quantity)이다

### 규칙 6: 주문 쿠폰 기준금액
- [x] 주문 쿠폰의 기준금액은 상품합계 − 상품쿠폰할인합계이다

### 규칙 7: 적용 순서
- [x] 상품 쿠폰을 모두 적용한 뒤 주문 쿠폰을 적용한다

### 규칙 8: 중복 제한
- [x] 상품(sku)당 상품 쿠폰 1장, 주문 쿠폰 1장까지만 쓸 수 있다 (초과 시 CouponError)
- [x] 장바구니에 없는 상품의 상품 쿠폰도 CouponError이다

### 규칙 9: 유효성 검증
- [x] 정률 value가 1~100의 정수가 아니면 CouponError
- [x] 정액 value가 1 이상의 정수가 아니면 CouponError
- [x] maxDiscount·minOrder가 0 이상의 정수가 아니면 CouponError
- [x] 상품 쿠폰(scope="item")에 sku가 없으면 CouponError

### 규칙 10: discount 결과
- [x] 결과의 discount는 상품 쿠폰과 주문 쿠폰 할인금액의 합이다
- [x] 배송비와 결제금액은 모든 할인 후 금액(subtotal - discount)을 기준으로 정한다 (domain.md 배송비 규칙 따름)

### 규칙 11: 빈 장바구니
- [x] 장바구니가 비어 있으면 쿠폰을 무시하고 모든 금액(subtotal, discount, shipping, total)이 0이다

### 규칙 12: 입력 불변성
- [x] 함수가 items·coupons 배열을 수정하지 않는다 (readonly 명시, 테스트로 확인)

## 규칙 출처

`agents/context/domain.md` 쿠폰 규칙(0030), `agents/intent/specs/0030-coupons/request.md` (이슈 #1 본문)

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
