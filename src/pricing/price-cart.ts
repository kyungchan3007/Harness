import type { LineItem } from "../cart/cart.js";
import { assertWon, type Won } from "../money.js";

export interface ShippingPolicy {
  fee: Won;
  /** 할인 후 상품 금액이 이 값 이상이면 무료 */
  freeThreshold: Won;
}

export const DEFAULT_SHIPPING_POLICY: ShippingPolicy = { fee: 3_000, freeThreshold: 50_000 };

export interface PriceBreakdown {
  subtotal: Won;
  discount: Won;
  shipping: Won;
  total: Won;
}

export interface PriceOptions {
  /** 상품 합계에서 뺄 할인 금액 (쿠폰 계산은 0003에서 이 값을 만든다) */
  discount?: Won;
  shippingPolicy?: ShippingPolicy;
}

export function priceCart(items: readonly LineItem[], options: PriceOptions = {}): PriceBreakdown {
  const { discount = 0, shippingPolicy = DEFAULT_SHIPPING_POLICY } = options;

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  assertWon(subtotal, "subtotal");
  assertWon(discount, "discount");
  if (discount > subtotal) {
    throw new RangeError(`할인(${discount})이 상품 합계(${subtotal})보다 클 수 없습니다`);
  }

  if (items.length === 0) return { subtotal: 0, discount: 0, shipping: 0, total: 0 };

  const discounted = subtotal - discount;
  const shipping = discounted >= shippingPolicy.freeThreshold ? 0 : shippingPolicy.fee;

  return { subtotal, discount, shipping, total: discounted + shipping };
}
