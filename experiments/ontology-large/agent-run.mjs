// 서브에이전트 실행(0038 2차) — CLI(`claude -p`) 대신 대화 세션의 서브에이전트가 같은 과제를 푼다 (CLI 쪽이 Console 크레딧 소진으로 중단)
//   prepare: node experiments/ontology-large/agent-run.mjs prepare --model haiku|sonnet --cond A|BI|CI --n 1 [--phase agent]  → 복사본 + prompt.md
//   stop:    node experiments/ontology-large/agent-run.mjs stop --dir <복사본>   → CI Stop 훅과 같은 검사, 막히면 reason 출력(종료 1)
//   score:   node experiments/ontology-large/agent-run.mjs score --dir <복사본> --model … --cond … --n … --asked 0 --blocks 0 [--phase agent]
// CLAUDE.md(@AGENTS.md, BI·CI는 + 온톨로지 @import)는 서브에이전트가 자동으로 읽지 않으므로 CLI가 넣었을 내용을 세 조건 같은 형식으로 프롬프트 앞에 붙인다
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prepareCopy } from "../role-split/lib.mjs";
import { CHECK_FILE, HERE, LAB_DIR, ONTO_JSON, runCheck, scoreLab } from "./lib.mjs";
import { INJECT, SPEC, prompt, setupCondition, stubsLeft } from "./run.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const cmd = process.argv[2];

export function agentPrompt(dir, cond) {
  const task = readFileSync(join(HERE, "task.md"), "utf8");
  const memory = [`Contents of ${dir}/AGENTS.md (project instructions):\n\n${readFileSync(join(dir, "AGENTS.md"), "utf8")}`];
  if (INJECT[cond]) {
    const rel = INJECT[cond].slice(1);
    memory.push(`Contents of ${dir}/${rel} (imported by CLAUDE.md):\n\n${readFileSync(join(dir, rel), "utf8")}`);
  }
  return `작업 폴더(저장소 루트): ${dir}\n모든 파일 경로는 이 폴더 기준 절대 경로로, 모든 셸 명령은 \`cd ${dir} && …\`로 실행하세요. 이 폴더 밖은 읽거나 쓰지 마세요. 다른 에이전트(Agent·Task 도구)와 웹은 쓰지 마세요.\n\n<repo-instructions>\n${memory.join("\n\n")}\n</repo-instructions>\n\n${prompt(task)}\n\n끝나면 마지막 메시지에 한 일과 게이트 결과를 5줄 이내로 적어 주세요.`;
}

if (cmd === "prepare") {
  const model = arg("model"), cond = arg("cond"), n = arg("n"), phase = arg("phase", "agent");
  const out = join(HERE, "runs", phase, `${model}-${cond}-${n}`);
  if (existsSync(join(out, "result.json"))) throw new Error(`이미 결과가 있습니다: ${out}`);
  const { dir, leaks } = prepareCopy({ ref: "HEAD" });
  if (leaks.length) throw new Error(`복사본 누출 ${leaks.length}건: ${dir}`);
  setupCondition(dir, cond);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "prompt.md"), agentPrompt(dir, cond));
  writeFileSync(join(dir, ".git", "AGENT_TASK.md"), agentPrompt(dir, cond)); // 서브에이전트는 이 파일을 처음에 통째로 읽는다(프롬프트 그대로)
  writeFileSync(join(out, "copy.json"), JSON.stringify({ dir, model, cond, n, phase, startedAt: new Date().toISOString() }) + "\n");
  console.log(join(out, "prompt.md"));
} else if (cmd === "stop") {
  const dir = arg("dir");
  const r = spawnSync("node", [join(dir, "agents/ontology/stop-onto.mjs")], { cwd: dir, input: JSON.stringify({ cwd: dir }), encoding: "utf8" });
  if (!r.stdout.trim()) { console.log("통과"); process.exit(0); }
  console.log(JSON.parse(r.stdout).reason);
  process.exit(1);
} else if (cmd === "score") {
  const dir = arg("dir"), model = arg("model"), cond = arg("cond"), n = arg("n"), phase = arg("phase", "agent");
  const id = `${model}-${cond}-${n}`;
  const out = join(HERE, "runs", phase, id);
  const meta = JSON.parse(readFileSync(join(out, "copy.json"), "utf8"));
  for (const name of ["prd.md", "sdd.md", "trace.md", "request.md"]) if (existsSync(join(dir, SPEC, name))) cpSync(join(dir, SPEC, name), join(out, name));
  mkdirSync(join(out, "lab"), { recursive: true });
  for (const f of readdirSync(join(dir, LAB_DIR))) if (f.endsWith(".ts")) cpSync(join(dir, LAB_DIR, f), join(out, "lab", `${f}.txt`));
  const left = stubsLeft(dir);
  const tamper = spawnSync("git", ["diff", "--name-only", spawnSync("git", ["rev-list", "--max-parents=0", "HEAD"], { cwd: dir, encoding: "utf8" }).stdout.trim(), "--", "agents/ontology", ".claude", "package.json", `${LAB_DIR}/types.ts`, "agents/harness", "agents/context/ontology.md", "docs"], { cwd: dir, encoding: "utf8" }).stdout.trim();
  const score = scoreLab(dir);
  const evalDir = "agents/.onto-eval";
  mkdirSync(join(dir, evalDir), { recursive: true });
  cpSync(CHECK_FILE, join(dir, evalDir, "check.test.ts"));
  cpSync(ONTO_JSON, join(dir, evalDir, "ontology.json"));
  const invariants = runCheck(dir, evalDir);
  rmSync(join(dir, evalDir), { recursive: true, force: true });
  const result = {
    id, model, modelId: `subagent:${model}`, cond, n, phase, runner: "subagent", copyDir: dir,
    minutes: Math.round((Date.now() - Date.parse(meta.startedAt)) / 600) / 100,
    costUsd: null, turns: null, timedOut: false, budgetHit: false, apiError: false,
    asked: Number(arg("asked", 0)), stubsLeft: left, implemented: left === 0,
    gatePassed: spawnSync("bash", ["agents/harness/evals/checks.sh"], { cwd: dir }).status === 0,
    missing: score.missing, explicit: score.explicit, combined: score.combined,
    regression: score.regression, legacyDiff: score.legacyDiff, diff: score.diff, incomplete: score.incomplete,
    failedRules: Object.entries(score.byRule).filter(([, r]) => !r.allPass).map(([rid, r]) => `${rid} ${r.passed}/${r.planned}`),
    invariants: { ran: invariants.ran, passed: invariants.passed, failed: invariants.failed },
    stopBlocks: Number(arg("blocks", 0)), endedBlocked: arg("endedBlocked", "false") === "true",
    tamper: tamper ? tamper.split("\n") : [], outsideAccess: [], ontoReads: null, docReads: {},
  };
  writeFileSync(join(out, "result.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(`${phase}/${id}: 누락 ${result.missing.score} · 명시 ${result.explicit.score} · 결합 ${result.combined.score} · 회귀 ${result.regression.passed}/45 · 대조 ${result.diff.passed}/20 · 불변식 ${result.invariants.passed ? "통과" : result.invariants.failed.join(",") || "-"} · 미구현 ${left} · 게이트 ${result.gatePassed ? "통과" : "실패"} · 차단 ${result.stopBlocks} · ${result.minutes}분${result.tamper.length ? ` · ⚠️ 변경 ${result.tamper.join(",")}` : ""}`);
} else {
  console.error("사용법: agent-run.mjs prepare|stop|score …");
  process.exit(2);
}
