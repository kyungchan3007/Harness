// 온톨로지 후속 실험(0038) 공통 — 경로 · 채점(R9~R12 규칙별 · 0037 회귀 · 무작위 대조) · 작업 폴더
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, "../..");
const OLD = join(HERE, "../ontology");
export const TYPES_FILE = join(HERE, "types.ts");
export const REFERENCE_FILE = join(HERE, "reference/lab.ts");
export const START_DIR = join(HERE, "start");
export const ORACLE_FILE = join(HERE, "oracle/lab.oracle.ts");
export const DIFF_FILE = join(HERE, "oracle/lab.diff.ts");
export const ADAPTER_FILE = join(HERE, "oracle/legacy-adapter.ts");
export const RULES = JSON.parse(readFileSync(join(HERE, "rules.json"), "utf8")).rules;
export const LAB_DIR = "src/lab";
export const IMPL_PATH = "src/lab/lab.ts";
export const ONTO_DIR = "agents/ontology";
export const ONTO_MD = join(HERE, "conditions/B/ontology.md");
export const ONTO_JSON = join(HERE, "conditions/C/ontology.json");
export const CHECK_FILE = join(HERE, "conditions/C/check.test.ts");
export const STOP_HOOK = join(HERE, "conditions/C/stop-onto.mjs");

/** 채점 때 잠깐 넣는 파일 (복사본 안 상대 경로 → 원본) */
const SCORING_FILES = {
  "lab.oracle.test.ts": ORACLE_FILE,
  "lab.diff.test.ts": DIFF_FILE,
  "__ref.ts": REFERENCE_FILE,
  "__legacy/lab.ts": ADAPTER_FILE,
  "__legacy/types.ts": join(OLD, "types.ts"),
  "__legacy/lab.oracle.test.ts": join(OLD, "oracle/lab.oracle.ts"),
  "__legacy/lab.diff.test.ts": join(OLD, "oracle/lab.diff.ts"),
  "__legacy/__ref.ts": join(OLD, "reference/lab.ts"),
};

function vitestJson(root, target) {
  const cwd = existsSync(join(root, "package.json")) ? root : REPO_ROOT;
  const path = relative(cwd, join(root, target));
  const out = join(root, `.vitest-${process.pid}-${Date.now()}.json`);
  try {
    spawnSync("pnpm", ["exec", "vitest", "run", path, "--reporter=json", `--outputFile=${out}`], { cwd, encoding: "utf8" });
    return existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : null;
  } finally {
    rmSync(out, { force: true });
  }
}

/** vitest JSON → 테스트 제목별 통과 (파일 경로로 구분: __legacy는 회귀) */
function results(json) {
  const out = { fresh: {}, legacy: {} };
  for (const file of json?.testResults ?? []) {
    const bucket = /__legacy/.test(file.name ?? "") ? out.legacy : out.fresh;
    for (const t of file.assertionResults ?? []) bucket[t.title] = { passed: t.status === "passed", why: (t.failureMessages ?? [])[0]?.split("\n")[0]?.slice(0, 200) };
  }
  return out;
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pct = (x) => (x === null ? null : Math.round(x * 1000) / 10);

/** 규칙 대장 기준 채점: 규칙 점수 = 통과/예정, 분류별로 규칙군 같은 가중 평균. 예정≠실행이면 missing으로 표시 */
export function summarize(fresh, legacy, rules = RULES) {
  const byRule = {};
  for (const rule of rules) {
    const titles = Object.keys(fresh).filter((t) => t.startsWith(`${rule.id}`) && /^[a-z] /.test(t.slice(rule.id.length)));
    const passed = titles.filter((t) => fresh[t].passed).length;
    byRule[rule.id] = { class: rule.class, group: rule.group, planned: rule.tests, ran: titles.length, passed, score: passed / rule.tests, allPass: passed === rule.tests };
  }
  const classScore = (cls) => {
    const groups = {};
    for (const [, r] of Object.entries(byRule)) if (r.class === cls) (groups[r.group] ??= []).push(r.score);
    return { score: pct(mean(Object.values(groups).map(mean))), groups: Object.fromEntries(Object.entries(groups).map(([g, xs]) => [g, pct(mean(xs))])), rulesAllPass: Object.values(byRule).filter((r) => r.class === cls && r.allPass).length, rules: Object.values(byRule).filter((r) => r.class === cls).length };
  };
  const legacyIds = Object.keys(legacy);
  const regression = legacyIds.filter((t) => /^R\d[bc]\d /.test(t));
  const legacyDiff = legacyIds.filter((t) => /^D\d{2} /.test(t));
  const diffIds = Object.keys(fresh).filter((t) => /^X\d{2} /.test(t));
  return {
    missing: classScore("누락"), explicit: classScore("명시"), combined: classScore("결합"),
    regression: { passed: regression.filter((t) => legacy[t].passed).length, total: 45, ran: regression.length },
    legacyDiff: { passed: legacyDiff.filter((t) => legacy[t].passed).length, total: 20 },
    diff: { passed: diffIds.filter((t) => fresh[t].passed).length, total: 20, firstFailures: diffIds.filter((t) => !fresh[t].passed).slice(0, 3).map((t) => fresh[t].why ?? t) },
    incomplete: Object.entries(byRule).filter(([, r]) => r.ran !== r.planned).map(([id, r]) => `${id} ${r.ran}/${r.planned}`),
    byRule,
  };
}

/** root/src/lab에 채점 파일을 잠깐 넣고 돌린다 */
export function scoreLab(root) {
  const dir = join(root, LAB_DIR);
  mkdirSync(join(dir, "__legacy"), { recursive: true });
  for (const [rel, src] of Object.entries(SCORING_FILES)) cpSync(src, join(dir, rel));
  try {
    const { fresh, legacy } = results(vitestJson(root, LAB_DIR));
    const tests = Object.fromEntries(Object.entries(fresh).map(([t, r]) => [t.split(" ")[0], r.passed]));
    return { implemented: existsSync(join(dir, "lab.ts")), tests, ...summarize(fresh, legacy) };
  } finally {
    for (const rel of Object.keys(SCORING_FILES)) rmSync(join(dir, rel), { force: true });
    rmSync(join(dir, "__legacy"), { recursive: true, force: true });
  }
}

/** C 검사(agents/ontology)를 돌려 불변식별 통과를 돌려준다 */
export function runCheck(root, ontoDir = ONTO_DIR) {
  const json = vitestJson(root, ontoDir);
  const inv = {};
  for (const file of json?.testResults ?? []) for (const t of file.assertionResults ?? []) {
    const id = /^(I\d+) /.exec(t.title)?.[1];
    if (id) inv[id] = t.status === "passed";
  }
  const failed = Object.entries(inv).filter(([, ok]) => !ok).map(([id]) => id);
  return { ran: Object.keys(inv).length > 0, passed: Object.keys(inv).length > 0 && failed.length === 0, failed, inv };
}

/** 저장소 안 작업 폴더 (node_modules가 닿음, .gitignore의 .tmp-work) */
export function workDir(name) {
  const dir = join(REPO_ROOT, ".tmp-work", name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, LAB_DIR), { recursive: true });
  cpSync(TYPES_FILE, join(dir, LAB_DIR, "types.ts"));
  return dir;
}
