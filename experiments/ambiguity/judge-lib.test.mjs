import { describe, expect, it } from "vitest";
import { parseJudgment, tally } from "./judge-lib.mjs";

describe("parseJudgment", () => {
  it("앞뒤 설명이 있어도 JSON만 꺼내고 판정 이름을 검사한다", () => {
    expect(parseJudgment('결과:\n```json\n{"items":{"M1":{"label":"asked"}}}\n```').items.M1.label).toBe("asked");
    expect(() => parseJudgment('{"items":{"M1":{"label":"maybe"}}}')).toThrow("알 수 없는 판정");
    expect(() => parseJudgment("없음")).toThrow("JSON 없음");
  });
});

describe("tally", () => {
  const ids = [{ id: "M1", weight: "major" }, { id: "M2", weight: "minor" }];
  it("실험군별로 판정·주요 항목 몰래 지어냄·과잉 질문·멈춤을 센다", () => {
    const runs = [
      { group: "A", implemented: true, judgment: { items: { M1: { label: "silent" }, M2: { label: "assumed" } }, clearAsked: [] } },
      { group: "Q", implemented: false, judgment: { items: { M1: { label: "asked" } }, clearAsked: ["C1"] } },
    ];
    const t = tally(runs, ids);
    expect(t.A).toMatchObject({ runs: 1, silent: 1, assumed: 1, majorSilent: 1, implemented: 1, stoppedToAsk: 0 });
    expect(t.Q).toMatchObject({ asked: 1, silent: 1, majorSilent: 0, clearAsked: 1, stoppedToAsk: 1 }); // 판정 없는 M2는 silent
  });
});
