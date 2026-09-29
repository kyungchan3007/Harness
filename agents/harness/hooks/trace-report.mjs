#!/usr/bin/env node
// 사용법: pnpm trace 0008   → 해당 태스크의 trace.auto.jsonl을 표로 요약한다.
import { existsSync, readdirSync, readFileSync } from "node:fs";

const id = process.argv[2];
const specsDir = "agents/intent/specs";
const folder = id && readdirSync(specsDir).find((name) => name.startsWith(`${id}-`));
const file = folder && `${specsDir}/${folder}/trace.auto.jsonl`;
if (!file || !existsSync(file)) {
  console.error(`자동 기록이 없습니다: ${id ?? "(태스크 번호 필요)"}`);
  process.exit(1);
}

const entries = readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
const byTool = {};
for (const e of entries.filter((e) => e.tool)) {
  byTool[e.tool] ??= { ok: 0, fail: 0 };
  byTool[e.tool][e.ok ? "ok" : "fail"]++;
}

console.log(`# ${folder} — 자동 기록 ${entries.length}건, 세션 ${new Set(entries.map((e) => e.session)).size}개\n`);
console.log("| 도구 | 성공 | 실패 |\n| --- | --- | --- |");
for (const [tool, c] of Object.entries(byTool)) console.log(`| ${tool} | ${c.ok} | ${c.fail} |`);
console.log("\n| 시각 | 이벤트 | 도구 | 내용 |\n| --- | --- | --- | --- |");
for (const e of entries) {
  const detail = [e.blocked && "🛑 차단", e.detail, e.error && `❌ ${e.error}`].filter(Boolean).join(" ").replaceAll("|", "\\|");
  console.log(`| ${e.ts.slice(11, 19)} | ${e.event} | ${e.tool ?? ""} | ${detail} |`);
}
