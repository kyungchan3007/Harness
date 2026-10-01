// 역할 분리 실험 한 번 실행 — node experiments/role-split/run.mjs --group A|B|B2 --n 1 [--model 모델] [--timeout 분]
// 복사본 준비 → AI 실행 → 채점 → 지표 수집 → runs/<group>-<n>/ 에 저장
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { EXPERIMENT_DIR, REPO_ROOT, prepareCopy, scoreCopy } from "./lib.mjs";
import { analyzeTrace, findAccess, verdictRounds } from "./metrics.mjs";
import { extractRequests, listJsonl, summarize } from "../../agents/harness/usage/usage.mjs";

const TASK_ID = "0030";
const BRANCH = `task/${TASK_ID}-coupons`;
const SPEC = `agents/intent/specs/${TASK_ID}-coupons`;
const ALLOWED_TOOLS = ["Read", "Write", "Edit", "MultiEdit", "Glob", "Grep", "Task", "Agent", "Bash(pnpm:*)", "Bash(git:*)", "Bash(node:*)", "Bash(ls:*)"];

const COMMON = `작업 번호 ${TASK_ID}, 이슈 #1(이미 있음), 브랜치 \`${BRANCH}\`(이미 체크아웃됨)입니다. 태스크 폴더는 \`${SPEC}/\`로 만드세요.
사람에게 되묻지 말고 스스로 판단해 끝까지 진행하세요. 끝나면 \`pnpm check\`가 ALL PASS여야 합니다. 커밋은 하지 않아도 됩니다.`;

export const PROMPTS = {
  A: (task) => `아래 과제를 이 저장소의 규칙(AGENTS.md)대로 완료해 주세요.
${COMMON}
설계·구현·검증을 모두 직접 합니다.

---
${task}`,
  B: (task) => `아래 과제를 이 저장소의 규칙(AGENTS.md)대로 **역할 분리 모드**로 완료해 주세요.
${COMMON}
당신은 조율자입니다. **파일을 직접 고치지 말고** 보조 에이전트에게 차례로 맡기세요.
1. designer: 요구사항 문서(prd.md, \`- **역할 분리:** on\` 줄 포함)·설계 문서(sdd.md)·도메인 규칙 문서·작업 보드
2. builder: 구현과 테스트
3. verifier: 판정서(verdict.md) — rejected면 판정서를 근거로 builder에게 수정을 맡기고 다시 verifier에게. 반려는 최대 2회
4. \`pnpm verdict\`가 "완료"이고 \`pnpm check\`가 ALL PASS여야 끝입니다.

---
${task}`,
  /** B′ — B와 같고, 과제 원문을 복사본 안 파일로 두어 모든 역할이 원문을 직접 읽게 한다 (B-1에서 요약 전달로 요구사항이 사라진 것을 보완) */
  B2: (task) => PROMPTS.B(task).replace(
    "당신은 조율자입니다.",
    `과제 원문은 \`${SPEC}/request.md\`에 그대로 있습니다. 보조 에이전트에게 일을 맡길 때마다 **이 파일을 먼저 읽고 원문을 기준으로 하라**고 지시하세요(요약으로 대신하지 마세요).
당신은 조율자입니다.`,
  ),
};
/** 실험군별로 복사본에 미리 넣는 파일 */
const SETUP_FILES = { B2: (task) => ({ [`${SPEC}/request.md`]: task }) };

/** Claude Code가 이 복사본의 대화 기록을 두는 폴더 (실제 경로가 /private로 바뀌는 경우까지) */
function transcriptDirs(copyDir) {
  const base = join(homedir(), ".claude", "projects");
  const key = copyDir.split("/").pop().replace(/[^A-Za-z0-9]/g, "-");
  return existsSync(base) ? readdirSync(base).filter((d) => d.endsWith(key)).map((d) => join(base, d)) : [];
}

function readJsonl(file) {
  return existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
}

