import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stripExperimentHooks } from "./lib.mjs";

describe("stripExperimentHooks — 복사본에서 실험 폴더 연결 빼기", () => {
  it("게이트의 실험 줄과 실험 폴더를 부르는 pnpm 스크립트만 지운다", () => {
    const dir = mkdtempSync(join(tmpdir(), "strip-"));
    mkdirSync(join(dir, "agents/harness/evals"), { recursive: true });
    writeFileSync(join(dir, "agents/harness/evals/checks.sh"), 'run "A" a\nrun "X" node experiments/x.mjs\nrun "B" b\n');
    writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { test: "vitest run", "exp:x": "node experiments/x.mjs" } }));
    stripExperimentHooks(dir);
    expect(readFileSync(join(dir, "agents/harness/evals/checks.sh"), "utf8")).toBe('run "A" a\nrun "B" b\n');
    expect(JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).scripts).toEqual({ test: "vitest run" });
  });
});
