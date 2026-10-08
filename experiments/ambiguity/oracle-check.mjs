// 숨겨진 테스트 자체 검증(0030) — node experiments/ambiguity/oracle-check.mjs [uncommon]
// 정답 의도대로 쓴 기준 구현은 전부 통과, 애매한 곳 하나씩만 틀린 구현은 그 테스트에서 떨어져야 한다 (0015 채점표 검증과 같은 방식)
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareCopy, REPO_ROOT } from "../role-split/lib.mjs";
import { summarizeOracle } from "./intent-lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const variant = process.argv[2] ?? "uncommon";
const ORACLE = join(HERE, "oracle", `points-${variant}.oracle.ts`);
const TITLES = [...readFileSync(ORACLE, "utf8").matchAll(/it\("([^"]+)"/g)].map((m) => m[1]);

// earn 하나로 쓴 기준 구현과, 한 곳씩 틀린 구현 — 바꾼 조각만 다르다
const make = ({ base = "b.subtotal", round = "Math.round", coupon = "0", vip = "3", vipCoupon = "rate" } = {}) => `import type { PriceBreakdown } from "./price-cart.js";
export function earn(b: PriceBreakdown, m: { grade: "VIP" | "NORMAL" }): number {
  const vip = m.grade === "VIP", coupon = b.discount > 0;
  const rate = vip ? ${vip} : 1;
  const finalRate = coupon ? (vip ? ${vipCoupon} : ${coupon}) : rate;
  return ${round}((${base}) * finalRate / 100);
}
`;
export const MUTANTS = {
  "기준 구현": [make(), []],
  "배송비 포함 total": [make({ base: "b.total" }), ["T1", "T5"]], // total = 할인 후 + 배송비라 T5(할인 전 기준)에서도 떨어짐
  "내림": [make({ round: "Math.floor" }), ["T2"]],
  "쿠폰 주문 절반": [make({ coupon: "0.5" }), ["T3"]],
  "VIP 2배": [make({ vip: "2" }), ["T4", "T5"]],
  "VIP도 쿠폰이면 0": [make({ vipCoupon: "0" }), ["T5"]],
  "할인 후 금액 기준": [make({ base: "b.subtotal - b.discount" }), ["T5"]],
};

const { dir } = prepareCopy({ install: false });
symlinkSync(join(REPO_ROOT, "node_modules"), join(dir, "node_modules"));
let ok = true;
try {
  cpSync(ORACLE, join(dir, "src/pricing/points.oracle.test.ts"));
  for (const [name, [code, expectFail]] of Object.entries(MUTANTS)) {
    writeFileSync(join(dir, "src/pricing/points.adapter.ts"), code);
    const out = join(dir, ".o.json");
    spawnSync("pnpm", ["exec", "vitest", "run", "src/pricing/points.oracle.test.ts", "--reporter=json", `--outputFile=${out}`], { cwd: dir });
    const s = summarizeOracle(existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : null, TITLES);
    const failed = TITLES.map((t) => t.split(" ")[0]).filter((t) => !s.passed.includes(t));
    const good = JSON.stringify(failed) === JSON.stringify(expectFail);
    ok &&= good;
    console.log(`${good ? "✅" : "❌"} ${name}: 실패 ${failed.join(",") || "없음"} (기대 ${expectFail.join(",") || "없음"})`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
process.exit(ok ? 0 : 1);
