// 숨겨진 채점용 테스트(0030) — 흔하지 않은 정답 의도(intent-uncommon.json)대로. 채점할 때만 복사본 src/pricing/points.oracle.test.ts로 넣는다.
// 0027 테스트와 같은 연결 파일(points.adapter.ts)을 거쳐 부른다. 테스트 이름의 (M번호)가 확인하는 애매한 곳.
import { describe, expect, it } from "vitest";
import type { PriceBreakdown } from "./price-cart.js";
import { earn } from "./points.adapter.js";

const bd = (subtotal: number, discount: number, shipping: number): PriceBreakdown => ({ subtotal, discount, shipping, total: subtotal - discount + shipping });
const NORMAL = { grade: "NORMAL" as const };
const VIP = { grade: "VIP" as const };

describe("포인트 채점 (흔하지 않은 의도)", () => {
  it("T1 기준 금액은 배송비 제외 (M1)", () => {
    // 30,000 × 1% = 300 (배송비 포함 33,000이면 330)
    expect(earn(bd(30_000, 0, 3_000), NORMAL)).toBe(300);
  });

  it("T2 1포인트 미만은 반올림 (M2)", () => {
    // 50,050 × 1% = 500.5 → 501 (내림이면 500). 무료배송이라 M1 영향 없음
    expect(earn(bd(50_050, 0, 0), NORMAL)).toBe(501);
  });

  it("T3 쿠폰 주문은 적립 없음 (M3·M4)", () => {
    expect(earn(bd(60_000, 10_000, 0), NORMAL)).toBe(0);
  });

  it("T4 VIP는 3배 (M5·M6)", () => {
    // 60,000 × 3% = 1,800
    expect(earn(bd(60_000, 0, 0), VIP)).toBe(1_800);
  });

  it("T5 VIP는 쿠폰이어도 3% 그대로, 기준은 할인 전 (M7·M1)", () => {
    // 할인 전 60,000 × 3% = 1,800 (할인 후 50,000이면 1,500)
    expect(earn(bd(60_000, 10_000, 0), VIP)).toBe(1_800);
  });
});
