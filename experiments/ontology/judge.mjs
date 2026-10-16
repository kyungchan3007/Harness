// 용어 혼동 채점(0037) — node experiments/ontology/judge.mjs [--phase pilot|main]
// 채점 AI(Sonnet)는 조건을 모른다. prd·sdd·구현을 보고 혼동 쌍 8개를 "구별 / 혼동 / 언급 없음"으로, 근거 인용 필수(없으면 코드가 "언급 없음"으로 내림)
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HERE } from "./lib.mjs";

export const PAIRS = [
  ["P1", "시료 ID / 용기 ID", "담긴 것과 그릇. 같은 글자여도 다른 대상"],
  ["P2", "부모 시료 / 시작(root) 시료", "바로 위 분취 출처와 계보의 시작"],
  ["P3", "남은 양 / 이용 가능량", "실제로 남은 양과 예약을 뺀 양"],
  ["P4", "예약 / 소비", "쓸 권리를 잡음(남은 양 그대로)과 실제로 줄어듦"],
  ["P5", "분취 / 소비", "계보 안에서 옮김(보존)과 계보 밖으로 나감"],
  ["P6", "장소 / 보관 책임자", "물리적 위치(용기에서 도출)와 관리 주체"],
  ["P7", "바닥남 DEPLETED / 폐기 DISCARDED", "분취·소비로 0이 됨과 discard로 버림"],
  ["P8", "eventId / reservationId", "명령 재전송 식별과 예약 식별"],
];
const LABELS = ["구별", "혼동", "언급 없음"];

export function judgePrompt({ prd, sdd, code }) {
  return `너는 채점자다. 어떤 개발 AI가 아래 요구사항 문서(prd)·설계 문서(sdd)·구현 코드를 썼다.
헷갈리기 쉬운 개념 짝마다, 이 산출물이 두 개념을 **올바르게 구별했는지** 판정하라.
- 구별: 두 개념을 다르게 다룬 근거가 있다 (정의·코드 처리)
- 혼동: 한 개념을 다른 개념처럼 다뤘다 (예: 예약할 때 남은 양을 줄임, 폐기량을 소비량에 더함, 시료 ID와 용기 ID를 같은 목록으로 검사)
- 언급 없음: 판단할 근거가 없다
구별·혼동이면 **근거가 된 문장이나 코드 한 줄을 그대로 인용**하라. 인용이 없으면 인정하지 않는다.

짝:
${PAIRS.map(([id, name, def]) => `- ${id} ${name}: ${def}`).join("\n")}

JSON만 출력: {"pairs":[{"id":"P1","label":"구별","quote":"..."}, ...]}

## prd.md
${prd || "(없음)"}

## sdd.md
${sdd || "(없음)"}

## src/lab/lab.ts
\`\`\`ts
${code || "(없음)"}
\`\`\``;
}

/** 채점 AI 답 → 짝별 판정. 인용 없는 구별·혼동은 "언급 없음"으로 내린다 */
export function parseJudge(text = "") {
  let raw = [];
  try { raw = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)).pairs ?? []; } catch { return undefined; }
  const byId = Object.fromEntries(raw.map((p) => [p.id, p]));
  return Object.fromEntries(PAIRS.map(([id]) => {
    const p = byId[id];
    const label = LABELS.includes(p?.label) ? p.label : "언급 없음";
    const quote = String(p?.quote ?? "").trim();
    return [id, { label: label !== "언급 없음" && !quote ? "언급 없음" : label, quote }];
  }));
}

/** prd "애매한 곳·가정" 칸의 줄 수 (표시한 가정·확인 필요) */
export function assumptionLines(prd = "") {
  const m = /## 애매한 곳·가정\n([\s\S]*?)(\n## |$)/.exec(prd);
  const lines = (m?.[1] ?? "").split("\n").filter((l) => /^\s*-\s+\S/.test(l));
  return {
    total: lines.length,
    assumed: lines.filter((l) => /\(가정/.test(l)).length,
    needConfirm: lines.filter((l) => /확인 필요/.test(l)).length,
    none: lines.length === 1 && /^\s*-\s*없음/.test(lines[0]),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
  const base = join(HERE, "runs", arg("phase", "pilot"));
  for (const id of readdirSync(base).filter((d) => existsSync(join(base, d, "result.json")))) {
    const dir = join(base, id);
    if (existsSync(join(dir, "judge.json"))) continue;
    const read = (f) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), "utf8") : "");
    const r = spawnSync("claude", ["-p", judgePrompt({ prd: read("prd.md"), sdd: read("sdd.md"), code: read("lab.ts.txt") }), "--model", "claude-sonnet-5-5", "--output-format", "json"], { cwd: tmpdir(), encoding: "utf8", maxBuffer: 1 << 26 });
    let out = {};
    try { out = JSON.parse(r.stdout); } catch {}
    const pairs = parseJudge(out.result);
    writeFileSync(join(dir, "judge.json"), JSON.stringify({ pairs: pairs ?? null, error: pairs ? undefined : String(out.result ?? r.stdout).slice(0, 400), assumptions: assumptionLines(read("prd.md")), costUsd: out.total_cost_usd ?? null }, null, 2) + "\n");
    const counts = pairs ? Object.values(pairs).reduce((a, p) => ({ ...a, [p.label]: (a[p.label] ?? 0) + 1 }), {}) : "파싱 실패";
    console.log(`${id}: ${JSON.stringify(counts)}`);
  }
}
