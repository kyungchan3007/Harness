// 온톨로지 후속 실험(0038) 집계 — node experiments/ontology-large/summary.mjs [--phase pilot|main] → runs/<phase>/summary.json + 표
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HERE } from "./lib.mjs";

const mean = (xs) => { const v = xs.filter((x) => x !== null && x !== undefined); return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null; };

export function aggregate(rows) {
  const out = {};
  for (const model of ["haiku", "sonnet"]) for (const cond of ["A", "BI", "CI"]) {
    const rs = rows.filter((r) => r.model === model && r.cond === cond);
    if (!rs.length) continue;
    const groups = {};
    for (const r of rs) for (const [g, v] of Object.entries(r.missing.groups ?? {})) (groups[g] ??= []).push(v);
    out[`${model}/${cond}`] = {
      runs: rs.length,
      missing: mean(rs.map((r) => r.missing.score)), missingEach: rs.map((r) => r.missing.score),
      missingRulesAllPass: rs.map((r) => `${r.missing.rulesAllPass}/${r.missing.rules}`),
      missingGroups: Object.fromEntries(Object.entries(groups).sort().map(([g, xs]) => [g, mean(xs)])),
      explicit: mean(rs.map((r) => r.explicit.score)), combined: mean(rs.map((r) => r.combined.score)),
      regression: rs.map((r) => r.regression.passed), legacyDiff: rs.map((r) => r.legacyDiff.passed),
      diff: rs.map((r) => r.diff.passed), diffMean: mean(rs.map((r) => r.diff.passed)),
      perfect: rs.filter((r) => r.missing.score === 100 && r.explicit.score === 100 && r.combined.score === 100 && r.regression.passed === 45).length,
      invariantsPassed: rs.filter((r) => r.invariants.passed).length,
      implemented: rs.filter((r) => r.implemented).length,
      ontoReads: rs.map((r) => r.ontoReads), docReads: rs.map((r) => Object.values(r.docReads ?? {}).filter((x) => x > 0).length),
      asked: rs.map((r) => r.asked), stopBlocks: rs.map((r) => r.stopBlocks), endedBlocked: rs.filter((r) => r.endedBlocked).length,
      costUsd: mean(rs.map((r) => r.costUsd)), minutes: mean(rs.map((r) => r.minutes)), turns: mean(rs.map((r) => r.turns)),
      gatePassed: rs.filter((r) => r.gatePassed).length, budgetHit: rs.filter((r) => r.budgetHit).length, timedOut: rs.filter((r) => r.timedOut).length,
      apiError: rs.filter((r) => r.apiError).length,
      tamper: rs.filter((r) => r.tamper.length).map((r) => `${r.id}: ${r.tamper.join(",")}`),
      outside: rs.filter((r) => r.outsideAccess.length).map((r) => r.id),
    };
  }
  return out;
}

export function table(s) {
  const lines = [
    "| 모델/조건 | 실행 | 누락(주) | 누락 실행별 | 명시 | 결합 | 회귀(45) | 새 대조(20) | 만점 | 불변식 통과 | 온톨로지 읽기 | 문서 읽은 수(5) | 질문 | 차단 | 비용 | 분 | 한도·시간 |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const [k, v] of Object.entries(s)) lines.push(`| ${k} | ${v.runs} | ${v.missing} | ${v.missingEach.join("·")} | ${v.explicit} | ${v.combined} | ${v.regression.join("·")} | ${v.diff.join("·")} | ${v.perfect} | ${v.invariantsPassed} | ${v.ontoReads.join("·")} | ${v.docReads.join("·")} | ${v.asked.join("·")} | ${v.stopBlocks.join("·")} | $${v.costUsd} | ${v.minutes} | ${v.budgetHit}·${v.timedOut} |`);
  return lines.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
  const base = join(HERE, "runs", arg("phase", "pilot"));
  const rows = readdirSync(base).filter((d) => existsSync(join(base, d, "result.json"))).map((d) => JSON.parse(readFileSync(join(base, d, "result.json"), "utf8")));
  const s = aggregate(rows);
  writeFileSync(join(base, "summary.json"), JSON.stringify(s, null, 2) + "\n");
  console.log(table(s));
  for (const [k, v] of Object.entries(s)) console.log(`${k} 누락 규칙군: ${JSON.stringify(v.missingGroups)}${v.tamper.length ? ` · ⚠️ 변경 ${v.tamper}` : ""}${v.outside.length ? ` · ⚠️ 밖 접근 ${v.outside}` : ""}`);
}
