// Self-Harness 축소판(0039) 공통 — 분할 · 하네스(개선 구역) · 격리 채점(단계별로 볼 수 있는 규칙만 실행) · 대화 기록 실측
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { ADAPTER_FILE, DIFF_FILE, HERE as LARGE, LAB_DIR, ORACLE_FILE, REFERENCE_FILE, REPO_ROOT, RULES, summarize } from "../ontology-large/lib.mjs";

export const HERE = dirname(fileURLToPath(import.meta.url));
const OLD = join(LARGE, "../ontology");
export const REPORTS = JSON.parse(readFileSync(join(HERE, "reports.json"), "utf8")).reports;

/** 사전 고정 분할 (sdd: 학습 4 / 평가 5, 결합은 보조) */
export const SPLIT = {
  train: ["R9.3", "R10.4", "R11.4", "R12.5"],
  eval: ["R9.4", "R10.3", "R10.5", "R11.5", "R12.4"],
  combined: RULES.filter((r) => r.class === "결합").map((r) => r.id),
  explicit: RULES.filter((r) => r.class === "명시").map((r) => r.id),
};
export const ZONE_HEADING = "## 개선 구역";
export const ZONE_MAX = 800;
/** H-location 개선 구역 = 0038 요청의 "따를 계약" 문단 */
export const LOCATION_ZONE = readFileSync(join(LARGE, "task.md"), "utf8").split("## 따를 계약\n")[1].trim();
/** 위치 안내 없는 요청 */
export const TASK_H0 = readFileSync(join(LARGE, "task.md"), "utf8").split("## 따를 계약")[0].trimEnd() + "\n";

/** 단계별로 실행할 숨겨진 테스트: 개발 단계는 학습·명시·회귀만 (평가·결합은 아예 실행하지 않음) */
export function visibleRules(phase) {
  const dev = [...SPLIT.train, ...SPLIT.explicit];
  return phase === "final" ? RULES.map((r) => r.id) : dev;
}
export function namePattern(phase) {
  const ids = visibleRules(phase).map((id) => id.replace(".", "\\."));
  // vitest -t 는 "describe 이름 + 테스트 이름" 전체에 맞추므로 ^ 대신 앞 공백까지 허용
  return `(?:^|\\s)(?:${ids.join("|")})[a-z] |(?:^|\\s)R\\d[bc]\\d `;
}

const SCORING_FILES = {
  "lab.oracle.test.ts": ORACLE_FILE,
  "lab.diff.test.ts": DIFF_FILE,
  "__ref.ts": REFERENCE_FILE,
  "__legacy/lab.ts": ADAPTER_FILE,
  "__legacy/types.ts": join(OLD, "types.ts"),
  "__legacy/lab.oracle.test.ts": join(OLD, "oracle/lab.oracle.ts"),
};

/** 작업 폴더를 채점 복제본으로 옮겨(에이전트는 이미 끝남) 단계에 맞는 테스트만 돌린다 */
export function scoreIsolated(workDir, phase, cloneDir) {
  rmSync(cloneDir, { recursive: true, force: true });
  cpSync(workDir, cloneDir, { recursive: true, filter: (src) => !/\/(node_modules|\.git)(\/|$)/.test(src.slice(workDir.length)) });
  if (existsSync(join(workDir, "node_modules"))) symlinkSync(join(workDir, "node_modules"), join(cloneDir, "node_modules"));
  const lab = join(cloneDir, LAB_DIR);
  mkdirSync(join(lab, "__legacy"), { recursive: true });
  for (const [rel, src] of Object.entries(SCORING_FILES)) cpSync(src, join(lab, rel));
  const out = join(cloneDir, ".score.json");
  // 복사본(package.json·node_modules 있음)은 그 안에서, 저장소 안 작업 폴더는 저장소 루트에서 실행 (0038 vitestJson과 같은 규칙)
  const cwd = existsSync(join(cloneDir, "package.json")) && existsSync(join(cloneDir, "node_modules")) ? cloneDir : REPO_ROOT;
  spawnSync("pnpm", ["exec", "vitest", "run", relative(cwd, lab), "-t", namePattern(phase), "--reporter=json", `--outputFile=${out}`], { cwd, encoding: "utf8" });
  const json = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : null;
  rmSync(cloneDir, { recursive: true, force: true });
  return fromVitest(json, phase);
}

