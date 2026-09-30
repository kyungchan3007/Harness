// 정답 구현 — 채점용 테스트 자체 검증에만 쓴다. 복사본에는 들어가지 않는다.
import type { LineItem } from "../cart/cart.js";
import type { Won } from "../money.js";
import { DEFAULT_SHIPPING_POLICY, priceCart, type PriceBreakdown, type ShippingPolicy } from "./price-cart.js";

export interface Coupon {
  scope: "item" | "order";
  sku?: string;
  type: "rate" | "fixed";
  value: number;
  maxDiscount?: Won;
  minOrder?: Won;
}

export class CouponError extends Error {}

const isNonNegInt = (n: unknown): boolean => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;

function validate(coupon: Coupon): void {
  const { type, value } = coupon;
  if (type === "rate" && !(Number.isInteger(value) && value >= 1 && value <= 100)) {
    throw new CouponError(`정률 쿠폰 할인율은 1~100 정수여야 합니다: ${value}`);
  }
  if (type === "fixed" && !(Number.isSafeInteger(value) && value >= 1)) {
    throw new CouponError(`정액 쿠폰 금액은 1 이상 정수여야 합니다: ${value}`);
  }
  if (coupon.maxDiscount !== undefined && !isNonNegInt(coupon.maxDiscount)) {
    throw new CouponError(`maxDiscount는 0 이상 정수여야 합니다: ${coupon.maxDiscount}`);
  }
  if (coupon.minOrder !== undefined && !isNonNegInt(coupon.minOrder)) {
    throw new CouponError(`minOrder는 0 이상 정수여야 합니다: ${coupon.minOrder}`);
  }
  if (coupon.scope === "item" && !coupon.sku) {
    throw new CouponError("상품 쿠폰에는 sku가 필요합니다");
  }
}

function discountOf(coupon: Coupon, base: Won, subtotal: Won): Won {
  if (coupon.minOrder !== undefined && subtotal < coupon.minOrder) return 0;
  let amount = coupon.type === "rate" ? Math.floor((base * coupon.value) / 100) : Math.min(coupon.value, base);
  if (coupon.maxDiscount !== undefined) amount = Math.min(amount, coupon.maxDiscount);
  return amount;
}

export function priceWithCoupons(
  items: readonly LineItem[],
  coupons: readonly Coupon[],
  shippingPolicy: ShippingPolicy = DEFAULT_SHIPPING_POLICY,
): PriceBreakdown {
  if (items.length === 0) return priceCart(items, { shippingPolicy });

  coupons.forEach(validate);
  const itemCoupons = coupons.filter((c) => c.scope === "item");
  const orderCoupons = coupons.filter((c) => c.scope === "order");

  const seen = new Set<string>();
  for (const c of itemCoupons) {
    const sku = c.sku as string;
    if (seen.has(sku)) throw new CouponError(`상품 쿠폰은 상품당 1장입니다: ${sku}`);
    if (!items.some((i) => i.sku === sku)) throw new CouponError(`장바구니에 없는 상품입니다: ${sku}`);
    seen.add(sku);
  }
  if (orderCoupons.length > 1) throw new CouponError("주문 쿠폰은 1장까지입니다");

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  let itemDiscount = 0;
  for (const c of itemCoupons) {
    const line = items.find((i) => i.sku === c.sku) as LineItem;
    itemDiscount += discountOf(c, line.unitPrice * line.quantity, subtotal);
  }

  const orderBase = subtotal - itemDiscount;
  const orderDiscount = orderCoupons.reduce((sum, c) => sum + discountOf(c, orderBase, subtotal), 0);

  return priceCart(items, { discount: itemDiscount + orderDiscount, shippingPolicy });
}
