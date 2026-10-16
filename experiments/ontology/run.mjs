// 온톨로지 실험(0037) 한 번 실행 — node experiments/ontology/run.mjs --cond A|B|C --n 1 [--phase pilot|main] [--budget 1.5] [--timeout 40]
// 같은 바탕 복사본(저장소 HEAD − domain.md) + 조건별 자료 → Haiku 실행 → 질문으로 끝나면 고정 답으로 최대 2번 이어감 → 채점·기록 → runs/<phase>/<cond>-<n>/
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { prepareCopy } from "../role-split/lib.mjs";
import { isWaitingForAnswer } from "../ambiguity/intent-lib.mjs";
import { outsideHits } from "../cross-verify/summary.mjs";
import { extractRequests, listJsonl, summarize as usageSummary } from "../../agents/harness/usage/usage.mjs";
import { CHECK_FILE, HERE, IMPL_PATH, LAB_DIR, ONTO_DIR, ONTO_JSON, ONTO_MD, STOP_HOOK, TYPES_FILE, runCheck, scoreLab } from "./lib.mjs";

export const MODEL = "claude-haiku-4-5-20251001";
export const TASK_ID = "0040";
export const BRANCH = `task/${TASK_ID}-lab`;
export const SPEC = `agents/intent/specs/${TASK_ID}-lab`;
// 파일럿: 보조 에이전트(Task·Agent)를 백그라운드로 띄우고 대기로 끝내면 `claude -p` 종료로 함께 끊김(B 2/3) → 세 조건 모두 제외
const TOOLS = ["Read", "Write", "Edit", "MultiEdit", "Glob", "Grep", "Bash(pnpm:*)", "Bash(git:*)", "Bash(node:*)", "Bash(ls:*)"];
const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";
/** 세 조건 같은 지시 (0033 A — "모호하면 물어라" 없음). 온톨로지는 저장소에만 있다 */
export const prompt = (task) =>
  `아래 요청을 이 저장소의 규칙(AGENTS.md)대로 처리해 주세요.\n작업 번호 ${TASK_ID}, 이슈 #1(이미 있음), 브랜치 \`${BRANCH}\`(이미 체크아웃됨)입니다. 태스크 폴더는 \`${SPEC}/\`로 만드세요.\n\n---\n${task}`;
/** 질문으로 끝나면 세 조건 같은 고정 답 (미결정 사항을 남기지 않았으므로 답할 내용이 없다) */
export const FIXED_ANSWER = "요청자 답변입니다.\n\n필요한 규칙은 요청 원문에 모두 적혀 있습니다. 원문에 없는 것은 가정으로 표시하고 이어서 진행해 주세요.";

const CONTEXT_ROW = {
  A: "[architecture](agents/context/architecture.md)",
  B: "[architecture](agents/context/architecture.md) · [ontology](agents/context/ontology.md) (도메인 개념·관계·불변식)",
  C: "[architecture](agents/context/architecture.md) · [ontology](agents/ontology/ontology.json) (도메인 개념·관계·불변식, 검사: `pnpm onto:check`)",
};

const edit = (file, fn) => writeFileSync(file, fn(readFileSync(file, "utf8")));

/** 바탕을 같게 만든 뒤 조건 자료를 넣고, 커밋을 하나로 합친다 */
export function setupCondition(dir, cond) {
  rmSync(join(dir, "agents/context/domain.md"), { force: true });
  // 파일럿: 링크만 두면 B·C 모두 온톨로지를 한 번도 안 읽음(0/5) → 세 조건 같은 지시 한 줄 (A는 architecture만 읽게 됨)
  edit(join(dir, "AGENTS.md"), (t) =>
    t.replace(/ 실험 대상 도메인은[^\n]*입니다\./, "").replace(/\| Context \| [^\n]*\|/, `| Context | ${CONTEXT_ROW[cond]} |`)
      .replace("## 2. 계층\n", "## 2. 계층\n\n작업을 시작하기 전에 아래 표의 **Context 문서를 모두 읽는다.**\n"));
  edit(join(dir, "agents/context/architecture.md"), (t) => t.split("\n").filter((l) => !l.includes("domain.md")).join("\n"));
  mkdirSync(join(dir, LAB_DIR), { recursive: true });
  cpSync(TYPES_FILE, join(dir, LAB_DIR, "types.ts"));
  if (cond === "B") cpSync(ONTO_MD, join(dir, "agents/context/ontology.md"));
  if (cond === "C") {
    mkdirSync(join(dir, ONTO_DIR), { recursive: true });
    cpSync(ONTO_JSON, join(dir, ONTO_DIR, "ontology.json"));
    cpSync(CHECK_FILE, join(dir, ONTO_DIR, "check.test.ts"));
    cpSync(STOP_HOOK, join(dir, ONTO_DIR, "stop-onto.mjs"));
    edit(join(dir, "package.json"), (t) => { const p = JSON.parse(t); p.scripts["onto:check"] = "vitest run agents/ontology"; return JSON.stringify(p, null, 2) + "\n"; });
    edit(join(dir, ".claude/settings.json"), (t) => {
      const s = JSON.parse(t);
      s.hooks.Stop[0].hooks.push({ type: "command", command: 'node "$CLAUDE_PROJECT_DIR/agents/ontology/stop-onto.mjs"' });
      return JSON.stringify(s, null, 2) + "\n";
    });
  }
  const git = (args) => spawnSync("git", args, { cwd: dir, encoding: "utf8" });
  git(["add", "-A"]);
  git(["-c", "core.hooksPath=/dev/null", "commit", "-q", "--amend", "-m", "initial"]);
  git(["checkout", "-q", "-b", BRANCH]);
}

