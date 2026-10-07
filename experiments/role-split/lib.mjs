// 역할 분리 실험 — 복사본 준비 · 누출 검사 · 채점 (0015)
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const EXPERIMENT_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(EXPERIMENT_DIR, "../..");
export const ORACLE_FILE = join(EXPERIMENT_DIR, "oracle/coupon.oracle.ts");
export const REFERENCE_FILE = join(EXPERIMENT_DIR, "reference/coupon.ts");
/** 복사본 안에서 구현·채점 파일이 놓이는 자리 */
export const IMPL_PATH = "src/pricing/coupon.ts";
export const ORACLE_PATH = "src/pricing/coupon.oracle.test.ts";

/** 실험을 설계·준비한 태스크 — 기록 폴더를 빼고, 작업 보드·일지의 행도 지운다 */
export const EXCLUDED_TASKS = ["0012", "0013", "0014", "0015", "0016", "0022", "0023", "0024", "0025", "0026", "0027", "0028", "0029"]; // 0022~0029: 실험 결과·채점 내용·정답지가 적혀 있어 힌트가 됨
/** 복사본에 넣지 않는 경로 — 실험 자체(채점·정답)와 위 태스크 기록 */
export const EXCLUDED_PATHS = ["experiments/**", ...EXCLUDED_TASKS.map((id) => `agents/intent/specs/${id}-*/**`)];
/** 표 행 단위로 위 태스크를 지울 파일 */
const ROW_FILTERED_FILES = ["agents/orchestration/TASKS.md", "agents/JOURNAL.md", "LEARNINGS.md", "README.md"];

/** 복사본에 있으면 안 되는 말 — 채점 기준·정답·실험 설계가 새어 들어갔다는 신호 */
export const LEAK_PATTERNS = [
  /oracle/i,
  /채점/,
  /정답/,
  /실험군/,
  /priceWithCoupons/,
  /CouponError/,
  /experiments\/role-split/,
  /포인트 적립/, // 0024~ 애매한 요청 실험 과제
  /몰래 지어/,
];

