// Self-Harness 축소판(0039) 실행기 — 서브에이전트가 푸는 같은 과제(0038 무대, 위치 안내 없음)
//   prepare: node experiments/self-harness/run.mjs prepare --cond H0|HL|HA --phase pilot|gate|final --n 1 → 복사본 + prompt.md
//   score:   node experiments/self-harness/run.mjs score --cond … --phase … --n …            → 격리 채점(단계별 공개 규칙만) + 대화 기록 실측
//   propose-input: 파일럿 학습 실패 → 제안자 입력(runs/proposal/input.md)
//   set-zone --file <md>: 제안 개선 구역 저장(800자 검사) · decide: 게이트 판정 · summary --phase …
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prepareCopy } from "../role-split/lib.mjs";
import { LAB_DIR, REPO_ROOT } from "../ontology-large/lib.mjs";
import { prompt, setupCondition, stubsLeft } from "../ontology-large/run.mjs";
import { HERE, LOCATION_ZONE, REPORTS, SPLIT, TASK_H0, locationHints, scoreIsolated, transcriptStats, withZone } from "./lib.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const RUNS = join(HERE, "runs");
const PROPOSAL = join(RUNS, "proposal");
const sha = (t) => createHash("sha256").update(t).digest("hex").slice(0, 16);
const mean = (xs) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

export function zoneFor(cond) {
  if (cond === "H0") return "";
  if (cond === "HL") return LOCATION_ZONE;
  if (cond === "HA") {
    const d = existsSync(join(PROPOSAL, "decision.json")) ? JSON.parse(readFileSync(join(PROPOSAL, "decision.json"), "utf8")) : null;
    const zone = readFileSync(join(PROPOSAL, "zone.md"), "utf8");
    return d && !d.adopted ? "" : zone; // 게이트 전(gate 단계)은 후보 그대로, 미채택이면 H0와 같음
  }
  throw new Error(`조건: ${cond}`);
}

/** 0038 A 바탕에서 위치 안내를 걷어 내고 개선 구역을 붙인다 */
export function harnessAgents(t, zone) {
  const stripped = t
    .replace(/\| Context \| [^\n]*\|/, "| Context | [architecture](agents/context/architecture.md) |")
    .replace("작업을 시작하기 전에 아래 표의 **Context 문서를 모두 읽는다.**\n", "");
  return withZone(stripped, zone);
}

export function agentPrompt(dir, agents) {
  return `작업 폴더(저장소 루트): ${dir}\n모든 파일 경로는 이 폴더 기준 절대 경로로, 모든 셸 명령은 \`cd ${dir} && …\`로 실행하세요. 이 폴더 밖은 읽거나 쓰지 마세요. 다른 에이전트(Agent·Task 도구)와 웹은 쓰지 마세요.\n\n<repo-instructions>\nContents of ${dir}/AGENTS.md (project instructions):\n\n${agents}\n</repo-instructions>\n\n${prompt(TASK_H0)}\n\n끝나면 마지막 메시지에 한 일과 게이트 결과를 5줄 이내로 적어 주세요.`;
}

const cmd = process.argv[2];
const runDir = (phase, cond, n) => join(RUNS, phase, `${cond}-${n}`);

