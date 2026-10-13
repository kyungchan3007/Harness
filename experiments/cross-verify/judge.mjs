// 다른 회사 검사자 실험(0036) 판정 — node experiments/cross-verify/judge.mjs  (판정 안 된 실행 전부)
// 채점 AI(Sonnet)는 검사자가 누구인지 모른다. 심은 변경 + 코드 + 판정서를 보고 "심은 결함을 짚었나"와 지적의 유효성을 판정
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RUNS } from "./run.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TASK = readFileSync(join(HERE, "../role-split/task.md"), "utf8");
const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";

export function judgePrompt({ key, code, verdictText }) {
  const planted = key.defect
    ? `이 코드는 원문을 모두 지키는 구현에서 **한 곳만 일부러 틀리게 바꾼 것**이다.\n- 심은 결함: ${key.name}\n- 바뀐 코드: \`${key.find}\` → \`${key.replace}\``
    : "이 코드는 원문을 모두 지키는 구현이다 (숨겨진 테스트 전부 통과). **심은 결함은 없다.**";
  return `너는 채점자다. 어떤 검사자가 아래 요청 원문을 기준으로 코드를 검사하고 판정서를 썼다.
${planted}

판정하라:
- identified: 판정서가 심은 결함을 **규칙과 발생 조건까지** 짚었는가 (막연한 "확인 필요"나 다른 문제만 말했으면 false). 심은 결함이 없으면 null
- claims: 판정서가 "위반"이라고 주장한 서로 다른 문제의 수 (참고·경미 언급처럼 위반이 아니라고 스스로 밝힌 것은 빼라)
- validClaims: 그중 실제로 요청 원문을 어기는 문제의 수 (심은 결함을 짚은 것은 유효. 그 밖의 주장은 코드가 정말 원문을 어길 때만 유효)
- note: 한 줄 이유

JSON만 출력: {"identified": true|false|null, "claims": 0, "validClaims": 0, "note": "..."}

## 요청 원문
${TASK}

## 검사한 코드
\`\`\`ts
${code}
\`\`\`

## 판정서
${verdictText}`;
}

export function parseJudge(text = "") {
  try {
    const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return { identified: j.identified ?? null, claims: Number(j.claims) || 0, validClaims: Number(j.validClaims) || 0, note: String(j.note ?? "") };
  } catch {
    return undefined;
  }
}

function claude(prompt) {
  return new Promise((resolve) => {
    const p = spawn(CLAUDE_BIN, ["-p", prompt, "--model", "claude-sonnet-5-5", "--output-format", "json"], { cwd: tmpdir(), stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("close", () => { try { resolve(JSON.parse(out)); } catch { resolve({ result: out }); } });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const key = Object.fromEntries(JSON.parse(readFileSync(join(RUNS, "key.json"), "utf8")).map((k) => [k.id, k]));
  const { buildCases } = await import("./cases.mjs");
  const codeOf = Object.fromEntries(buildCases().map((c) => [c.id, c.code]));
  const jobs = readdirSync(RUNS).filter((d) => d.startsWith("case-")).flatMap((c) => readdirSync(join(RUNS, c)).map((v) => [c, v])).filter(([c, v]) => existsSync(join(RUNS, c, v, "final.md")) && !existsSync(join(RUNS, c, v, "judge.json")));
  let i = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (i < jobs.length) {
      const [c, v] = jobs[i++];
      const r = await claude(judgePrompt({ key: key[c], code: codeOf[c], verdictText: readFileSync(join(RUNS, c, v, "final.md"), "utf8") }));
      const j = parseJudge(r.result);
      writeFileSync(join(RUNS, c, v, "judge.json"), JSON.stringify({ ...(j ?? { error: "파싱 실패", raw: String(r.result).slice(0, 500) }), costUsd: r.total_cost_usd ?? null }, null, 2) + "\n");
      console.log(`${c} ${v}: ${j ? `identified=${j.identified} claims=${j.claims} valid=${j.validClaims}` : "파싱 실패"}`);
    }
  }));
}
