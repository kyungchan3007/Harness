// 복사본 채점 — node experiments/role-split/score.mjs <복사본 폴더> [--out 결과.json]
import { writeFileSync } from "node:fs";
import { scoreCopy } from "./lib.mjs";

const args = process.argv.slice(2);
const outAt = args.indexOf("--out");
const out = outAt >= 0 ? args.splice(outAt, 2)[1] : null;
if (!args[0]) {
  console.error("사용법: node experiments/role-split/score.mjs <복사본 폴더> [--out 결과.json]");
  process.exit(2);
}

const result = scoreCopy(args[0]);
if (out) writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
console.log(`🎯 ${result.passed}/${result.total}${result.implemented ? "" : " (구현 파일 없음)"}`);
if (result.failed.length > 0) console.log(`   실패: ${result.failed.join(" ")}`);
