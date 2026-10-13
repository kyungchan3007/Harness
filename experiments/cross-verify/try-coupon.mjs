// 검사자용 계산 도구 — 복사본 루트에 넣는다. node try-coupon.mjs '<상품 줄 JSON>' '<쿠폰 JSON>' ['<배송비 정책 JSON>']
// TypeScript 원본을 그대로 불러온다 (.js 가져오기를 .ts로 바꿔 찾음)
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
registerHooks({
  resolve(spec, ctx, next) {
    if (spec.endsWith(".js") && ctx.parentURL?.startsWith("file:")) {
      const ts = new URL(spec.replace(/\.js$/, ".ts"), ctx.parentURL);
      if (existsSync(fileURLToPath(ts))) return next(ts.href, ctx);
    }
    return next(spec, ctx);
  },
});
const { priceWithCoupons } = await import("./src/pricing/coupon.ts");
const [items, coupons, policy] = process.argv.slice(2).map((a) => JSON.parse(a));
try {
  console.log(JSON.stringify(policy === undefined ? priceWithCoupons(items, coupons) : priceWithCoupons(items, coupons, policy)));
} catch (e) {
  console.log(`오류: ${e?.constructor?.name}: ${e?.message}`);
}
