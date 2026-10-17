#!/usr/bin/env node
// Stop hook (조건 C): src/lab/lab.ts가 있으면 온톨로지 검사(pnpm onto:check)를 돌리고, 실패하면 끝내지 못하게 돌려보낸다.
// 통과할 때까지 막는다(두 번째에 그냥 보내 주지 않음). 실행 한도는 실행기가 정한다.
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

let input = {};
try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch {}
const dir = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
if (!existsSync(join(dir, "src/lab/lab.ts"))) process.exit(0);

const out = join(dir, ".git", "onto-check.json");
spawnSync("pnpm", ["exec", "vitest", "run", "agents/ontology", "--reporter=json", `--outputFile=${out}`], { cwd: dir, encoding: "utf8" });
let failed = [];
let ran = false;
try {
  const json = JSON.parse(readFileSync(out, "utf8"));
  for (const f of json.testResults ?? []) {
    if (f.status === "failed" && !(f.assertionResults ?? []).length) failed.push(`검사를 실행하지 못함: ${(f.message ?? "").split("\n")[0]}`);
    for (const t of f.assertionResults ?? []) {
      ran = true;
      if (t.status !== "passed") failed.push(`${t.title}\n${(t.failureMessages ?? []).join("\n").split("\n").filter((l) => !/^\s+at /.test(l)).slice(0, 8).join("\n")}`);
    }
  }
} catch {
  failed.push("검사 결과를 읽지 못함");
} finally {
  rmSync(out, { force: true });
}
try { appendFileSync(join(dir, ".git", "onto-stop.log"), JSON.stringify({ at: new Date().toISOString(), blocked: failed.length > 0, ran, failed: failed.map((f) => f.split("\n")[0]) }) + "\n"); } catch {}
if (failed.length === 0) process.exit(0);
const reason = `[온톨로지 검사] 끝내기 전에 agents/ontology/ontology.json의 불변식을 지키도록 src/lab/lab.ts를 고치세요 (pnpm onto:check로 확인):\n\n${failed.join("\n\n").slice(0, 6000)}`;
process.stdout.write(JSON.stringify({ decision: "block", reason }));
process.exit(0);
