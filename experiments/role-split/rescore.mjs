// 지난 실행의 최종 코드를 지금 채점표로 다시 채점 — node experiments/role-split/rescore.mjs [--out 파일명]
// 원래 result.json(실행 당시 채점)은 건드리지 않고, runs/<파일명>에 따로 남긴다 (0023)
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { EXPERIMENT_DIR, IMPL_PATH, prepareCopy, scoreCopy, trapIds } from "./lib.mjs";

const RUNS = join(EXPERIMENT_DIR, "runs");

export function rescoreAll({ log = console.log } = {}) {
  const ids = readdirSync(RUNS).filter((id) => existsSync(join(RUNS, id, "coupon.ts.txt"))).sort();
  const { dir } = prepareCopy();
  const results = {};
  try {
    for (const id of ids) {
      writeFileSync(join(dir, IMPL_PATH), readFileSync(join(RUNS, id, "coupon.ts.txt"), "utf8"));
      const s = scoreCopy(dir);
      const before = JSON.parse(readFileSync(join(RUNS, id, "result.json"), "utf8")).score;
      results[id] = { before: `${before.passed}/${before.total}`, after: `${s.passed}/${s.total}`, failed: s.failed, newFailures: s.failed.filter((t) => !before.failed.includes(t)) };
      log(`  ${id}: ${results[id].before} → ${results[id].after}${results[id].newFailures.length ? `  (새로 실패: ${results[id].newFailures.join(" ")})` : ""}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return { traps: trapIds().length, results };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outAt = process.argv.indexOf("--out");
  const out = outAt >= 0 ? process.argv[outAt + 1] : "rescore-0023.json";
  const r = rescoreAll();
  writeFileSync(join(RUNS, out), JSON.stringify({ date: new Date().toISOString().slice(0, 10), ...r }, null, 2) + "\n");
  console.log(`  → runs/${out}`);
}