function claude(args, cwd, timeoutMin) {
  const r = spawnSync(CLAUDE_BIN, ["-p", ...args, "--output-format", "json"], { cwd, encoding: "utf8", timeout: timeoutMin * 60_000, maxBuffer: 1 << 28 });
  let j = null;
  try { j = JSON.parse(r.stdout); } catch {}
  return { ...(j ?? { result: r.stdout?.slice(-4000) ?? "", is_error: true }), timedOut: r.error?.code === "ETIMEDOUT", exit: r.status };
}

function transcriptLines(copyDir) {
  const base = join(homedir(), ".claude", "projects");
  const key = copyDir.split("/").pop().replace(/[^A-Za-z0-9]/g, "-");
  const dirs = existsSync(base) ? readdirSync(base).filter((d) => d.endsWith(key)).map((d) => join(base, d)) : [];
  return dirs.flatMap(listJsonl).flatMap((f) => readFileSync(f, "utf8").split("\n"));
}

/** 실행이 실제로 쓴 명령·읽은 경로만 (도구 출력은 빼고) — 복사본 밖 접근 감사 */
function toolInputs(lines) {
  return lines.flatMap((l) => {
    try {
      const c = JSON.parse(l).message?.content;
      return Array.isArray(c) ? c.filter((p) => p.type === "tool_use").map((p) => JSON.stringify(p.input)) : [];
    } catch { return []; }
  }).join("\n");
}

