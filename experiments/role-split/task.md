# 과제 — 쿠폰 적용

장바구니에 쿠폰을 적용해 최종 금액을 계산하는 기능을 추가해 주세요.
기존 장바구니·배송비 규칙은 `agents/context/domain.md`를 따릅니다.

## 만들 것

`src/pricing/coupon.ts`에 아래 모양 그대로 만들어 주세요. 이름·타입을 바꾸지 마세요.

```ts
import type { LineItem } from "../cart/cart.js";
import type { Won } from "../money.js";
import type { PriceBreakdown, ShippingPolicy } from "./price-cart.js";

export interface Coupon {
  /** item: 한 상품 줄에 적용 / order: 주문 전체에 적용 */
  scope: "item" | "order";
  /** scope가 "item"일 때 대상 상품 (필수) */
  sku?: string;
  /** rate: 정률(%) / fixed: 정액(원) */
  type: "rate" | "fixed";
  /** rate면 할인율(%), fixed면 할인 금액(원) */
  value: number;
  /** 할인 금액의 상한 (원) */
  maxDiscount?: Won;
  /** 사용 조건: 최소 주문 금액 (원) */
  minOrder?: Won;
}

export class CouponError extends Error {}

export function priceWithCoupons(
  items: readonly LineItem[],
  coupons: readonly Coupon[],
  shippingPolicy?: ShippingPolicy,
): PriceBreakdown;
```

`shippingPolicy`를 주지 않으면 기본 배송비 정책(`DEFAULT_SHIPPING_POLICY`)을 씁니다.

## 규칙

1. **정률 쿠폰**의 할인 금액은 `기준 금액 × value / 100`이고, **원 미만은 버립니다.**
2. **정액 쿠폰**의 할인 금액은 `value`원이지만, 기준 금액보다 클 수 없습니다(기준 금액까지만 할인).
3. `maxDiscount`가 있으면 그 쿠폰의 할인 금액은 `maxDiscount`를 넘지 않습니다.
4. `minOrder`가 있으면 **할인 전 상품 합계**(`subtotal`)가 `minOrder` **이상**일 때만 그 쿠폰을 적용합니다. 조건에 못 미치면 오류가 아니라 그 쿠폰만 적용하지 않습니다(할인 0원).
5. **상품 쿠폰**의 기준 금액은 대상 상품 줄의 금액(`unitPrice × quantity`)입니다. 개당이 아니라 **줄 금액에 한 번** 계산합니다.
6. **주문 쿠폰**의 기준 금액은 `상품 합계 − 상품 쿠폰 할인 합계`입니다.
7. 적용 순서는 목록 순서와 상관없이 **상품 쿠폰을 모두 적용한 뒤 주문 쿠폰**을 적용합니다.
8. 상품 쿠폰은 **상품(sku)당 1장**, 주문 쿠폰은 **1장**까지만 쓸 수 있습니다. 넘으면 `CouponError`를 던집니다. 장바구니에 없는 상품의 상품 쿠폰도 `CouponError`입니다.
9. 잘못된 쿠폰은 `CouponError`를 던집니다: 정률 `value`가 1~100의 정수가 아님, 정액 `value`가 1 이상의 정수가 아님, `maxDiscount`·`minOrder`가 0 이상의 정수가 아님, 상품 쿠폰에 `sku`가 없음.
10. 결과의 `discount`는 상품 쿠폰과 주문 쿠폰 할인 금액의 합입니다. 배송비와 결제 금액은 기존 배송비 규칙대로 **모든 할인 후 금액**으로 정합니다.
11. 장바구니가 비어 있으면 쿠폰을 보지 않고 모든 금액 0을 돌려줍니다.
12. 넘겨받은 `items`·`coupons`를 바꾸지 않습니다.

## 완료 조건

- 위 규칙을 모두 지키는 구현과 테스트
- `pnpm check` ALL PASS
