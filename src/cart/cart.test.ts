import { describe, expect, it } from "vitest";
import { Cart, CartError, type LineItem } from "./cart.js";

const apple = (quantity = 1): LineItem => ({ sku: "APPLE", name: "사과", unitPrice: 1_000, quantity });

describe("Cart (domain.md 장바구니 규칙)", () => {
  it("규칙 1: 음수·소수 가격을 거부한다", () => {
    const cart = new Cart();
    expect(() => cart.add({ ...apple(), unitPrice: -1 })).toThrow(RangeError);
    expect(() => cart.add({ ...apple(), unitPrice: 10.5 })).toThrow(RangeError);
    expect(() => cart.add({ ...apple(), unitPrice: 0 })).not.toThrow();
  });

  it("규칙 2: 수량은 1~99 정수만 허용한다", () => {
    const cart = new Cart();
    expect(() => cart.add(apple(0))).toThrow(CartError);
    expect(() => cart.add(apple(100))).toThrow(CartError);
    expect(() => cart.add(apple(1.5))).toThrow(CartError);
    expect(() => cart.add(apple(99))).not.toThrow();
  });

  it("규칙 3: 같은 sku는 수량을 합치고, 99 초과면 거부하며 기존 수량을 유지한다", () => {
    const cart = new Cart();
    cart.add(apple(40));
    cart.add(apple(59));
    expect(cart.items()).toEqual([apple(99)]);

    expect(() => cart.add(apple(1))).toThrow(CartError);
    expect(cart.items()[0]?.quantity).toBe(99);
  });

  it("규칙 4: 수량을 0으로 바꿀 수 없다", () => {
    const cart = new Cart();
    cart.add(apple(3));
    expect(() => cart.setQuantity("APPLE", 0)).toThrow(CartError);
    cart.setQuantity("APPLE", 5);
    expect(cart.items()[0]?.quantity).toBe(5);
  });

  it("규칙 5: 없는 sku의 수량 변경은 거부하고, remove는 조용히 무시한다", () => {
    const cart = new Cart();
    expect(() => cart.setQuantity("NONE", 1)).toThrow(CartError);
    expect(() => cart.remove("NONE")).not.toThrow();
  });

  it("items()는 복사본이라 외부 수정이 장바구니에 영향을 주지 않는다", () => {
    const cart = new Cart();
    cart.add(apple(1));
    const [line] = cart.items();
    if (line) line.quantity = 50;
    expect(cart.items()[0]?.quantity).toBe(1);
  });
});
