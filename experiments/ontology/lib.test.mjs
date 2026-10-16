import { describe, expect, it } from "vitest";
import { summarize, trapIds } from "./lib.mjs";
import { FIXED_ANSWER, prompt } from "./run.mjs";

describe("온톨로지 실험 채점 (0037)", () => {
  it("숨겨진 테스트 번호를 읽는다", () => {
    expect(trapIds('it("R1b1 가", ...); it("R8c3 나", ...); it("X 다")')).toEqual(["R1b1", "R8c3"]);
  });
  it("규칙군 같은 가중 평균 · 기본/조합 따로 · 결과에 없으면 실패", () => {
    const json = { testResults: [{ assertionResults: [
      { title: "R1b1 a", status: "passed" }, { title: "R1c1 b", status: "failed" },
      { title: "R2b1 c", status: "passed" }, { title: "R2c1 d", status: "passed" }, { title: "R2c2 e", status: "passed" },
    ] }] };
    const s = summarize(json, ["R1b1", "R1c1", "R2b1", "R2c1", "R2c2", "R2c3"]);
    expect(s.passed).toBe(4);
    expect(s.groupWeighted).toBe(62.5); // (R1 1/2 + R2 3/4) / 2
    expect(s.basic).toBe(1);
    expect(s.combo).toBe(0.5);
    expect(s.failed).toEqual(["R1c1", "R2c3"]);
  });
  it("세 조건 같은 지시·고정 답 — 온톨로지 언급 없음", () => {
    expect(prompt("과제")).not.toMatch(/온톨로지|ontology/);
    expect(FIXED_ANSWER).not.toMatch(/온톨로지|ontology/);
  });
});

import { assumptionLines, parseJudge } from "./judge.mjs";
import { aggregate } from "./summary.mjs";

describe("용어 혼동 채점·집계 (0037)", () => {
  it("인용 없는 구별·혼동은 언급 없음으로 내린다", () => {
    const j = parseJudge('앞말 {"pairs":[{"id":"P1","label":"구별","quote":"sampleId와 containerId를 따로"},{"id":"P2","label":"혼동","quote":""},{"id":"P3","label":"이상한값","quote":"x"}]}');
    expect(j.P1.label).toBe("구별");
    expect(j.P2.label).toBe("언급 없음");
    expect(j.P3.label).toBe("언급 없음");
    expect(j.P8.label).toBe("언급 없음");
    expect(parseJudge("JSON 아님")).toBeUndefined();
  });
  it("가정 칸 줄 수", () => {
    expect(assumptionLines("# x\n## 애매한 곳·가정\n- a — b (가정)\n- c — 확인 필요\n\n## Acceptance\n- [ ] y")).toEqual({ total: 2, assumed: 1, needConfirm: 1, none: false });
    expect(assumptionLines("## 애매한 곳·가정\n- 없음 — 원문에 다 있음\n").none).toBe(true);
  });
  it("조건별 집계", () => {
    const row = (cond, passed, extra = {}) => ({ cond, id: `${cond}-1`, implemented: true, hidden: { passed, total: 36, groupWeighted: (passed / 36) * 100, basic: 1, combo: 0.5, groups: { R1: { passed: 1, total: 2 } } }, invariants: { passed: passed === 36 }, asked: 0, costUsd: 0.5, minutes: 3, turns: 10, gatePassed: true, stopBlocks: 0, endedBlocked: false, budgetHit: false, apiError: false, tamper: [], outsideAccess: [], ...extra });
    const s = aggregate([row("A", 30), row("A", 36), row("C", 36, { stopBlocks: 2 })]);
    expect(s.A).toMatchObject({ runs: 2, hiddenPassed: [30, 36], allPass: 1, invariantsPassed: 1, groups: { R1: 50 } });
    expect(s.C.stopBlocks).toEqual([2]);
    expect(s.B).toBeUndefined();
  });
});
