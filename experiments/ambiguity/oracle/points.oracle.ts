// 숨겨진 채점용 테스트(0027) — 요청자의 진짜 의도(intent.json)대로. 채점할 때만 복사본 src/pricing/points.oracle.test.ts로 넣는다.
// 구현마다 함수 모양이 달라서, 채점 AI가 쓴 "연결 파일"(points.adapter.ts, 값 전달만·계산 금지)을 거쳐 부른다.
// 테스트 이름의 T번호 뒤 (M번호)가 확인하는 애매한 곳이다. 다른 항목이 결과를 바꾸지 않게 입력을 골랐다.
import { describe, expect, it } from "vitest";
import type { PriceBreakdown } from "./price-cart.js";
import { earn } from "./points.adapter.js";

const bd = (subtotal: number, discount: number, shipping: number): PriceBreakdown => ({ subtotal, discount, shipping, total: subtotal - discount + shipping });
const NORMAL = { grade: "NORMAL" as const };
const VIP = { grade: "VIP" as const };

describe("포인트 채점", () => {
  it("T1 기준 금액은 배송비 제외 (M1)", () => {
    // 30,000 × 1% = 300 (배송비 포함 33,000이면 330)
    expect(earn(bd(30_000, 0, 3_000), NORMAL)).toBe(300);
  });

  it("T2 1포인트 미만은 내림 (M2)", () => {
    // 50,099 × 1% = 500.99 → 500 (반올림·올림이면 501). 무료배송이라 M1 영향 없음
    expect(earn(bd(50_099, 0, 0), NORMAL)).toBe(500);
  });

  it("T3 쿠폰 주문은 절반 (M3·M4)", () => {
    // 할인 후 50,000 × 0.5% = 250
    expect(earn(bd(60_000, 10_000, 0), NORMAL)).toBe(250);
  });

  it("T4 VIP는 2배 (M5·M6)", () => {
    // 60,000 × 2% = 1,200
    expect(earn(bd(60_000, 0, 0), VIP)).toBe(1_200);
  });

  it("T5 VIP + 쿠폰은 2배의 절반 (M7)", () => {
    // 할인 후 50,000 × 1% = 500
    expect(earn(bd(60_000, 10_000, 0), VIP)).toBe(500);
  });
});
