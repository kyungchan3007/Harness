// 의도 일치 채점(0027) — node experiments/ambiguity/score-intent.mjs [실행ID...] [--from 다른 runs 폴더]  (없으면 구현이 있고 채점 안 된 실행 전부)
// 구현마다 함수 모양이 달라서: 채점 AI가 "연결 파일"(값 전달만)을 쓰고 → 계산이 섞였는지 검사 → 숨겨진 테스트(요청자 의도) 실행
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareCopy, REPO_ROOT } from "../role-split/lib.mjs";
import { plumbingProblems, summarizeOracle } from "./intent-lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS = join(HERE, "runs");
const ORACLE = join(HERE, "oracle", "points.oracle.ts");
const TITLES = [...readFileSync(ORACLE, "utf8").matchAll(/it\("([^"]+)"/g)].map((m) => m[1]);
const DOCS = ["prd.md", "sdd.md", "domain.diff.txt"];

function adapterPrompt(runDir, impl, priceCart, problems) {
  const docs = DOCS.filter((f) => existsSync(join(runDir, f))).map((f) => `### ${f}\n${readFileSync(join(runDir, f), "utf8").slice(0, 6000)}`).join("\n\n");
  return `너는 테스트용 연결 파일을 쓰는 사람이다. 아래 구현(src/pricing/points.ts)을 고정된 모양으로 부를 수 있게 src/pricing/points.adapter.ts를 써라.

만들 함수: export function earn(breakdown: PriceBreakdown, member: { grade: "VIP" | "NORMAL" }): number
- PriceBreakdown은 "./price-cart.js"에서 import (subtotal·discount·shipping·total)
- 구현의 함수를 import해서 **값만 전달**한다. 구현의 입력 이름·주석·문서(prd·sdd·도메인 규칙)가 뜻하는 값을 그대로 넣는다.
  - 예: 입력 이름이 total이고 문서에 "결제 금액(total)"이면 breakdown.total, "할인 후 상품 금액"이면 breakdown.subtotal - breakdown.discount
  - 쿠폰 사용 여부를 따로 받으면 breakdown.discount > 0, VIP 여부를 따로 받으면 member.grade === "VIP", 등급 문자열이 다르면 그 값으로 바꿔 넣는다
- **계산 금지:** 곱셈·나눗셈·Math·0이 아닌 숫자를 쓰지 않는다. 적립률·끝수 처리는 전부 구현이 한다. 구현이 어떤 경우를 다루지 못하면 다루지 못하는 대로 둔다(고치지 않는다).
- 구현이 오류를 던지면 그대로 둔다.
${problems ? `\n지난번 연결 파일에 계산이 섞였다(${problems.join(", ")}). 계산 없이 다시 써라.\n` : ""}
### src/pricing/price-cart.ts
${priceCart}

### src/pricing/points.ts
${impl}

${docs}

TypeScript 코드만 출력하라(설명·코드 펜스 없이).`;
}

const stripFence = (t) => t.replace(/^```\w*\n?/m, "").replace(/\n?```\s*$/m, "").trim() + "\n";

export function scoreIntent(id, model = "claude-sonnet-5-5") {
  const runDir = join(RUNS, id);
  const impl = readFileSync(join(runDir, "points.ts.txt"), "utf8");
  const { dir } = prepareCopy({ install: false });
  symlinkSync(join(REPO_ROOT, "node_modules"), join(dir, "node_modules"));
  try {
    writeFileSync(join(dir, "src/pricing/points.ts"), impl);
    const priceCart = readFileSync(join(dir, "src/pricing/price-cart.ts"), "utf8");
    let adapter, problems;
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = spawnSync("claude", ["-p", adapterPrompt(runDir, impl, priceCart, problems), "--model", model, "--output-format", "json"], { cwd: tmpdir(), encoding: "utf8", maxBuffer: 1 << 26, timeout: 600_000 }); // 저장소 hook(기록 강제)이 끼지 않게 빈 곳에서
      adapter = stripFence(JSON.parse(r.stdout).result);
      problems = plumbingProblems(adapter);
      if (!problems.length) break;
    }
    writeFileSync(join(runDir, "points.adapter.ts.txt"), adapter);
    if (problems.length) return save(runDir, { adapterRejected: problems, ...summarizeOracle(null, TITLES) });

    writeFileSync(join(dir, "src/pricing/points.adapter.ts"), adapter);
    cpSync(ORACLE, join(dir, "src/pricing/points.oracle.test.ts"));
    const outFile = join(dir, ".oracle.json");
    const v = spawnSync("pnpm", ["exec", "vitest", "run", "src/pricing/points.oracle.test.ts", "--reporter=json", `--outputFile=${outFile}`], { cwd: dir, encoding: "utf8" });
    const json = existsSync(outFile) ? JSON.parse(readFileSync(outFile, "utf8")) : null;
    const loadError = json?.testResults?.[0]?.message || (json ? "" : v.stderr.slice(-1500));
    return save(runDir, { ...summarizeOracle(json, TITLES), ...(loadError ? { loadError } : {}) });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function save(runDir, s) {
  writeFileSync(join(runDir, "intent-score.json"), JSON.stringify(s, null, 2) + "\n");
  return s;
}

/** 다른 브랜치(0025·0026)의 실행도 같은 기준으로 — 채점에 쓰는 산출물만 runs/cross/<id>/로 복사해 채점 */
const CROSS_FILES = ["points.ts.txt", ...DOCS, "result.json", "judgment.json"];
function importRun(fromDir, id) {
  const dest = join(RUNS, "cross", id);
  mkdirSync(dest, { recursive: true });
  for (const f of CROSS_FILES) if (existsSync(join(fromDir, id, f))) cpSync(join(fromDir, id, f), join(dest, f));
  return `cross/${id}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fromAt = process.argv.indexOf("--from");
  const from = fromAt >= 0 ? process.argv.splice(fromAt, 2)[1] : null;
  if (from) process.argv.splice(2, process.argv.length, ...process.argv.slice(2).map((id) => importRun(from, id)));
  const ids = process.argv.slice(2).length
    ? process.argv.slice(2)
    : readdirSync(RUNS).filter((d) => existsSync(join(RUNS, d, "points.ts.txt")) && !existsSync(join(RUNS, d, "intent-score.json")));
  for (const id of ids) {
    const s = scoreIntent(id);
    console.log(`${id}: ${s.score}/${s.total} ${Object.entries(s.items).map(([m, ok]) => `${m}${ok ? "✓" : "✗"}`).join(" ")}${s.adapterRejected ? ` (연결 파일 거부: ${s.adapterRejected})` : ""}${s.loadError ? " (불러오기 실패)" : ""}`);
  }
}
