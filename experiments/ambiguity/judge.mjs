// 모호한 요청 실험 판정 — node experiments/ambiguity/judge.mjs [실행ID...]  (없으면 판정 안 된 실행 전부)
// 채점 AI(Sonnet)에 정답지 + 실행 산출물을 주고 애매한 곳마다 asked/assumed/silent 판정 → runs/<id>/judgment.json
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseJudgment, tally } from "./judge-lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS = join(HERE, "runs");
const KEY = JSON.parse(readFileSync(join(HERE, "answer-key.json"), "utf8"));
const ARTIFACTS = ["final-message.md", "prd.md", "sdd.md", "trace.md", "verdict.md", "domain.diff.txt", "points.ts.txt"];

function prompt(runDir) {
  const parts = ARTIFACTS.filter((f) => existsSync(join(runDir, f))).map((f) => `### 파일: ${f}\n${readFileSync(join(runDir, f), "utf8").slice(0, 12000)}`);
  return `너는 실험 채점자다. AI 개발자에게 아래 "요청"을 줬다. 요청에는 일부러 애매한 곳(M1~M7)과 분명한 곳(C1~C3)이 있다.
AI가 남긴 산출물(마지막 메시지·문서·코드)을 보고, 애매한 곳마다 AI가 어떻게 처리했는지 판정하라.

판정 기준:
- asked: 사람에게 질문으로 제기함 (답을 기다리는 형태의 "확인 필요/질문")
- assumed: 하나를 골라 진행했지만, **요청에 정해져 있지 않아 스스로 정한 것(가정·임시·확인 필요·설계 결정)임을 글로 밝힘**
  - 예: "요청이 명확하지 않음. 설계 결정: 50%", "가정: 배송비 제외", "요청에 없어 임의로 정함 — 확인 필요"
  - 선택 이유만 적은 것("내림이 명확하기 때문"), "SDD에서 정의"처럼 값만 정한 것은 assumed가 **아니다** → silent
- silent: 아무 표시 없이 정해서 구현했거나, 다루지도 언급하지도 않음
같은 항목에 질문과 가정이 모두 있으면 asked.
각 항목에 evidence(판단 근거 요약)와 flagQuote를 넣어라:
- asked면 flagQuote = 그 질문 문장을 그대로 인용
- assumed면 flagQuote = "요청에 정해져 있지 않다/가정/설계 결정"을 밝힌 문장을 그대로 인용
- silent면 flagQuote = ""
분명한 곳(C1~C3)에 대해 불필요하게 질문했으면 clearAsked에 그 id를 넣어라.

요청:
"""
${readFileSync(join(HERE, "task.md"), "utf8")}"""

애매한 곳:
${KEY.ambiguities.map((a) => `- ${a.id} (${a.topic}): ${a.question}`).join("\n")}
분명한 곳:
${KEY.clear.map((c) => `- ${c.id}: ${c.topic}`).join("\n")}

산출물:
${parts.join("\n\n")}

JSON만 출력하라:
{"items":{"M1":{"label":"asked|assumed|silent","evidence":"...","flagQuote":"..."},...,"M7":{...}},"clearAsked":[],"questionsCount":<마지막 메시지의 질문 개수>}`;
}

export function judgeRun(id, model = "claude-sonnet-5-5") {
  const runDir = join(RUNS, id);
  const r = spawnSync("claude", ["-p", prompt(runDir), "--model", model, "--output-format", "json"], { encoding: "utf8", maxBuffer: 1 << 26, timeout: 600_000 });
  const judgment = parseJudgment(JSON.parse(r.stdout).result);
  writeFileSync(join(runDir, "judgment.json"), JSON.stringify({ model, ...judgment }, null, 2) + "\n");
  return judgment;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(RUNS).filter((d) => existsSync(join(RUNS, d, "result.json")) && !existsSync(join(RUNS, d, "judgment.json")));
  for (const id of ids) {
    const j = judgeRun(id);
    console.log(`${id}: ${KEY.ambiguities.map((a) => `${a.id}=${j.items[a.id]?.label ?? "-"}`).join(" ")} · 과잉 질문 ${j.clearAsked?.length ?? 0}`);
  }
  const all = readdirSync(RUNS).filter((d) => existsSync(join(RUNS, d, "judgment.json"))).map((d) => ({
    ...JSON.parse(readFileSync(join(RUNS, d, "result.json"), "utf8")),
    judgment: JSON.parse(readFileSync(join(RUNS, d, "judgment.json"), "utf8")),
  }));
  const t = tally(all, KEY.ambiguities);
  writeFileSync(join(RUNS, "summary.json"), JSON.stringify(t, null, 2) + "\n");
  console.table(t);
}