export function fromVitest(json, phase) {
  const fresh = {}, legacy = {};
  for (const file of json?.testResults ?? []) {
    const bucket = /__legacy/.test(file.name ?? "") ? legacy : fresh;
    for (const t of file.assertionResults ?? []) if (t.status !== "skipped" && t.status !== "pending") bucket[t.title] = { passed: t.status === "passed" };
  }
  const allow = new Set(visibleRules(phase));
  const s = summarize(fresh, legacy, RULES.filter((r) => allow.has(r.id)));
  const ruleMean = (ids) => {
    const xs = ids.filter((id) => s.byRule[id]).map((id) => s.byRule[id].score);
    return xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 1000) / 10 : null;
  };
  const out = {
    phase,
    train: ruleMean(SPLIT.train),
    explicit: ruleMean(SPLIT.explicit),
    regression: s.regression,
    byRule: Object.fromEntries(Object.entries(s.byRule).map(([id, r]) => [id, { passed: r.passed, planned: r.planned, ran: r.ran }])),
    notRun: Object.entries(s.byRule).filter(([, r]) => r.ran !== r.planned).map(([id]) => id),
  };
  if (phase === "final") Object.assign(out, { eval: ruleMean(SPLIT.eval), combined: ruleMean(SPLIT.combined) });
  return out;
}

/** 개선 구역을 붙인 AGENTS.md 내용 */
export function withZone(agents, zone) {
  if (zone.length > ZONE_MAX) throw new Error(`개선 구역 ${zone.length}자 > ${ZONE_MAX}`);
  return `${agents.trimEnd()}\n\n${ZONE_HEADING}\n\n${zone.trim() || "(비어 있음)"}\n`;
}

/** 위치 안내가 남았는지 (H0·H-auto 프롬프트에 docs 경로가 있으면 안 됨) */
export function locationHints(text) {
  return ["docs/", "engine.md", "quality.md", "storage.md", "reservations.md", "transit.md", "따를 계약", "모두 읽는다", "samples.ts", "storage.ts"].filter((w) => text.includes(w));
}

/** 서브에이전트 대화 기록에서 이 복사본을 다룬 기록을 찾아 도구 입력을 센다 */
export function transcriptStats(copyDir, base = join(homedir(), ".claude", "projects")) {
  const files = [];
  const walk = (d) => { for (const f of existsSync(d) ? readdirSync(d, { withFileTypes: true }) : []) { const p = join(d, f.name); f.isDirectory() ? walk(p) : p.endsWith(".jsonl") && p.includes("/subagents/") && files.push(p); } };
  walk(base);
  const hit = files.filter((f) => readFileSync(f, "utf8").includes(`작업 폴더(저장소 루트): ${copyDir}`));
  const inputs = [];
  for (const f of hit) for (const line of readFileSync(f, "utf8").split("\n")) {
    let j; try { j = JSON.parse(line); } catch { continue; }
    for (const c of j?.message?.content ?? []) if (c?.type === "tool_use") inputs.push({ name: c.name, input: JSON.stringify(c.input ?? {}) });
  }
  const docs = ["engine", "quality", "storage", "reservations", "transit"];
  return {
    transcripts: hit.length,
    toolCalls: inputs.length,
    docReads: Object.fromEntries(docs.map((d) => [d, inputs.filter((x) => x.input.includes(`docs/${d}.md`)).length])),
    readsAnyDoc: inputs.some((x) => x.input.includes("docs/")),
    outside: inputs.filter((x) => outsidePaths(x.input, copyDir).length > 0).length,
    agentTool: inputs.filter((x) => x.name === "Agent" || x.name === "Task").length,
  };
}

/** 도구 입력에서 작업 폴더 밖 경로($HOME · ~ · /tmp · 다른 절대 경로)를 찾는다 */
export function outsidePaths(input, copyDir) {
  const text = input.split(copyDir).join("<WORK>");
  const hits = [];
  for (const m of text.matchAll(/\$HOME|\$\{HOME\}|(?:^|[\s"'=>(])~\/|(?:^|[\s"'=>(])\/(?:tmp|Users|private|var|etc|opt)\//g)) hits.push(m[0].trim());
  return hits.filter((h) => !/^\/dev\//.test(h));
}