export function runOnce({ cond, n, phase = "pilot", budget = 1.5, timeoutMin = 40, rounds = 2 }) {
  const id = `${cond}-${n}`;
  const out = join(HERE, "runs", phase, id);
  if (existsSync(out)) throw new Error(`이미 결과가 있습니다: ${out}`);
  const { dir, leaks } = prepareCopy({ ref: "HEAD" });
  if (leaks.length) throw new Error(`복사본 누출 ${leaks.length}건 — 실행 중단: ${dir}`);
  setupCondition(dir, cond);

  const task = readFileSync(join(HERE, "task.md"), "utf8");
  const tools = ["--model", MODEL, "--allowedTools", TOOLS.join(","), "--max-budget-usd", String(budget)];
  const started = Date.now();
  let final = claude([prompt(task), ...tools], dir, timeoutMin);
  const sessionId = final.session_id;
  const dialog = [{ who: "AI", text: final.result }];
  const phases = [final];
  let asked = 0;
  for (let r = 1; r <= rounds && sessionId; r++) {
    if (!isWaitingForAnswer({ implemented: existsSync(join(dir, IMPL_PATH)), finalMessage: final.result ?? "" })) break;
    asked++;
    dialog.push({ who: "요청자", text: FIXED_ANSWER });
    const spent = phases.reduce((a, p) => a + (p.total_cost_usd ?? 0), 0);
    final = claude(["--resume", sessionId, FIXED_ANSWER, ...tools.slice(0, -1), String(Math.max(0.05, budget - spent))], dir, timeoutMin);
    dialog.push({ who: "AI", text: final.result });
    phases.push(final);
  }
  const minutes = Math.round((Date.now() - started) / 600) / 100;

  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "dialog.md"), dialog.map((d) => `## ${d.who}\n\n${d.text}\n`).join("\n"));
  for (const name of ["prd.md", "sdd.md", "trace.md", "request.md", "trace.auto.jsonl"]) {
    const src = join(dir, SPEC, name);
    if (existsSync(src)) cpSync(src, join(out, name));
  }
  const implemented = existsSync(join(dir, IMPL_PATH));
  if (implemented) cpSync(join(dir, IMPL_PATH), join(out, "lab.ts.txt"));
  const tamper = spawnSync("git", ["diff", "--name-only", "HEAD", "--", "agents/ontology", ".claude", "package.json", `${LAB_DIR}/types.ts`, "agents/harness", "agents/context/ontology.md"], { cwd: dir, encoding: "utf8" }).stdout.trim();
  const stopLog = existsSync(join(dir, ".git/onto-stop.log")) ? readFileSync(join(dir, ".git/onto-stop.log"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];

  // 채점: 숨겨진 테스트 + (세 조건 모두) 원본 C 검사 — C 검사는 바뀌지 않은 파일로 따로 돌린다
  const hidden = scoreLab(dir);
  const evalDir = "agents/.onto-eval";
  mkdirSync(join(dir, evalDir), { recursive: true });
  cpSync(CHECK_FILE, join(dir, evalDir, "check.test.ts"));
  cpSync(ONTO_JSON, join(dir, evalDir, "ontology.json"));
  const invariants = implemented ? runCheck(dir, evalDir) : { ran: false, passed: false, failed: [], inv: {} };
  rmSync(join(dir, evalDir), { recursive: true, force: true });

  const lines = transcriptLines(dir);
  const cost = phases.reduce((a, p) => a + (p.total_cost_usd ?? 0), 0);
  const result = {
    id, cond, n, phase, model: MODEL, cli: spawnSync(CLAUDE_BIN, ["--version"], { encoding: "utf8" }).stdout.trim(), copyDir: dir, sessionId,
    minutes, costUsd: Math.round(cost * 1000) / 1000, budget,
    turns: phases.reduce((a, p) => a + (p.num_turns ?? 0), 0),
    endings: phases.map((p) => ({ subtype: p.subtype ?? null, isError: !!p.is_error, timedOut: p.timedOut })),
    budgetHit: phases.some((p) => /budget/i.test(p.subtype ?? "") || /budget/i.test(p.result ?? "")),
    apiError: dialog.some((d) => /^API Error/.test((d.text ?? "").trim())),
    asked, implemented,
    gatePassed: spawnSync("bash", ["agents/harness/evals/checks.sh"], { cwd: dir }).status === 0,
    hidden: { passed: hidden.passed, total: hidden.total, groupWeighted: hidden.groupWeighted, basic: hidden.basic, combo: hidden.combo, groups: hidden.groups, failed: hidden.failed },
    diff: hidden.diff,
    invariants: { passed: invariants.passed, failed: invariants.failed },
    stopBlocks: stopLog.filter((s) => s.blocked).length, stopChecks: stopLog.length, endedBlocked: stopLog.length > 0 && stopLog.at(-1).blocked,
    tamper: tamper ? tamper.split("\n") : [],
    outsideAccess: outsideHits(toolInputs(lines), dir).slice(0, 5),
    usage: usageSummary(extractRequests(lines)),
  };
  writeFileSync(join(out, "result.json"), JSON.stringify(result, null, 2) + "\n");
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
  const cond = arg("cond"), n = arg("n");
  if (!["A", "B", "C"].includes(cond) || !n) { console.error("사용법: node experiments/ontology/run.mjs --cond A|B|C --n 1 [--phase pilot|main]"); process.exit(2); }
  const r = runOnce({ cond, n, phase: arg("phase", "pilot"), budget: Number(arg("budget", 1.5)), timeoutMin: Number(arg("timeout", 40)) });
  console.log(`${r.phase}/${r.id}: 숨겨진 ${r.hidden.passed}/${r.hidden.total} (규칙군 ${r.hidden.groupWeighted}%) · 대조 ${r.diff.passed}/${r.diff.total} · 불변식 ${r.invariants.passed ? "통과" : r.invariants.failed.join(",") || "-"} · 질문 ${r.asked} · 차단 ${r.stopBlocks} · ${r.minutes}분 · $${r.costUsd}${r.tamper.length ? ` · ⚠️ 변경 ${r.tamper.join(",")}` : ""}${r.outsideAccess.length ? " · ⚠️ 밖 접근" : ""}`);
}
