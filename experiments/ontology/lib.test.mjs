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
