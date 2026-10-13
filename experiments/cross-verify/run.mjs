// 다른 회사 검사자 실험(0036) — node experiments/cross-verify/run.mjs [--verifiers opus,haiku,codex] [--parallel 4] [--only case-01,case-02]
// 코드마다 깨끗한 복사본 → src/pricing/coupon.ts만 그 코드로 → 검사자가 읽기·실행만 해서 판정서를 마지막 메시지로 → runs/<case>/<verifier>/
import { spawn } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { IMPL_PATH, ORACLE_FILE, REFERENCE_FILE, prepareCopy } from "../role-split/lib.mjs";
import { buildCases, verdictOf } from "./cases.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const RUNS = join(HERE, "runs");
const TASK = readFileSync(join(HERE, "../role-split/task.md"), "utf8");
const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";

export const VERIFIERS = {
  opus: { vendor: "claude", model: "claude-opus-5-5" },
  haiku: { vendor: "claude", model: "claude-haiku-4-5-20251001" },
  codex: { vendor: "codex", model: "gpt-6-astra", effort: "high" },
};

/** 두 검사자에게 똑같이 주는 지시문 */
export function verifierPrompt(task = TASK) {
  return `당신은 검사자입니다. 아래 "요청 원문"대로 \`${IMPL_PATH}\`가 구현됐는지 검사하세요.
- 코드를 고치거나 파일을 만들지 마세요. 읽기와 명령 실행(타입 검사·테스트·node로 계산해 보기)만 할 수 있습니다.
- 원문의 규칙마다 구현이 맞는지 대조하세요. 의심되면 실제 입력을 넣어 계산해 확인하세요.
  - 계산 도구: \`node try-coupon.mjs '<상품 줄 JSON 배열>' '<쿠폰 JSON 배열>' ['<배송비 정책 JSON>']\` → 결과 또는 오류를 출력합니다.
- 이번 검사는 **구현 코드의 동작**만 봅니다. 테스트 파일이 없는 것은 판정 근거가 아닙니다.
- 마지막 답은 아래 판정서 형식으로만 쓰세요.

판정: approved 또는 rejected
### 근거
- (rejected면 위반마다 한 줄: 원문 규칙 · 입력 · 기대 · 실제)
### 확인한 것
- (규칙별로 무엇을 어떻게 확인했는지)

---
## 요청 원문

${task}`;
}

function sh(cmd, args, { cwd, timeoutMs = 20 * 60_000, env } = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    const t = setTimeout(() => p.kill("SIGKILL"), timeoutMs);
    p.on("close", (code) => { clearTimeout(t); resolve({ code, out, err }); });
  });
}

export async function runOne(c, verifierName) {
  const v = VERIFIERS[verifierName];
  const out = join(RUNS, c.id, verifierName);
  if (existsSync(join(out, "result.json"))) return JSON.parse(readFileSync(join(out, "result.json"), "utf8"));
  const { dir, leaks } = prepareCopy({ ref: "HEAD" });
  if (leaks.length) throw new Error(`복사본 누출 ${leaks.length}건: ${dir}`);
  writeFileSync(join(dir, IMPL_PATH), c.code);
  cpSync(join(HERE, "try-coupon.mjs"), join(dir, "try-coupon.mjs")); // 두 검사자에게 같은 계산 도구
  rmSync(join(dir, ".claude"), { recursive: true, force: true }); // hook 없이 — 두 검사자 조건을 같게
  mkdirSync(out, { recursive: true });
  const started = Date.now();
  let final = "", cost = null, usage = null, raw;
  if (v.vendor === "claude") {
    raw = await sh(CLAUDE_BIN, ["-p", verifierPrompt(), "--model", v.model, "--output-format", "json", "--allowedTools", "Read,Grep,Glob,Bash(pnpm:*),Bash(node:*),Bash(ls:*)"], { cwd: dir });
    try { const j = JSON.parse(raw.out); final = j.result ?? ""; cost = j.total_cost_usd ?? null; usage = j.usage ?? null; } catch { final = raw.out.slice(-4000); }
  } else {
    const last = join(out, "codex-last.md");
    raw = await sh("codex", ["exec", "--skip-git-repo-check", "-s", "read-only", "-C", dir, "-m", v.model, "-c", `model_reasoning_effort="${v.effort}"`, "--json", "-o", last, verifierPrompt()], { cwd: dir });
    writeFileSync(join(out, "codex-events.jsonl"), raw.out);
    final = existsSync(last) ? readFileSync(last, "utf8") : "";
    usage = raw.out.split("\n").flatMap((l) => { try { const e = JSON.parse(l); return e.usage ? [e.usage] : e.msg?.info?.total_token_usage ? [e.msg.info.total_token_usage] : []; } catch { return []; } }).pop() ?? null;
  }
  const codeAfter = readFileSync(join(dir, IMPL_PATH), "utf8");
  writeFileSync(join(out, "final.md"), final + "\n");
  const result = {
    case: c.id, verifier: verifierName, ...v, copyDir: dir, exitCode: raw.code,
    minutes: Math.round((Date.now() - started) / 600) / 100,
    verdict: verdictOf(final) ?? null, codeChanged: codeAfter !== c.code, costUsd: cost, usage,
  };
  writeFileSync(join(out, "result.json"), JSON.stringify(result, null, 2) + "\n");
  return result;
}

// ── 누출 차단: 실행 중 원본 저장소의 정답·결함 목록·채점 테스트·결과 키를 읽기 금지 ──
export const SECRET_PATHS = [REFERENCE_FILE, ORACLE_FILE, join(HERE, "../role-split/selfcheck.mjs"), join(HERE, "cases.mjs"), join(RUNS, "key.json")];
export function lockSecrets(lock) {
  for (const p of SECRET_PATHS) if (existsSync(p)) chmodSync(p, lock ? 0o000 : 0o644);
}

async function pool(items, n, fn) {
  const results = [];
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; results[k] = await fn(items[k]).catch((e) => ({ error: String(e) })); } }));
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
  const verifiers = arg("verifiers", "opus,haiku,codex").split(",");
  const only = arg("only")?.split(",");
  const cases = buildCases().filter((c) => !only || only.includes(c.id));
  mkdirSync(RUNS, { recursive: true });
  writeFileSync(join(RUNS, "key.json"), JSON.stringify(cases.map(({ code, ...k }) => k), null, 2) + "\n");
  // 코드 순서는 섞였고, 검사자는 번갈아 — 같은 검사자가 몰려 시간대 영향을 받지 않게
  const jobs = cases.flatMap((c, i) => verifiers.map((_, j) => [c, verifiers[(i + j) % verifiers.length]]));
  lockSecrets(true);
  try {
    const rs = await pool(jobs, Number(arg("parallel", 4)), ([c, v]) => runOne(c, v).then((r) => { console.log(`${r.case} ${r.verifier}: ${r.verdict ?? "형식 오류"} · ${r.minutes}분${r.costUsd != null ? ` · $${r.costUsd.toFixed(3)}` : ""}${r.codeChanged ? " · ⚠️ 코드 바뀜" : ""}`); return r; }));
    const errors = rs.filter((r) => r?.error);
    if (errors.length) console.error(`실패 ${errors.length}건:`, errors.map((e) => e.error).join(" / "));
  } finally {
    lockSecrets(false);
  }
}