const SKIP_DIRS = new Set(["node_modules", ".git"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** 복사본의 파일 내용·git 이력에서 누출 흔적을 찾는다. 빈 배열이면 깨끗하다 */
export function scanLeaks(copyDir, patterns = LEAK_PATTERNS) {
  const hits = [];
  for (const file of walk(copyDir)) {
    const text = readFileSync(file, "utf8");
    text.split("\n").forEach((lineText, i) => {
      for (const p of patterns) {
        if (p.test(lineText)) hits.push({ where: `${relative(copyDir, file)}:${i + 1}`, pattern: String(p), text: lineText.trim().slice(0, 120) });
      }
    });
  }
  const log = git(copyDir, ["log", "--format=%an%n%ae%n%s%n%b"]);
  for (const p of patterns) if (p.test(log)) hits.push({ where: "git log", pattern: String(p), text: "" });
  const commits = git(copyDir, ["rev-list", "--count", "HEAD"]).trim();
  if (commits !== "1") hits.push({ where: "git log", pattern: "커밋 1개", text: `커밋 ${commits}개` });
  return hits;
}

/** 표에서 제외 태스크를 가리키는 행을 지운다 (행 안의 "| 0014 |", "| 0014 제목 |", "(0014)" 등) */
export function dropTaskRows(text, ids = EXCLUDED_TASKS) {
  const mention = new RegExp(`(?<![\\d#])(?:${ids.join("|")})(?!\\d)`);
  return text
    .split("\n")
    .filter((l) => !(l.startsWith("|") && mention.test(l)))
    .join("\n");
}

/** 원본에서 실험 폴더를 부르는 연결(게이트 한 줄, pnpm 스크립트)을 뺀다 — 복사본엔 그 폴더가 없다 */
export function stripExperimentHooks(target) {
  const checks = join(target, "agents/harness/evals/checks.sh");
  if (existsSync(checks)) {
    const text = readFileSync(checks, "utf8");
    writeFileSync(checks, text.split("\n").filter((l) => !l.includes("experiments/")).join("\n"));
  }
  const pkgFile = join(target, "package.json");
  const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
  for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) if (cmd.includes("experiments/")) delete pkg.scripts[name];
  writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n");
}

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

/** prepareCopy의 ref로 주면 커밋이 아니라 지금 작업 폴더 상태로 복사본을 만든다 */
export const WORKTREE = "WORKTREE";

/**
 * 원본 저장소의 한 시점(ref, 기본 HEAD — 실험 실행용으로 재현 가능)에서 실행용 복사본을 만든다.
 * 이력 없는 새 저장소 + 중립 커밋 하나. 제외 경로는 아예 들어가지 않는다.
 */
export function prepareCopy({ ref = "HEAD", dest, install = true } = {}) {
  const target = dest ?? mkdtempSync(join(tmpdir(), "run-"));
  mkdirSync(target, { recursive: true });
  if (readdirSync(target).length > 0) throw new Error(`빈 폴더여야 합니다: ${target}`);

  const excludes = EXCLUDED_PATHS.map((p) => `:(exclude,glob)${p}`);
  if (ref === WORKTREE) {
    // 커밋 전 상태 그대로(수정·새 파일 포함, .gitignore 제외) — 게이트가 "지금 상태"를 검사하도록
    const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ".", ...excludes], { cwd: REPO_ROOT, encoding: "utf8" })
      .split("\0")
      .filter((f) => f && existsSync(join(REPO_ROOT, f)));
    for (const f of files) {
      mkdirSync(dirname(join(target, f)), { recursive: true });
      cpSync(join(REPO_ROOT, f), join(target, f));
    }
  } else {
    const tar = execFileSync("git", ["archive", "--format=tar", ref, "--", ".", ...excludes], { cwd: REPO_ROOT, maxBuffer: 1 << 30 });
    execFileSync("tar", ["-x", "-C", target], { input: tar });
  }

  stripExperimentHooks(target);
  for (const rel of ROW_FILTERED_FILES) {
    const file = join(target, rel);
    if (existsSync(file)) writeFileSync(file, dropTaskRows(readFileSync(file, "utf8")));
  }
  // 작업 기록이 이 실행의 것만 남도록 원본의 자동 기록은 비운다
  for (const file of walk(target)) if (file.endsWith("trace.auto.jsonl")) rmSync(file);

  git(target, ["init", "-q", "-b", "main"]);
  git(target, ["add", "-A"]);
  git(target, ["-c", "user.name=dev", "-c", "user.email=dev@example.com", "-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", "initial"]);
  git(target, ["config", "user.name", "dev"]);
  git(target, ["config", "user.email", "dev@example.com"]);

  if (install) {
    const r = spawnSync("pnpm", ["install", "--offline", "--frozen-lockfile", "--silent"], { cwd: target, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`pnpm install 실패: ${r.stderr || r.stdout}`);
  }

  const leaks = scanLeaks(target);
  return { dir: target, leaks };
}

/** 채점용 테스트 이름에서 함정 번호 목록을 읽는다 (T01…) */
export function trapIds(oracleText = readFileSync(ORACLE_FILE, "utf8")) {
  return [...oracleText.matchAll(/it\("(T\d{2}) /g)].map((m) => m[1]);
}

/** vitest JSON 결과를 함정별 통과 여부로 바꾼다. 결과에 없는 함정은 실패로 본다 */
export function summarize(vitestJson, ids) {
  const byId = {};
  for (const file of vitestJson?.testResults ?? []) {
    for (const t of file.assertionResults ?? []) {
      const id = /^(T\d{2}) /.exec(t.title)?.[1];
      if (id) byId[id] = t.status === "passed";
    }
  }
  const traps = Object.fromEntries(ids.map((id) => [id, byId[id] === true]));
  const passed = Object.values(traps).filter(Boolean).length;
  return { passed, total: ids.length, failed: ids.filter((id) => !traps[id]), traps };
}

/** 복사본에 채점용 테스트를 넣고 돌린 뒤 다시 뺀다 */
export function scoreCopy(copyDir) {
  const target = join(copyDir, ORACLE_PATH);
  const out = join(copyDir, ".score.json");
  cpSync(ORACLE_FILE, target);
  try {
    spawnSync("pnpm", ["exec", "vitest", "run", ORACLE_PATH, "--reporter=json", `--outputFile=${out}`], { cwd: copyDir, encoding: "utf8" });
    const json = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : null;
    return { implemented: existsSync(join(copyDir, IMPL_PATH)), ...summarize(json, trapIds()) };
  } finally {
    rmSync(target, { force: true });
    rmSync(out, { force: true });
  }
}
