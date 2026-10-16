// 온톨로지 후속 실험(0038) 한 번 실행 — node experiments/ontology-large/run.mjs --model haiku|sonnet --cond A|BI|CI --n 1 [--phase pilot|main]
// 같은 바탕 복사본(저장소 HEAD − domain.md) + 시작 코드·정책 문서 + 조건별 자료 → 실행 → 질문으로 끝나면 고정 답으로 최대 2번 이어감(전체 마감 하나) → 채점·기록 → runs/<phase>/<model>-<cond>-<n>/
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { prepareCopy } from "../role-split/lib.mjs";
import { isWaitingForAnswer } from "../ambiguity/intent-lib.mjs";
import { outsideHits } from "../cross-verify/summary.mjs";
import { extractRequests, listJsonl, summarize as usageSummary } from "../../agents/harness/usage/usage.mjs";
import { CHECK_FILE, HERE, LAB_DIR, ONTO_DIR, ONTO_JSON, ONTO_MD, START_DIR, STOP_HOOK, TYPES_FILE, runCheck, scoreLab } from "./lib.mjs";

export const MODELS = { haiku: { id: "claude-haiku-4-5-20251001", budget: 1.5 }, sonnet: { id: "claude-sonnet-5-5", budget: 4 } };
export const CONDS = ["A", "BI", "CI"];
export const TASK_ID = "0040";
export const BRANCH = `task/${TASK_ID}-lab`;
export const SPEC = `agents/intent/specs/${TASK_ID}-lab`;
const TOOLS = ["Read", "Write", "Edit", "MultiEdit", "Glob", "Grep", "Bash(pnpm:*)", "Bash(git:*)", "Bash(node:*)", "Bash(ls:*)"];
// 설치된 CLI(2.1.251)는 Sonnet 5.5를 모름 → 두 모델 모두 같은 번들 CLI
export const CLAUDE_BIN = process.env.CLAUDE_BIN || "/Users/chan/Library/Application Support/Claude/claude-code/2.1.299/4fa9694b7975/claude.app/Contents/MacOS/claude";
export const prompt = (task) =>
  `아래 요청을 이 저장소의 규칙(AGENTS.md)대로 처리해 주세요.\n작업 번호 ${TASK_ID}, 이슈 #1(이미 있음), 브랜치 \`${BRANCH}\`(이미 체크아웃됨)입니다. 태스크 폴더는 \`${SPEC}/\`로 만드세요.\n\n---\n${task}`;
/** 질문으로 끝나면 세 조건 같은 고정 답 — 누락 규칙의 원출처를 가리키되 새 정책은 주지 않는다 */
export const FIXED_ANSWER = "요청자 답변입니다.\n\n요청은 기능 범위를 요약합니다. 저장소의 정책 문서·관련 코드 주석·공개 타입 계약을 확인하고 구현해 주세요. 추가 정책은 제공하지 않습니다.";

const DOCS = "정책 문서 [docs/](docs/) (`engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`)";
const CONTEXT_ROW = {
  A: `[architecture](agents/context/architecture.md) · ${DOCS}`,
  BI: `[architecture](agents/context/architecture.md) · ${DOCS} · [ontology](agents/context/ontology.md) (도메인 개념·관계·불변식)`,
  CI: `[architecture](agents/context/architecture.md) · ${DOCS} · [ontology](agents/ontology/ontology.json) (도메인 개념·관계·불변식, 검사: \`pnpm onto:check\`)`,
};
/** BI·CI는 CLAUDE.md가 온톨로지를 @import — 항상 맥락에 들어간다 (0037: 링크·지시만으론 0/26 안 읽음) */
export const INJECT = { BI: "@agents/context/ontology.md", CI: "@agents/ontology/ontology.json" };

const edit = (file, fn) => writeFileSync(file, fn(readFileSync(file, "utf8")));

