// 온톨로지 실험(0037) 집계 — node experiments/ontology/summary.mjs [--phase pilot|main] → runs/<phase>/summary.json + 표
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HERE } from "./lib.mjs";

const mean = (xs) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);

export function aggregate(rows) {
  const out = {};
  for (const cond of ["A", "B", "C", "BI", "CI"]) {
    const rs = rows.filter((r) => r.cond === cond);
    if (!rs.length) continue;
    const groups = {};
    for (const r of rs) for (const [g, v] of Object.entries(r.hidden.groups ?? {})) (groups[g] ??= []).push(v.passed / v.total);
    const pairs = {};
    for (const r of rs) for (const [id, p] of Object.entries(r.judge?.pairs ?? {})) (pairs[p.label] ??= 0, pairs[p.label]++);
    out[cond] = {
      runs: rs.length,
      implemented: rs.filter((r) => r.implemented).length,
      hiddenPassed: rs.map((r) => r.hidden.passed),
      hiddenTotal: rs[0].hidden.total,
      groupWeighted: mean(rs.map((r) => r.hidden.groupWeighted)),
      allPass: rs.filter((r) => r.hidden.passed === r.hidden.total).length,
      basic: mean(rs.map((r) => (r.hidden.basic ?? 0) * 100)),
      combo: mean(rs.map((r) => (r.hidden.combo ?? 0) * 100)),
      groups: Object.fromEntries(Object.entries(groups).sort().map(([g, xs]) => [g, mean(xs.map((x) => x * 100))])),
      diff: rs.map((r) => r.diff?.passed ?? null),
      diffMean: mean(rs.map((r) => r.diff?.passed ?? 0)),
      ontoReads: rs.map((r) => r.ontoReads ?? null),
      invariantsPassed: rs.filter((r) => r.invariants.passed).length,
      asked: rs.map((r) => r.asked),
      assumptions: rs.map((r) => r.judge?.assumptions?.total ?? null),
      confusion: pairs,
      costUsd: mean(rs.map((r) => r.costUsd)),
      minutes: mean(rs.map((r) => r.minutes)),
      turns: mean(rs.map((r) => r.turns)),
      gatePassed: rs.filter((r) => r.gatePassed).length,
      stopBlocks: rs.map((r) => r.stopBlocks),
      endedBlocked: rs.filter((r) => r.endedBlocked).length,
      budgetHit: rs.filter((r) => r.budgetHit).length,
      apiError: rs.filter((r) => r.apiError).length,
      tamper: rs.filter((r) => r.tamper.length).map((r) => `${r.id}: ${r.tamper.join(",")}`),
      outside: rs.filter((r) => r.outsideAccess.length).map((r) => r.id),
    };
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
  const base = join(HERE, "runs", arg("phase", "pilot"));
  const rows = readdirSync(base).filter((d) => existsSync(join(base, d, "result.json"))).map((d) => {
    const r = JSON.parse(readFileSync(join(base, d, "result.json"), "utf8"));
    const j = join(base, d, "judge.json");
    return { ...r, judge: existsSync(j) ? JSON.parse(readFileSync(j, "utf8")) : undefined };
  });
  const s = aggregate(rows);
  writeFileSync(join(base, "summary.json"), JSON.stringify(s, null, 2) + "\n");
  console.log("| 조건 | 실행 | 숨겨진(45) | 규칙군 평균 | 만점 | 기본 | 조합 | 대조(20) | 불변식 통과 | 온톨로지 읽기 | 질문 | 가정 줄 | 비용 | 분 | 차단 | 한도 종료 |");
  console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const [c, v] of Object.entries(s)) console.log(`| ${c} | ${v.runs} | ${v.hiddenPassed.join("·")} | ${v.groupWeighted}% | ${v.allPass} | ${v.basic}% | ${v.combo}% | ${v.diff.join("·")} (평균 ${v.diffMean}) | ${v.invariantsPassed} | ${v.ontoReads.join("·")} | ${v.asked.join("·")} | ${v.assumptions.join("·")} | $${v.costUsd} | ${v.minutes} | ${v.stopBlocks.join("·")} | ${v.budgetHit} |`);
  for (const [c, v] of Object.entries(s)) console.log(`${c} 규칙군: ${JSON.stringify(v.groups)} · 용어: ${JSON.stringify(v.confusion)}${v.tamper.length ? ` · ⚠️ 변경 ${v.tamper}` : ""}${v.outside.length ? ` · ⚠️ 밖 접근 ${v.outside}` : ""}`);
}
