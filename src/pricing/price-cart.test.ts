import { describe, expect, it } from "vitest";
import type { LineItem } from "../cart/cart.js";
import { priceCart } from "./price-cart.js";

const line = (unitPrice: number, quantity = 1): LineItem => ({ sku: `SKU-${unitPrice}`, name: "상품", unitPrice, quantity });

describe("priceCart (domain.md 배송비 규칙)", () => {
  it("상품 합계는 단가 × 수량의 합이다", () => {
    expect(priceCart([line(1_000, 3), line(2_500, 2)]).subtotal).toBe(8_000);
  });

  it("규칙 1: 50,000원 미만이면 배송비 3,000원", () => {
    expect(priceCart([line(49_999)])).toEqual({ subtotal: 49_999, discount: 0, shipping: 3_000, total: 52_999 });
  });

  it("규칙 2: 50,000원 이상이면 무료 (경계값 포함)", () => {
    expect(priceCart([line(50_000)])).toEqual({ subtotal: 50_000, discount: 0, shipping: 0, total: 50_000 });
  });

  it("규칙 2: 무료배송 기준은 할인 후 금액이다", () => {
    expect(priceCart([line(52_000)], { discount: 2_001 })).toEqual({
      subtotal: 52_000,
      discount: 2_001,
      shipping: 3_000,
      total: 52_999,
    });
    expect(priceCart([line(52_000)], { discount: 2_000 }).shipping).toBe(0);
  });

  it("규칙 3: 빈 장바구니는 배송비·결제 금액 모두 0원", () => {
    expect(priceCart([])).toEqual({ subtotal: 0, discount: 0, shipping: 0, total: 0 });
  });

  it("할인은 0 이상의 정수이고 상품 합계를 넘을 수 없다", () => {
    expect(() => priceCart([line(1_000)], { discount: -1 })).toThrow(RangeError);
    expect(() => priceCart([line(1_000)], { discount: 0.5 })).toThrow(RangeError);
    expect(() => priceCart([line(1_000)], { discount: 1_001 })).toThrow(RangeError);
  });

  it("배송 정책을 주입할 수 있다", () => {
    expect(priceCart([line(10_000)], { shippingPolicy: { fee: 2_500, freeThreshold: 10_000 } }).shipping).toBe(0);
  });
});
