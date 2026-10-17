// 묶음 실행(0038) — node experiments/ontology-large/batch.mjs --phase pilot --from 1 --to 2 [--seed 38]
// 묶음 = 한 모델의 A·BI·CI 셋을 동시에 → 셋 다 끝나면 다음 묶음. 반복마다 모델 순서를 시드로 섞고 runs/<phase>/order.json에 남긴다
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HERE } from "./lib.mjs";
import { CONDS, MODELS } from "./run.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const phase = arg("phase", "pilot"), from = Number(arg("from", 1)), to = Number(arg("to", 2)), seed = Number(arg("seed", 38));
let s = seed;
const rnd = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const base = join(HERE, "runs", phase);
mkdirSync(base, { recursive: true });
const orderFile = join(base, "order.json");
const order = existsSync(orderFile) ? JSON.parse(readFileSync(orderFile, "utf8")) : { seed, batches: [] };
const log = (msg) => { console.log(msg); appendFileSync(join(base, "batch.log"), `${new Date().toISOString()} ${msg}\n`); };

const runOne = (model, cond, n) => new Promise((resolve) => {
  if (existsSync(join(base, `${model}-${cond}-${n}`, "result.json"))) return resolve(`${model}-${cond}-${n}: 이미 있음`);
  const p = spawn("node", [join(HERE, "run.mjs"), "--model", model, "--cond", cond, "--n", String(n), "--phase", phase], { stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  p.stdout.on("data", (d) => (out += d));
  p.stderr.on("data", (d) => (out += d));
  p.on("close", (code) => resolve(`${code === 0 ? "" : `❌ 종료 ${code} `}${out.trim().split("\n").slice(-3).join(" / ")}`));
});

for (let n = from; n <= to; n++) {
  const models = Object.keys(MODELS);
  if (rnd() < 0.5) models.reverse();
  order.batches.push({ n, models });
  writeFileSync(orderFile, JSON.stringify(order, null, 2) + "\n");
  for (const model of models) {
    log(`▶ ${phase} ${n}회차 ${model}: ${CONDS.join("·")} 동시 시작`);
    const lines = await Promise.all(CONDS.map((c) => runOne(model, c, n)));
    for (const l of lines) log(`  ${l}`);
  }
}
log("■ 끝");
