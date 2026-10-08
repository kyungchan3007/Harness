// 대화형 실행(0027) — node experiments/ambiguity/interactive.mjs --n 1 [--model 모델] [--rounds 2] [--ref 복사본 기준 커밋] [--build-model 구현 모델] [--intent uncommon]
// Q 지시로 시작 → 구현 없이 질문으로 끝나면 질문을 항목으로 분류(AI) → intent.json의 그 항목 답만 코드로 조립해 보냄 → 같은 세션을 이어서(--resume) → 최대 rounds번
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareCopy } from "../role-split/lib.mjs";
import { groupKey, PROMPTS } from "./run.mjs";
import { composeAnswer, isWaitingForAnswer } from "./intent-lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TASK_ID = "0030";
const BRANCH = `task/${TASK_ID}-points`;
const SPEC = `agents/intent/specs/${TASK_ID}-points`;
const IMPL = "src/pricing/points.ts";
const ALLOWED_TOOLS = ["Read", "Write", "Edit", "MultiEdit", "Glob", "Grep", "Task", "Agent", "Bash(pnpm:*)", "Bash(git:*)", "Bash(node:*)", "Bash(ls:*)"];
const loadIntent = (variant) => JSON.parse(readFileSync(join(HERE, variant ? `intent-${variant}.json` : "intent.json"), "utf8")); // 0030: --intent uncommon
const KEY = JSON.parse(readFileSync(join(HERE, "answer-key.json"), "utf8"));

/** 0028: 설치된 CLI가 Opus 5.5를 지원하지 않아 CLI를 지정할 수 있게 한다(0026과 같은 방식). 실행마다 버전을 남긴다 */
const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";
const cliVersion = () => spawnSync(CLAUDE_BIN, ["--version"], { encoding: "utf8" }).stdout.trim();

function claude(args, cwd, timeoutMin = 30, bin = CLAUDE_BIN) {
  const r = spawnSync(bin, ["-p", ...args, "--output-format", "json"], { cwd, encoding: "utf8", timeout: timeoutMin * 60_000, maxBuffer: 1 << 28 });
  try { return JSON.parse(r.stdout); } catch { return { result: r.stdout?.slice(-4000) ?? "", is_error: true }; }
}

/** 요청자 AI는 분류만 — 질문마다 어떤 항목을 "직접" 묻는지. 답 문장은 composeAnswer가 intent.json에서 그대로 만든다 */
export function classifyPrompt(question) {
  return `개발 AI가 아래처럼 질문했다. 질문마다 아래 항목 중 무엇을 **직접** 묻는지 분류하라.
- 질문 문장이 그 항목을 직접 묻는 경우에만 넣는다. 관련이 있어 보여도 묻지 않았으면 넣지 않는다.
- 입력 모양·함수 형태·데이터 구조를 묻는 질문은 interface: true.
- 질문 번호가 없으면 질문 순서대로 1부터 매긴다.

항목:
${KEY.ambiguities.map((a) => `- ${a.id} (${a.topic}): ${a.question}`).join("\n")}

개발 AI의 질문:
"""
${question}
"""

JSON만 출력: {"questions":[{"n":1,"items":["M3"],"interface":false}, ...]}`;
}

/** 0029: 한 번의 claude -p 결과에서 비용·요청 수·토큰을 꺼낸다 */
export function phaseUsage(r) {
  const u = r?.usage ?? {};
  return { costUsd: r?.total_cost_usd ?? 0, turns: r?.num_turns ?? 0, input: u.input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, output: u.output_tokens ?? 0 };
}

// 0029 조합 모드: 설계 모델이 묻고 답을 받아 문서까지만, 구현 모델은 새 대화에서 그 문서를 직접 읽고 구현 (요약 전달 없음)
const DESIGN_ONLY = "이 답을 반영해서 요구사항·설계 문서(prd.md·sdd.md, 필요하면 도메인 규칙 문서)까지만 작성해 주세요. 코드는 쓰지 마세요 — 다른 개발자가 이 문서만 보고 구현합니다.";
const BUILD_FROM_DOCS = (spec) => `작업 번호 0030, 이슈 #1(이미 있음), 브랜치 \`task/0030-points\`(이미 체크아웃됨)입니다.\n이 저장소의 규칙(AGENTS.md)대로, 태스크 폴더 \`${spec}/\`의 요구사항·설계 문서를 읽고 그대로 \`src/pricing/points.ts\`를 구현해 주세요.`;

