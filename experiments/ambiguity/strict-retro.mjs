// 0032 재채점 — node experiments/ambiguity/strict-retro.mjs
// "애매한 곳·가정" 칸이 있는 실행의 prd에 0032 엄격 규칙(업무 값 가정 금지·확인 필요 멈춤)을 돌린다.
// 판정(judgment.json)의 assumed 항목 flagQuote가 들어 있는 줄이 잡히는지(정답표 항목) + 정답표 밖 줄이 잡히는지(오탐 후보)를 센다. 새 모델 실행 없음.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assumptionSection, checkAssumptions } from "../../agents/harness/hooks/lib/records.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS = join(HERE, "runs");
const norm = (t) => t.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
/** 한 줄만 든 prd로 0032 규칙 판정 — 문제가 있으면 멈춤 */
const stops = (line) => checkAssumptions(`## 애매한 곳·가정\n- ${line}\n`, "0032").length > 0;

const runs = [];
for (const id of readdirSync(RUNS).sort()) {
  const dir = join(RUNS, id);
  if (!existsSync(join(dir, "prd.md")) || !existsSync(join(dir, "judgment.json"))) continue;
  const section = assumptionSection(readFileSync(join(dir, "prd.md"), "utf8"));
  if (section === undefined) continue;
  const lines = section.split("\n").filter((l) => /^- \S/.test(l)).map((l) => norm(l.slice(2)));
  const items = JSON.parse(readFileSync(join(dir, "judgment.json"), "utf8")).items;
  const matched = new Set();
  const keyItems = Object.entries(items).map(([key, v]) => {
    const quote = norm(v.flagQuote ?? "");
    const line = quote ? lines.find((l) => l.includes(quote) || quote.includes(l)) : undefined;
    if (line) matched.add(line);
    return { key, label: v.label, inPrd: Boolean(line), caught: line ? stops(line) : false };
  });
  const outside = lines.filter((l) => !matched.has(l)).map((l) => ({ line: l, caught: stops(l) }));
  runs.push({ id, keyItems, outside, stopped: lines.some(stops) });
}

const assumed = runs.flatMap((r) => r.keyItems.filter((i) => i.label === "assumed"));
const assumedInPrd = assumed.filter((i) => i.inPrd);
const silent = runs.flatMap((r) => r.keyItems.filter((i) => i.label === "silent"));
const outside = runs.flatMap((r) => r.outside);
const summary = {
  runs: runs.map((r) => r.id),
  stoppedRuns: runs.filter((r) => r.stopped).length,
  assumed: { total: assumed.length, inPrdSection: assumedInPrd.length, caught: assumedInPrd.filter((i) => i.caught).length },
  silent: silent.length,
  outside: { total: outside.length, caught: outside.filter((o) => o.caught).length, lines: outside },
  perRun: runs.map((r) => ({ id: r.id, stopped: r.stopped, items: r.keyItems.map((i) => `${i.key}:${i.label}${i.inPrd ? (i.caught ? "→멈춤" : "→통과") : ""}`).join(" ") })),
};
writeFileSync(join(RUNS, "strict-retro.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({ ...summary, outside: { ...summary.outside, lines: undefined } }, null, 2));
for (const o of outside) console.log(`${o.caught ? "멈춤" : "통과"} | ${o.line.slice(0, 80)}`);
