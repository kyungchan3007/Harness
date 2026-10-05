// 모호한 요청 실험 한 번 실행 — node experiments/ambiguity/run.mjs --group A|Q|BR|AM|BM --n 1 [--model 모델] [--timeout 분]
// 복사본 준비(0015 장치) → AI 실행 → 산출물 저장 → runs/<group>-<n>/  (판정은 judge.mjs)
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareCopy } from "../role-split/lib.mjs";
import { analyzeTrace } from "../role-split/metrics.mjs";
import { extractRequests, listJsonl, summarize } from "../../agents/harness/usage/usage.mjs";
import { renderRequest } from "../../agents/harness/evals/request.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TASK_ID = "0030";
const BRANCH = `task/${TASK_ID}-points`;
const SPEC = `agents/intent/specs/${TASK_ID}-points`;
const IMPL = "src/pricing/points.ts";
const ALLOWED_TOOLS = ["Read", "Write", "Edit", "MultiEdit", "Glob", "Grep", "Task", "Agent", "Bash(pnpm:*)", "Bash(git:*)", "Bash(node:*)", "Bash(ls:*)"];

// 0016과 달리 "사람에게 되묻지 말고 끝까지 진행" 문장을 넣지 않는다 — 이 실험에선 그 문장이 결과를 정해 버린다
const COMMON = `작업 번호 ${TASK_ID}, 이슈 #1(이미 있음), 브랜치 \`${BRANCH}\`(이미 체크아웃됨)입니다. 태스크 폴더는 \`${SPEC}/\`로 만드세요.`;

export const PROMPTS = {
  A: (task) => `아래 요청을 이 저장소의 규칙(AGENTS.md)대로 처리해 주세요.\n${COMMON}\n\n---\n${task}`,
  Q: (task) =>
    `아래 요청을 이 저장소의 규칙(AGENTS.md)대로 처리해 주세요.\n${COMMON}\n요구사항이 모호하면 추측해서 구현하지 말고, 무엇이 모호한지 질문으로 정리해 사람의 답을 받으세요.\n\n---\n${task}`,
  BR: (task) => `아래 요청을 이 저장소의 규칙(AGENTS.md)대로 **역할 분리 모드**로 처리해 주세요.
${COMMON}
당신은 조율자입니다. **파일을 직접 고치지 말고** 보조 에이전트에게 차례로 맡기세요.
1. designer: 요구사항 문서(prd.md, \`- **역할 분리:** on\` 줄 포함)·설계 문서(sdd.md)·도메인 규칙 문서·작업 보드
2. builder: 구현과 테스트
3. verifier: 판정서(verdict.md) — rejected면 판정서를 근거로 builder에게 수정을 맡기고 다시 verifier에게. 반려는 최대 2회

---
${task}`,
};
// 0025: 같은 지시, 다른 저장소 — 복사본에 "애매한 곳·가정" 필수 칸 장치가 있다(커밋 기준). 지시 문장은 A·BR과 똑같다
PROMPTS.AM = PROMPTS.A;
PROMPTS.BM = PROMPTS.BR;
const SETUP_FILES = { BR: (task) => ({ [`${SPEC}/request.md`]: renderRequest("1", task) }) };
SETUP_FILES.BM = SETUP_FILES.BR;

function transcriptLines(copyDir) {
  const base = join(homedir(), ".claude", "projects");
  const key = copyDir.split("/").pop().replace(/[^A-Za-z0-9]/g, "-");
  const dirs = existsSync(base) ? readdirSync(base).filter((d) => d.endsWith(key)).map((d) => join(base, d)) : [];
  return dirs.flatMap(listJsonl).flatMap((f) => readFileSync(f, "utf8").split("\n"));
}

export function runOnce({ group, n, model = "claude-haiku-4-5-20251001", timeoutMin = 30 }) {
  const out = join(HERE, "runs", `${group}-${n}`);
  if (existsSync(out)) throw new Error(`이미 결과가 있습니다: ${out}`);
  const { dir, leaks } = prepareCopy();
  if (leaks.length) throw new Error(`복사본 누출 ${leaks.length}건 — 실행 중단: ${dir}`);
  spawnSync("git", ["checkout", "-q", "-b", BRANCH], { cwd: dir });

  const task = readFileSync(join(HERE, "task.md"), "utf8");
  for (const [rel, text] of Object.entries(SETUP_FILES[group]?.(task) ?? {})) {
    mkdirSync(join(dir, rel, ".."), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  const started = Date.now();
  const r = spawnSync("claude", ["-p", PROMPTS[group](task), "--model", model, "--output-format", "json", "--allowedTools", ALLOWED_TOOLS.join(",")], {
    cwd: dir, encoding: "utf8", timeout: timeoutMin * 60_000, maxBuffer: 1 << 28,
  });
  let final = null;
  try { final = JSON.parse(r.stdout); } catch {}

  mkdirSync(out, { recursive: true });
  const finalMessage = final?.result ?? r.stdout?.slice(-4000) ?? "";
  writeFileSync(join(out, "final-message.md"), finalMessage + "\n");
  for (const name of ["prd.md", "sdd.md", "trace.md", "verdict.md", "request.md", "trace.auto.jsonl"]) {
    const src = join(dir, SPEC, name);
    if (existsSync(src)) cpSync(src, join(out, name));
  }
  const implemented = existsSync(join(dir, IMPL));
  if (implemented) cpSync(join(dir, IMPL), join(out, "points.ts.txt"));
  const domainDiff = spawnSync("git", ["diff", "HEAD", "--", "agents/context/domain.md"], { cwd: dir, encoding: "utf8" }).stdout;
  if (domainDiff) writeFileSync(join(out, "domain.diff.txt"), domainDiff);
  const traceFile = join(dir, SPEC, "trace.auto.jsonl");
  const entries = existsSync(traceFile) ? readFileSync(traceFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];

  const result = {
    id: `${group}-${n}`, group, n, model, copyDir: dir,
    minutes: Math.round((Date.now() - started) / 600) / 100,
    exit: r.status, timedOut: r.error?.code === "ETIMEDOUT",
    implemented,
    gatePassed: spawnSync("bash", ["agents/harness/evals/checks.sh"], { cwd: dir }).status === 0,
    trace: analyzeTrace(entries),
    usage: summarize(extractRequests(transcriptLines(dir))),
    costUsd: final?.total_cost_usd ?? null,
  };
  writeFileSync(join(out, "result.json"), JSON.stringify(result, null, 2) + "\n");
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
  const group = arg("group"), n = arg("n");
  if (!PROMPTS[group] || !n) { console.error("사용법: node experiments/ambiguity/run.mjs --group A|Q|BR|AM|BM --n 1"); process.exit(2); }
  const r = runOnce({ group, n, model: arg("model"), timeoutMin: Number(arg("timeout", 30)) });
  console.log(`${r.id}: 구현 ${r.implemented ? "있음" : "없음"} · 게이트 ${r.gatePassed ? "통과" : "실패"} · ${r.minutes}분 · $${r.costUsd?.toFixed(2)}`);
}