export function runOnce({ group, n, model = "claude-haiku-4-5-20251001", timeoutMin = 45 }) {
  const id = `${group}-${n}`;
  const out = join(EXPERIMENT_DIR, "runs", id);
  if (existsSync(out)) throw new Error(`이미 결과가 있습니다: ${out}`);

  const { dir, leaks } = prepareCopy();
  if (leaks.length) throw new Error(`복사본 누출 ${leaks.length}건 — 실행 중단: ${dir}`);
  spawnSync("git", ["checkout", "-q", "-b", BRANCH], { cwd: dir });

  const task = readFileSync(join(EXPERIMENT_DIR, "task.md"), "utf8");
  for (const [rel, text] of Object.entries(SETUP_FILES[group]?.(task) ?? {})) {
    mkdirSync(join(dir, rel, ".."), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  const started = Date.now();
  const r = spawnSync(
    "claude",
    ["-p", PROMPTS[group](task), "--model", model, "--output-format", "json", "--allowedTools", ALLOWED_TOOLS.join(",")],
    { cwd: dir, encoding: "utf8", timeout: timeoutMin * 60_000, maxBuffer: 1 << 28 },
  );
  const minutes = Math.round((Date.now() - started) / 600) / 100;

  const score = scoreCopy(dir);
  const gate = spawnSync("bash", ["agents/harness/evals/checks.sh"], { cwd: dir, encoding: "utf8" });
  const traceEntries = readJsonl(join(dir, SPEC, "trace.auto.jsonl"));
  const verdictFile = join(dir, SPEC, "verdict.md");
  const verdict = existsSync(verdictFile) ? readFileSync(verdictFile, "utf8") : null;

  const lines = transcriptDirs(dir).flatMap(listJsonl).flatMap((f) => readFileSync(f, "utf8").split("\n"));
  const usage = summarize(extractRequests(lines));
  const access = findAccess(lines, [new RegExp(REPO_ROOT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), /harness-lab\//, /experiments\/role-split/, /oracle/i, /reference\/coupon/]);

  let final = null;
  try {
    final = JSON.parse(r.stdout);
  } catch {}

  const result = {
    id, group, n, model, copyDir: dir, minutes,
    exit: r.status, timedOut: r.error?.code === "ETIMEDOUT",
    score: { passed: score.passed, total: score.total, failed: score.failed, implemented: score.implemented },
    gatePassed: gate.status === 0,
    verdictRounds: verdictRounds(verdict),
    trace: analyzeTrace(traceEntries),
    usage,
    access,
    finalMessage: final?.result?.slice(0, 2000) ?? r.stdout?.slice(-2000),
    costUsd: final?.total_cost_usd ?? null,
  };

  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "result.json"), JSON.stringify(result, null, 2) + "\n");
  for (const name of ["prd.md", "sdd.md", "trace.md", "verdict.md", "trace.auto.jsonl"]) {
    const src = join(dir, SPEC, name);
    if (existsSync(src)) cpSync(src, join(out, name));
  }
  for (const name of ["src/pricing/coupon.ts", "src/pricing/coupon.test.ts"]) {
    const src = join(dir, name);
    // .txt로 보관 — 원본 저장소의 테스트·타입 검사에 잡히지 않게
    if (existsSync(src)) cpSync(src, join(out, `${name.split("/").pop()}.txt`));
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1] : fallback;
  };
  const group = arg("group");
  const n = arg("n");
  if (!PROMPTS[group] || !n) {
    console.error("사용법: node experiments/role-split/run.mjs --group A|B|B2 --n 1 [--model 모델] [--timeout 분]");
    process.exit(2);
  }
  const r = runOnce({ group, n, model: arg("model"), timeoutMin: Number(arg("timeout", 45)) });
  console.log(`${r.id}: 🎯 ${r.score.passed}/${r.score.total} · 게이트 ${r.gatePassed ? "통과" : "실패"} · 판정 ${r.verdictRounds.join("→") || "-"} · ${r.minutes}분 · 도구 ${r.trace.toolCalls} · 메인 수정 ${r.trace.mainEdits} · 차단 ${r.trace.blocked} · 누출 접근 ${r.access.length}`);
}