/** 바탕을 같게 만든 뒤 시작 코드·문서·조건 자료를 넣고, 커밋을 하나로 합친다 */
export function setupCondition(dir, cond) {
  rmSync(join(dir, "agents/context/domain.md"), { force: true });
  edit(join(dir, "AGENTS.md"), (t) =>
    t.replace(/ 실험 대상 도메인은[^\n]*입니다\./, "").replace(/\| Context \| [^\n]*\|/, `| Context | ${CONTEXT_ROW[cond]} |`)
      .replace("## 2. 계층\n", "## 2. 계층\n\n작업을 시작하기 전에 아래 표의 **Context 문서를 모두 읽는다.**\n"));
  edit(join(dir, "agents/context/architecture.md"), (t) => t.split("\n").filter((l) => !l.includes("domain.md")).join("\n"));
  cpSync(join(START_DIR, "docs"), join(dir, "docs"), { recursive: true });
  cpSync(join(START_DIR, LAB_DIR), join(dir, LAB_DIR), { recursive: true });
  cpSync(TYPES_FILE, join(dir, LAB_DIR, "types.ts"));
  if (cond === "BI") cpSync(ONTO_MD, join(dir, "agents/context/ontology.md"));
  if (cond === "CI") {
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
  if (INJECT[cond]) edit(join(dir, "CLAUDE.md"), (t) => `${t.trimEnd()}\n${INJECT[cond]}\n`);
  const git = (args) => spawnSync("git", args, { cwd: dir, encoding: "utf8" });
  git(["add", "-A"]);
  git(["-c", "core.hooksPath=/dev/null", "commit", "-q", "--amend", "-m", "initial"]);
  git(["checkout", "-q", "-b", BRANCH]);
}

function claude(args, cwd, timeoutMs) {
  const r = spawnSync(CLAUDE_BIN, ["-p", ...args, "--output-format", "json"], { cwd, encoding: "utf8", timeout: Math.max(60_000, timeoutMs), maxBuffer: 1 << 28 });
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

function toolInputs(lines) {
  return lines.flatMap((l) => {
    try {
      const c = JSON.parse(l).message?.content;
      return Array.isArray(c) ? c.filter((p) => p.type === "tool_use").map((p) => JSON.stringify(p.input)) : [];
    } catch { return []; }
  }).join("\n");
}

/** 시작 코드는 lab.ts가 이미 있다 → "미구현" 표시가 하나라도 남았으면 구현 안 함 */
export const stubsLeft = (dir) => readdirSync(join(dir, LAB_DIR)).filter((f) => f.endsWith(".ts") && readFileSync(join(dir, LAB_DIR, f), "utf8").includes('throw new Error("미구현')).length;

export function runOnce({ model, cond, n, phase = "pilot", timeoutMin = 50, rounds = 2 }) {
  const m = MODELS[model];
  const id = `${model}-${cond}-${n}`;
  const out = join(HERE, "runs", phase, id);
  if (existsSync(out)) throw new Error(`이미 결과가 있습니다: ${out}`);
  const { dir, leaks } = prepareCopy({ ref: "HEAD" });
  if (leaks.length) throw new Error(`복사본 누출 ${leaks.length}건 — 실행 중단: ${dir}`);
  setupCondition(dir, cond);

  const task = readFileSync(join(HERE, "task.md"), "utf8");
  const tools = (usd) => ["--model", m.id, "--allowedTools", TOOLS.join(","), "--max-budget-usd", String(usd)];
  const started = Date.now();
  const deadline = started + timeoutMin * 60_000;
  let final = claude([prompt(task), ...tools(m.budget)], dir, deadline - Date.now());
  const sessionId = final.session_id;
  const dialog = [{ who: "AI", text: final.result }];
  const phases = [final];
  let asked = 0;
  for (let r = 1; r <= rounds && sessionId && Date.now() < deadline - 60_000; r++) {
    if (!isWaitingForAnswer({ implemented: stubsLeft(dir) === 0, finalMessage: final.result ?? "" })) break;
    asked++;
    dialog.push({ who: "요청자", text: FIXED_ANSWER });
    const spent = phases.reduce((a, p) => a + (p.total_cost_usd ?? 0), 0);
    final = claude(["--resume", sessionId, FIXED_ANSWER, ...tools(Math.max(0.05, m.budget - spent))], dir, deadline - Date.now());
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
  mkdirSync(join(out, "lab"), { recursive: true });
  for (const f of readdirSync(join(dir, LAB_DIR))) if (f.endsWith(".ts")) cpSync(join(dir, LAB_DIR, f), join(out, "lab", `${f}.txt`));
  const left = stubsLeft(dir);
  const tamper = spawnSync("git", ["diff", "--name-only", "HEAD", "--", "agents/ontology", ".claude", "package.json", `${LAB_DIR}/types.ts`, "agents/harness", "agents/context/ontology.md", "docs"], { cwd: dir, encoding: "utf8" }).stdout.trim();
  const stopLog = existsSync(join(dir, ".git/onto-stop.log")) ? readFileSync(join(dir, ".git/onto-stop.log"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];

  // 채점: 규칙 대장(누락·명시·결합) + 0037 회귀 + 무작위 대조 + (세 조건 모두) 원본 C 검사를 바뀌지 않은 파일로
  const score = scoreLab(dir);
  const evalDir = "agents/.onto-eval";
  mkdirSync(join(dir, evalDir), { recursive: true });
  cpSync(CHECK_FILE, join(dir, evalDir, "check.test.ts"));
  cpSync(ONTO_JSON, join(dir, evalDir, "ontology.json"));
  const invariants = runCheck(dir, evalDir);
  rmSync(join(dir, evalDir), { recursive: true, force: true });

  const lines = transcriptLines(dir);
  const inputs = toolInputs(lines);
  const cost = phases.reduce((a, p) => a + (p.total_cost_usd ?? 0), 0);
  const result = {
    id, model, modelId: m.id, cond, n, phase, cli: spawnSync(CLAUDE_BIN, ["--version"], { encoding: "utf8" }).stdout.trim(), copyDir: dir, sessionId,
    minutes, costUsd: Math.round(cost * 1000) / 1000, budget: m.budget,
    turns: phases.reduce((a, p) => a + (p.num_turns ?? 0), 0),
    endings: phases.map((p) => ({ subtype: p.subtype ?? null, isError: !!p.is_error, timedOut: p.timedOut })),
    timedOut: phases.some((p) => p.timedOut),
    budgetHit: phases.some((p) => /budget/i.test(p.subtype ?? "") || /budget/i.test(p.result ?? "")),
    apiError: dialog.some((d) => /^API Error/.test((d.text ?? "").trim())),
    asked, stubsLeft: left, implemented: left === 0,
    gatePassed: spawnSync("bash", ["agents/harness/evals/checks.sh"], { cwd: dir }).status === 0,
    missing: score.missing, explicit: score.explicit, combined: score.combined,
    regression: score.regression, legacyDiff: score.legacyDiff, diff: score.diff, incomplete: score.incomplete,
    failedRules: Object.entries(score.byRule).filter(([, r]) => !r.allPass).map(([rid, r]) => `${rid} ${r.passed}/${r.planned}`),
    invariants: { ran: invariants.ran, passed: invariants.passed, failed: invariants.failed },
    stopBlocks: stopLog.filter((s) => s.blocked).length, stopChecks: stopLog.length, endedBlocked: stopLog.length > 0 && stopLog.at(-1).blocked,
    tamper: tamper ? tamper.split("\n") : [],
    outsideAccess: outsideHits(inputs, dir).slice(0, 5),
    ontoReads: inputs.split("\n").filter((l) => /"file_path":"[^"]*ontology/.test(l)).length,
    docReads: Object.fromEntries(["engine", "quality", "storage", "reservations", "transit"].map((d) => [d, inputs.split("\n").filter((l) => new RegExp(`"file_path":"[^"]*docs/${d}\\.md`).test(l)).length])),
    usage: usageSummary(extractRequests(lines)),
  };
  writeFileSync(join(out, "result.json"), JSON.stringify(result, null, 2) + "\n");
  return result;
}

export const oneLine = (r) => `${r.phase}/${r.id}: 누락 ${r.missing.score} · 명시 ${r.explicit.score} · 결합 ${r.combined.score} · 회귀 ${r.regression.passed}/45 · 대조 ${r.diff.passed}/20 · 불변식 ${r.invariants.passed ? "통과" : r.invariants.failed.join(",") || "-"} · 미구현 ${r.stubsLeft} · 질문 ${r.asked} · 차단 ${r.stopBlocks} · 온톨로지 ${r.ontoReads} · ${r.minutes}분 · $${r.costUsd}${r.tamper.length ? ` · ⚠️ 변경 ${r.tamper.join(",")}` : ""}${r.outsideAccess.length ? " · ⚠️ 밖 접근" : ""}`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
  const model = arg("model"), cond = arg("cond"), n = arg("n");
  if (!MODELS[model] || !CONDS.includes(cond) || !n) { console.error("사용법: node experiments/ontology-large/run.mjs --model haiku|sonnet --cond A|BI|CI --n 1 [--phase pilot|main]"); process.exit(2); }
  console.log(oneLine(runOnce({ model, cond, n, phase: arg("phase", "pilot"), timeoutMin: Number(arg("timeout", 50)) })));
}
