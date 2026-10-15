// 온톨로지 실험(0037) 공통 — 경로 · 숨겨진 테스트 채점 · C 검사 실행
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, "../..");
export const TYPES_FILE = join(HERE, "types.ts");
export const REFERENCE_FILE = join(HERE, "reference/lab.ts");
export const ORACLE_FILE = join(HERE, "oracle/lab.oracle.ts");
export const ONTO_MD = join(HERE, "conditions/B/ontology.md");
export const ONTO_JSON = join(HERE, "conditions/C/ontology.json");
export const CHECK_FILE = join(HERE, "conditions/C/check.test.ts");
export const STOP_HOOK = join(HERE, "conditions/C/stop-onto.mjs");
/** 복사본 안 자리 */
export const LAB_DIR = "src/lab";
export const IMPL_PATH = `${LAB_DIR}/lab.ts`;
export const ORACLE_PATH = `${LAB_DIR}/lab.oracle.test.ts`;
export const ONTO_DIR = "agents/ontology";

/** 숨겨진 테스트 이름에서 번호 목록 (R1b1 …) */
export function trapIds(text = readFileSync(ORACLE_FILE, "utf8")) {
  return [...text.matchAll(/it\("(R\d[bc]\d) /g)].map((m) => m[1]);
}

/** vitest JSON → 테스트별 통과 + 규칙군 같은 가중 평균 + 기본·조합 따로. 결과에 없는 테스트는 실패 */
export function summarize(vitestJson, ids) {
  const byId = {};
  for (const file of vitestJson?.testResults ?? []) {
    for (const t of file.assertionResults ?? []) {
      const id = /^(R\d[bc]\d) /.exec(t.title)?.[1];
      if (id) byId[id] = t.status === "passed";
    }
  }
  const tests = Object.fromEntries(ids.map((id) => [id, byId[id] === true]));
  const groups = {};
  for (const id of ids) {
    const g = (groups[id.slice(0, 2)] ??= { passed: 0, total: 0 });
    g.total++;
    if (tests[id]) g.passed++;
  }
  const rate = (xs) => (xs.length ? xs.filter((id) => tests[id]).length / xs.length : null);
  const groupRates = Object.values(groups).map((g) => g.passed / g.total);
  const passed = ids.filter((id) => tests[id]).length;
  return {
    passed, total: ids.length,
    groupWeighted: Math.round((groupRates.reduce((a, b) => a + b, 0) / groupRates.length) * 1000) / 10,
    basic: rate(ids.filter((id) => id[2] === "b")), combo: rate(ids.filter((id) => id[2] === "c")),
    groups, failed: ids.filter((id) => !tests[id]), tests,
  };
}

function vitestJson(root, target) {
  // 복사본은 자기 package.json이 있고, 저장소 안 작업 폴더는 없다 → 저장소 루트에서 경로로 돌린다
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

/** root/src/lab에 숨겨진 테스트를 잠깐 넣고 돌린다 (root는 node_modules가 닿는 곳) */
export function scoreLab(root, labDir = LAB_DIR) {
  const target = join(root, labDir, "lab.oracle.test.ts");
  cpSync(ORACLE_FILE, target);
  try {
    return { implemented: existsSync(join(root, labDir, "lab.ts")), ...summarize(vitestJson(root, relative(root, target)), trapIds()) };
  } finally {
    rmSync(target, { force: true });
  }
}

/** C 검사 결과: 불변식별 통과 (ontoDir에 check.test.ts·ontology.json이 있어야 함) */
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

/** 검사·채점용 작업 폴더 (저장소 안이라 node_modules가 닿는다, .gitignore) */
export function workDir(name) {
  const dir = join(REPO_ROOT, ".tmp-work", name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, LAB_DIR), { recursive: true });
  cpSync(TYPES_FILE, join(dir, LAB_DIR, "types.ts"));
  return dir;
}