if (cmd === "prepare") {
  const cond = arg("cond"), phase = arg("phase"), n = arg("n");
  const out = runDir(phase, cond, n);
  if (existsSync(join(out, "result.json"))) throw new Error(`이미 결과가 있습니다: ${out}`);
  const { dir, leaks } = prepareCopy({ ref: "HEAD" });
  if (leaks.length) throw new Error(`복사본 누출 ${leaks.length}건: ${dir}`);
  setupCondition(dir, "A");
  const agentsPath = join(dir, "AGENTS.md");
  const agents = harnessAgents(readFileSync(agentsPath, "utf8"), zoneFor(cond));
  writeFileSync(agentsPath, agents);
  const git = (a) => spawnSync("git", a, { cwd: dir, encoding: "utf8" });
  git(["add", "-A"]);
  git(["-c", "core.hooksPath=/dev/null", "commit", "-q", "--amend", "-m", "initial"]);
  const text = agentPrompt(dir, agents);
  const hints = locationHints(text.replace(zoneFor(cond), ""));
  if (hints.length) throw new Error(`위치 안내가 남음: ${hints.join(", ")}`);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "prompt.md"), text);
  writeFileSync(join(dir, ".git", "AGENT_TASK.md"), text);
  writeFileSync(join(out, "copy.json"), JSON.stringify({ dir, cond, n, phase, agentsHash: sha(agents), zoneHints: locationHints(zoneFor(cond)), startedAt: new Date().toISOString() }) + "\n");
  console.log(join(dir, ".git", "AGENT_TASK.md"));
} else if (cmd === "score") {
  const cond = arg("cond"), phase = arg("phase"), n = arg("n");
  const out = runDir(phase, cond, n);
  const meta = JSON.parse(readFileSync(join(out, "copy.json"), "utf8"));
  const dir = meta.dir;
  const root = spawnSync("git", ["rev-list", "--max-parents=0", "HEAD"], { cwd: dir, encoding: "utf8" }).stdout.trim();
  const tamper = spawnSync("git", ["diff", "--name-only", root, "--", "docs", `${LAB_DIR}/types.ts`, "AGENTS.md", "CLAUDE.md", ".claude", "agents/harness", "package.json"], { cwd: dir, encoding: "utf8" }).stdout.trim();
  const agentsNow = readFileSync(join(dir, "AGENTS.md"), "utf8");
  mkdirSync(join(out, "lab"), { recursive: true });
  for (const f of readdirSync(join(dir, LAB_DIR))) if (f.endsWith(".ts")) cpSync(join(dir, LAB_DIR, f), join(out, "lab", `${f}.txt`));
  const left = stubsLeft(dir);
  const score = scoreIsolated(dir, phase, join(REPO_ROOT, ".tmp-work", `score-${phase}-${cond}-${n}`));
  const t = transcriptStats(dir);
  const result = {
    cond, n, phase, copyDir: dir, minutes: arg("ms") ? Math.round(Number(arg("ms")) / 600) / 100 : null, // 서브에이전트 소요(완료 알림 duration_ms)
    stubsLeft: left, incomplete: left > 0, tamper: tamper ? tamper.split("\n") : [], agentsChanged: sha(agentsNow) !== meta.agentsHash,
    tokens: Number(arg("tokens", 0)) || null, toolUses: Number(arg("tools", 0)) || null,
    ...score, transcript: t,
  };
  result.valid = result.tamper.length === 0 && !result.agentsChanged && t.outside === 0 && t.agentTool === 0;
  writeFileSync(join(out, "result.json"), JSON.stringify(result, null, 2) + "\n");
  const ev = phase === "final" ? ` · 평가 ${score.eval} · 결합 ${score.combined}` : "";
  console.log(`${phase}/${cond}-${n}: 학습 ${score.train}${ev} · 명시 ${score.explicit} · 회귀 ${score.regression.passed}/45 · 미구현 ${left} · 문서 읽음 ${t.readsAnyDoc ? "예" : "아니오"} · ${result.valid ? "유효" : "⚠️ 무효"} · ${result.minutes}분`);
} else if (cmd === "propose-input") {
  const runs = readdirSync(join(RUNS, "pilot")).map((d) => JSON.parse(readFileSync(join(RUNS, "pilot", d, "result.json"), "utf8"))).filter((r) => r.valid);
  const fails = SPLIT.train.map((id) => ({ id, n: runs.filter((r) => r.byRule[id] && r.byRule[id].passed < r.byRule[id].planned).length })).filter((x) => x.n > 0);
  const first = runs[0].copyDir; // 실행 에이전트가 받은 H0 AGENTS.md 그대로(첫 커밋)
  const root0 = spawnSync("git", ["rev-list", "--max-parents=0", "HEAD"], { cwd: first, encoding: "utf8" }).stdout.trim();
  const agents = spawnSync("git", ["show", `${root0}:AGENTS.md`], { cwd: first, encoding: "utf8" }).stdout;
  const body = [
    "# 하네스 개선 제안 입력 (0039)",
    "", "아래 저장소 지시문(AGENTS.md)으로 Haiku 에이전트가 같은 요청을 처리했습니다. 개선 구역에 들어갈 글을 써 주세요.",
    "", "## 규칙", "- 출력은 개선 구역 본문만(800자 이내, 마크다운)", "- 다음 실행 에이전트가 같은 실수를 덜 하게 만드는 지시를 쓰세요", "- 저장소 파일을 읽거나 도구를 쓰지 마세요. 이 입력만 근거로 합니다",
    "", "## 실행 상태", `- 실행 ${runs.length}회 · 미완 ${runs.filter((r) => r.incomplete).length}회 · 평균 ${mean(runs.map((r) => r.minutes))}분`,
    "", "## 받은 버그 신고 (실패한 실행 수 / 전체)", ...fails.map((f) => `- (${f.n}/${runs.length}) ${REPORTS[f.id]}`),
    "", "## 현재 AGENTS.md", "", "```markdown", agents.trim(), "```",
    "", "## 요청 (실행 에이전트가 받은 그대로)", "", "```markdown", TASK_H0.trim(), "```",
  ].join("\n");
  mkdirSync(PROPOSAL, { recursive: true });
  writeFileSync(join(PROPOSAL, "input.md"), body + "\n");
  writeFileSync(join(PROPOSAL, "pilot-failures.json"), JSON.stringify({ runs: runs.length, fails }, null, 2) + "\n");
  console.log(`${join(PROPOSAL, "input.md")} · 신고 ${fails.length}개`);
} else if (cmd === "set-zone") {
  const zone = readFileSync(arg("file"), "utf8").trim();
  withZone("", zone);
  mkdirSync(PROPOSAL, { recursive: true });
  writeFileSync(join(PROPOSAL, "zone.md"), zone + "\n");
  console.log(`개선 구역 ${zone.length}자 저장 · 위치 단어 ${JSON.stringify(locationHints(zone))}`);
} else if (cmd === "decide") {
  const load = (cond) => [1, 2, 3].map((n) => JSON.parse(readFileSync(join(runDir("gate", cond, n), "result.json"), "utf8")));
  const h0 = load("H0"), ha = load("HA");
  const pairsBetter = [0, 1, 2].filter((i) => ha[i].train > h0[i].train).length;
  const d = {
    h0Train: mean(h0.map((r) => r.train)), haTrain: mean(ha.map((r) => r.train)),
    h0Explicit: mean(h0.map((r) => r.explicit)), haExplicit: mean(ha.map((r) => r.explicit)),
    pairsBetter, regressionAll: ha.every((r) => r.regression.passed === 45), allValid: [...h0, ...ha].every((r) => r.valid),
  };
  d.adopted = d.allValid && d.haTrain - d.h0Train >= 10 && pairsBetter >= 2 && d.regressionAll && d.h0Explicit - d.haExplicit <= 5;
  writeFileSync(join(PROPOSAL, "decision.json"), JSON.stringify(d, null, 2) + "\n");
  console.log(JSON.stringify(d));
} else if (cmd === "summary") {
  const phase = arg("phase");
  const rows = {};
  for (const d of readdirSync(join(RUNS, phase))) {
    if (!existsSync(join(RUNS, phase, d, "result.json"))) continue;
    const r = JSON.parse(readFileSync(join(RUNS, phase, d, "result.json"), "utf8"));
    (rows[r.cond] ??= []).push(r);
  }
  const table = Object.fromEntries(Object.entries(rows).map(([c, rs]) => {
    const v = rs.filter((r) => r.valid);
    const pick = (k) => mean(v.map((r) => r[k]).filter((x) => x != null));
    return [c, { runs: rs.length, valid: v.length, train: pick("train"), eval: pick("eval"), combined: pick("combined"), explicit: pick("explicit"), regressionAll: v.filter((r) => r.regression.passed === 45).length, incomplete: v.filter((r) => r.incomplete).length, readDocs: v.filter((r) => r.transcript.readsAnyDoc).length, minutes: pick("minutes"), perRun: v.map((r) => ({ n: r.n, train: r.train, eval: r.eval })) }];
  }));
  writeFileSync(join(RUNS, phase, "summary.json"), JSON.stringify(table, null, 2) + "\n");
  console.log(JSON.stringify(table, null, 2));
} else if (cmd) {
  console.error("사용법: run.mjs prepare|score|propose-input|set-zone|decide|summary");
  process.exit(2);
}
