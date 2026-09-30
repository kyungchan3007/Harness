// 숨겨진 채점용 테스트 — 채점할 때만 복사본의 src/pricing/coupon.oracle.test.ts로 넣는다.
// 테스트 이름의 T번호가 함정 번호, (규칙 N)이 과제 문장(task.md)의 근거 규칙이다.
import { describe, expect, it } from "vitest";
import type { LineItem } from "../cart/cart.js";
import { CouponError, priceWithCoupons, type Coupon } from "./coupon.js";

const line = (sku: string, unitPrice: number, quantity = 1): LineItem => ({ sku, name: sku, unitPrice, quantity });
const order = (type: "rate" | "fixed", value: number, extra: Partial<Coupon> = {}): Coupon => ({ scope: "order", type, value, ...extra });
const item = (sku: string, type: "rate" | "fixed", value: number, extra: Partial<Coupon> = {}): Coupon => ({ scope: "item", sku, type, value, ...extra });

describe("쿠폰 채점", () => {
  it("T01 정률 원 미만 버림 (규칙 1)", () => {
    expect(priceWithCoupons([line("A", 10_001)], [order("rate", 10)]).discount).toBe(1_000);
  });

  it("T02 반올림이 아니라 버림 (규칙 1)", () => {
    expect(priceWithCoupons([line("A", 9_999)], [order("rate", 15)]).discount).toBe(1_499);
  });

  it("T03 상품 쿠폰은 줄 금액에 한 번 계산 (규칙 5)", () => {
    // 줄 금액 2,997 × 10% = 299.7 → 299 (개당 계산이면 99 × 3 = 297)
    expect(priceWithCoupons([line("A", 999, 3)], [item("A", "rate", 10)]).discount).toBe(299);
  });

  it("T04 상품 쿠폰은 대상 줄에만 (규칙 5)", () => {
    const r = priceWithCoupons([line("A", 10_000), line("B", 20_000)], [item("B", "rate", 10)]);
    expect(r.discount).toBe(2_000);
  });

  it("T05 정액은 기준 금액까지만 (규칙 2)", () => {
    const r = priceWithCoupons([line("A", 3_000), line("B", 10_000)], [item("A", "fixed", 5_000)]);
    expect(r.discount).toBe(3_000);
  });

  it("T06 할인 상한 (규칙 3)", () => {
    expect(priceWithCoupons([line("A", 100_000)], [order("rate", 50, { maxDiscount: 10_000 })]).discount).toBe(10_000);
  });

  it("T07 상한보다 적으면 그대로 (규칙 3)", () => {
    expect(priceWithCoupons([line("A", 100_000)], [order("rate", 5, { maxDiscount: 10_000 })]).discount).toBe(5_000);
  });

  it("T08 최소 주문 금액과 같으면 적용 (규칙 4)", () => {
    expect(priceWithCoupons([line("A", 30_000)], [order("fixed", 2_000, { minOrder: 30_000 })]).discount).toBe(2_000);
  });

  it("T09 최소 주문 금액에 1원 모자라면 오류 없이 미적용 (규칙 4)", () => {
    expect(priceWithCoupons([line("A", 29_999)], [order("fixed", 2_000, { minOrder: 30_000 })]).discount).toBe(0);
  });

  it("T10 최소 주문 금액은 할인 전 합계로 판단 (규칙 4)", () => {
    // 상품 쿠폰 후 25,000이지만 할인 전 30,000이라 주문 쿠폰도 적용
    const r = priceWithCoupons(
      [line("A", 10_000), line("B", 20_000)],
      [item("A", "fixed", 5_000), order("fixed", 2_000, { minOrder: 30_000 })],
    );
    expect(r.discount).toBe(7_000);
  });

  it("T11 주문 쿠폰 기준은 상품 쿠폰 적용 후 금액 (규칙 6)", () => {
    // (20,000 − 10,000) × 10% = 1,000 (할인 전 기준이면 2,000)
    const r = priceWithCoupons([line("A", 10_000), line("B", 10_000)], [item("A", "fixed", 10_000), order("rate", 10)]);
    expect(r.discount).toBe(11_000);
  });

  it("T12 목록 순서와 상관없이 상품 쿠폰 먼저 (규칙 7)", () => {
    const r = priceWithCoupons([line("A", 10_000), line("B", 10_000)], [order("rate", 10), item("A", "fixed", 10_000)]);
    expect(r.discount).toBe(11_000);
  });

  it("T13 무료배송은 할인 후 금액으로 (규칙 10)", () => {
    const r = priceWithCoupons([line("A", 52_000)], [order("fixed", 3_000)]);
    expect(r).toEqual({ subtotal: 52_000, discount: 3_000, shipping: 3_000, total: 52_000 });
  });

  it("T14 할인 후 정확히 50,000원이면 무료배송 (규칙 10)", () => {
    const r = priceWithCoupons([line("A", 53_000)], [order("fixed", 3_000)]);
    expect(r).toEqual({ subtotal: 53_000, discount: 3_000, shipping: 0, total: 50_000 });
  });

  it("T15 빈 장바구니는 쿠폰을 보지 않고 0 (규칙 11)", () => {
    const r = priceWithCoupons([], [order("rate", 10), item("X", "fixed", 1_000)]);
    expect(r).toEqual({ subtotal: 0, discount: 0, shipping: 0, total: 0 });
  });

  it("T16 같은 상품에 상품 쿠폰 2장은 오류 (규칙 8)", () => {
    expect(() => priceWithCoupons([line("A", 10_000)], [item("A", "fixed", 1_000), item("A", "rate", 10)])).toThrow(CouponError);
  });

  it("T17 주문 쿠폰 2장은 오류 (규칙 8)", () => {
    expect(() => priceWithCoupons([line("A", 10_000)], [order("fixed", 1_000), order("rate", 10)])).toThrow(CouponError);
  });

  it("T18 장바구니에 없는 상품의 쿠폰은 오류 (규칙 8)", () => {
    expect(() => priceWithCoupons([line("A", 10_000)], [item("Z", "fixed", 1_000)])).toThrow(CouponError);
  });

  it("T19 잘못된 쿠폰 값은 오류 (규칙 9)", () => {
    const cart = [line("A", 10_000)];
    for (const bad of [
      order("rate", 0),
      order("rate", 101),
      order("rate", 12.5),
      order("fixed", 0),
      order("fixed", -500),
      order("rate", 10, { maxDiscount: -1 }),
      order("fixed", 1_000, { minOrder: 0.5 }),
      { scope: "item", type: "fixed", value: 1_000 } as Coupon,
    ]) {
      expect(() => priceWithCoupons(cart, [bad]), JSON.stringify(bad)).toThrow(CouponError);
    }
  });

  it("T20 100% 할인이면 상품 금액 0, 배송비는 할인 후 기준 (규칙 1·10)", () => {
    const r = priceWithCoupons([line("A", 10_000)], [order("rate", 100)]);
    expect(r).toEqual({ subtotal: 10_000, discount: 10_000, shipping: 3_000, total: 3_000 });
  });

  it("T21 입력을 바꾸지 않음 (규칙 12)", () => {
    const items = [line("A", 10_000, 2)];
    const coupons = [order("rate", 10), item("A", "fixed", 1_000)];
    const before = JSON.stringify({ items, coupons });
    priceWithCoupons(items, coupons);
    expect(JSON.stringify({ items, coupons })).toBe(before);
  });
});
