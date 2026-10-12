import { describe, expect, it } from "vitest";
import { PROMPTS, taskPaths } from "./run.mjs";

describe("복사본 안 작업 번호 (0033)", () => {
  it("기본은 0030, 지정하면 그 번호로 브랜치·폴더·지시 문장이 바뀐다", () => {
    expect(taskPaths()).toEqual({ id: "0030", branch: "task/0030-points", spec: "agents/intent/specs/0030-points" });
    expect(taskPaths("0033").spec).toBe("agents/intent/specs/0033-points");
    expect(PROMPTS.A("과제", "0033")).toContain("작업 번호 0033");
    expect(PROMPTS.A("과제", "0033")).toContain("agents/intent/specs/0033-points/");
  });
  it("A 지시엔 \"모호하면 물어라\"가 없고 Q 지시엔 있다", () => {
    expect(PROMPTS.A("과제", "0033")).not.toContain("모호하면");
    expect(PROMPTS.Q("과제", "0033")).toContain("모호하면");
  });
  it("기존 호출(번호 없이)은 0030 그대로", () => {
    expect(PROMPTS.A("과제")).toContain("작업 번호 0030");
    expect(PROMPTS.AM("과제")).toBe(PROMPTS.A("과제"));
  });
});
