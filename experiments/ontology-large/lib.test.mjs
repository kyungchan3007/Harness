import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { summarize } from "./lib.mjs";
import { FIXED_ANSWER, prompt, stubsLeft } from "./run.mjs";
import { aggregate } from "./summary.mjs";

const rules = [
  { id: "R9.3", group: "R9", class: "누락", tests: 2 },
  { id: "R10.3", group: "R10", class: "누락", tests: 1 },
  { id: "R10.4", group: "R10", class: "누락", tests: 1 },
  { id: "R9.1", group: "R9", class: "명시", tests: 1 },
];

describe("온톨로지 후속 실험 채점 (0038)", () => {
  it("규칙 점수 = 통과/예정, 규칙군 같은 가중 → 분류 평균, 예정≠실행이면 incomplete", () => {
    const ok = (passed) => ({ passed });
    const fresh = { "R9.3a 가": ok(true), "R9.3b 나": ok(false), "R10.3a 다": ok(true), "R9.1a 라": ok(true), "R9.10a 섞이면 안 됨": ok(false), "X01 시드 1": ok(true) };
    const legacy = { "R1b1 a": ok(true), "R2c1 b": ok(false), "D01 시드 1": ok(true) };
    const s = summarize(fresh, legacy, rules);
    expect(s.byRule["R9.3"]).toMatchObject({ planned: 2, ran: 2, passed: 1, score: 0.5 });
    expect(s.missing.groups).toEqual({ R9: 50, R10: 50 }); // R10 = (1 + 0)/2
    expect(s.missing.score).toBe(50);
    expect(s.missing.rulesAllPass).toBe(1);
    expect(s.explicit.score).toBe(100);
    expect(s.incomplete).toEqual(["R10.4 0/1"]);
    expect(s.regression).toMatchObject({ passed: 1, ran: 2 });
    expect(s.legacyDiff.passed).toBe(1);
    expect(s.diff.passed).toBe(1);
  });
  it("세 조건 같은 지시·고정 답 — 온톨로지 언급도, 새 정책도 없음", () => {
    expect(prompt("과제")).not.toMatch(/온톨로지|ontology/);
    expect(FIXED_ANSWER).not.toMatch(/온톨로지|ontology|격리|등급|만료|운송/);
  });
  it("미구현 표시가 남은 파일 수", () => {
    const d = mkdtempSync(join(tmpdir(), "stub-"));
    mkdirSync(join(d, "src/lab"), { recursive: true });
    writeFileSync(join(d, "src/lab/a.ts"), 'throw new Error("미구현: x");');
    writeFileSync(join(d, "src/lab/b.ts"), "export {};");
    expect(stubsLeft(d)).toBe(1);
  });
  it("모델/조건별 집계", () => {
    const cls = (score, groups = {}) => ({ score, groups, rulesAllPass: 0, rules: 9 });
    const row = (model, cond, m, extra = {}) => ({ id: `${model}-${cond}-1`, model, cond, missing: cls(m, { R9: m }), explicit: cls(100), combined: cls(100), regression: { passed: 45 }, legacyDiff: { passed: 20 }, diff: { passed: 20 }, invariants: { passed: true }, implemented: true, ontoReads: 0, docReads: { engine: 1, quality: 0 }, asked: 0, stopBlocks: 0, endedBlocked: false, costUsd: 1, minutes: 5, turns: 9, gatePassed: true, budgetHit: false, timedOut: false, apiError: false, tamper: [], outsideAccess: [], ...extra });
    const s = aggregate([row("haiku", "A", 50), row("haiku", "A", 100), row("sonnet", "CI", 100, { stopBlocks: 2 })]);
    expect(s["haiku/A"]).toMatchObject({ runs: 2, missing: 75, missingEach: [50, 100], perfect: 1, missingGroups: { R9: 75 }, docReads: [1, 1] });
    expect(s["sonnet/CI"].stopBlocks).toEqual([2]);
    expect(s["haiku/BI"]).toBeUndefined();
  });
});