export function runInteractive({ n, model = "claude-haiku-4-5-20251001", rounds = 2, answerModel = "claude-sonnet-5-5", ref = "HEAD", buildModel, buildBin = "claude", intent: intentVariant }) {
  const INTENT = loadIntent(intentVariant);
  const group = buildModel ? `MIX-${groupKey("x", model).slice(2) || "haiku"}-${groupKey("x", buildModel).slice(2) || "haiku"}` : groupKey("QI", model); // 0028: QI-sonnet처럼, 0029: MIX-opus-haiku
  const id = `${group}${intentVariant ? `-${intentVariant}` : ""}-${n}`; // 0030: QI-uncommon-1처럼
  const out = join(HERE, "runs", id);
  if (existsSync(out)) throw new Error(`이미 결과가 있습니다: ${out}`);
  const { dir, leaks } = prepareCopy({ ref });
  if (leaks.length) throw new Error(`복사본 누출 ${leaks.length}건 — 실행 중단: ${dir}`);
  spawnSync("git", ["checkout", "-q", "-b", BRANCH], { cwd: dir });

  const task = readFileSync(join(HERE, "task.md"), "utf8");
  const started = Date.now();
  const tools = ["--model", model, "--allowedTools", ALLOWED_TOOLS.join(",")];
  let final = claude([PROMPTS.Q(task), ...tools], dir);
  const sessionId = final.session_id;
  const dialog = [{ who: "AI", text: final.result }];
  const turns = [{ phase: "design", ...phaseUsage(final) }];
  const answers = [];
  let cost = final.total_cost_usd ?? 0;

  for (let round = 1; round <= rounds && sessionId; round++) {
    if (!isWaitingForAnswer({ implemented: existsSync(join(dir, IMPL)), finalMessage: final.result })) break;
    const a = claude([classifyPrompt(final.result), "--model", answerModel], tmpdir(), 10); // 저장소 hook이 끼지 않게 빈 곳에서
    let questions = [];
    try { questions = JSON.parse(a.result.slice(a.result.indexOf("{"), a.result.lastIndexOf("}") + 1)).questions ?? []; } catch {}
    const parsed = composeAnswer(questions, INTENT);
    answers.push({ round, questions, ...parsed, costUsd: a.total_cost_usd ?? 0 });
    dialog.push({ who: "요청자", text: parsed.answer });
    final = claude(["--resume", sessionId, `요청자 답변입니다.\n\n${parsed.answer}\n\n${buildModel ? DESIGN_ONLY : "이 답을 반영해서 이어서 진행해 주세요."}`, ...tools], dir);
    dialog.push({ who: "AI", text: final.result });
    turns.push({ phase: "design", ...phaseUsage(final) });
    cost += final.total_cost_usd ?? 0;
  }

  if (buildModel) {
    const designedCode = existsSync(join(dir, IMPL)); // 설계 모델이 지시를 어기고 코드를 썼는지
    const b = claude([BUILD_FROM_DOCS(SPEC), "--model", buildModel, "--allowedTools", ALLOWED_TOOLS.join(",")], dir, 30, buildBin);
    dialog.push({ who: `구현 AI (${buildModel}, 새 대화)`, text: b.result });
    turns.push({ phase: "build", designedCode, ...phaseUsage(b) });
    cost += b.total_cost_usd ?? 0;
    final = b;
  }

  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "final-message.md"), (final.result ?? "") + "\n");
  writeFileSync(join(out, "first-message.md"), (dialog[0].text ?? "") + "\n");
  writeFileSync(join(out, "dialog.md"), dialog.map((d) => `## ${d.who}\n\n${d.text}\n`).join("\n"));
  for (const name of ["prd.md", "sdd.md", "trace.md", "verdict.md", "request.md"]) {
    const src = join(dir, SPEC, name);
    if (existsSync(src)) cpSync(src, join(out, name));
  }
  const implemented = existsSync(join(dir, IMPL));
  if (implemented) cpSync(join(dir, IMPL), join(out, "points.ts.txt"));
  const domainDiff = spawnSync("git", ["diff", "HEAD", "--", "agents/context/domain.md"], { cwd: dir, encoding: "utf8" }).stdout;
  if (domainDiff) writeFileSync(join(out, "domain.diff.txt"), domainDiff);

  const askedItems = [...new Set(answers.flatMap((a) => a.usedItems ?? []))].sort();
  const result = {
    id, group, intent: intentVariant ?? "common", n, model, answerModel, ref, cli: cliVersion(), copyDir: dir, sessionId,
    minutes: Math.round((Date.now() - started) / 600) / 100,
    apiError: dialog.some((d) => /^API Error/.test((d.text ?? "").trim())),
    rounds: answers.length, answeredItems: askedItems,
    unansweredMajor: KEY.ambiguities.filter((m) => m.weight === "major" && !askedItems.includes(m.id)).map((m) => m.id),
    implemented,
    gatePassed: spawnSync("bash", ["agents/harness/evals/checks.sh"], { cwd: dir }).status === 0,
    costUsd: Math.round(cost * 1000) / 1000,
    answerCostUsd: Math.round(answers.reduce((s, a) => s + a.costUsd, 0) * 1000) / 1000,
    answers,
    phases: turns, // 0029: 단계별 비용·요청 수·토큰
  };
  writeFileSync(join(out, "result.json"), JSON.stringify(result, null, 2) + "\n");
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
  const n = arg("n");
  if (!n) { console.error("사용법: node experiments/ambiguity/interactive.mjs --n 1 [--model 모델] [--rounds 2] [--ref 복사본 기준 커밋] [--build-model 구현 모델] [--intent uncommon]"); process.exit(2); }
  const r = runInteractive({ n, model: arg("model"), rounds: Number(arg("rounds", 2)), ref: arg("ref", "HEAD"), buildModel: arg("build-model"), buildBin: process.env.BUILD_BIN || "claude", intent: arg("intent") });
  console.log(`${r.id}: 문답 ${r.rounds}번 · 답한 항목 ${r.answeredItems.join(",") || "-"} · 구현 ${r.implemented ? "있음" : "없음"} · 게이트 ${r.gatePassed ? "통과" : "실패"} · ${r.minutes}분 · $${r.costUsd}`);
}
