import { describe, expect, it } from "vitest";
import { buildCases, shuffle, stripHeader, verdictOf } from "./cases.mjs";
import { parseJudge } from "./judge.mjs";
import { outsideHits, overlap, scoreVerifier } from "./summary.mjs";

describe("코드 묶음 (0036)", () => {
  const ref = "// 정답 구현 — 채점용\nconst a = Math.floor(x);\nconst b = 1;\n";
  const mutants = [{ name: "올림", find: "Math.floor(x)", replace: "Math.ceil(x)", expect: ["T01"] }];
  it("틀린 구현을 하나씩 심고 정상 3개를 더해 섞는다, 정답 표시 주석은 지운다", () => {
    const cases = buildCases(stripHeader(ref), mutants);
    expect(cases).toHaveLength(4);
    expect(cases.map((c) => c.id)).toEqual(["case-01", "case-02", "case-03", "case-04"]);
    expect(cases.filter((c) => c.defect === "D01")[0].code).toContain("Math.ceil");
    expect(cases.every((c) => !c.code.includes("정답 구현"))).toBe(true);
  });
  it("적용할 수 없는 틀린 구현은 오류", () => {
    expect(() => buildCases("x", mutants)).toThrow();
  });
  it("섞기는 시드가 같으면 같은 순서", () => {
    expect(shuffle([1, 2, 3, 4, 5])).toEqual(shuffle([1, 2, 3, 4, 5]));
  });
  it("판정 줄 — 제목·굵게 표시가 있어도 읽는다", () => {
    expect(verdictOf("## 판정: **rejected**")).toBe("rejected");
    expect(verdictOf("판정: approved\n### 근거")).toBe("approved");
    expect(verdictOf("判정: rejected")).toBe("rejected"); // Opus가 한자로 쓴 경우 (0036)
    expect(verdictOf("결론: 통과")).toBeUndefined();
  });
});

describe("판정·집계 (0036)", () => {
  it("채점 AI 답 파싱", () => {
    expect(parseJudge('설명 {"identified": true, "claims": 2, "validClaims": 1, "note": "x"}')).toEqual({ identified: true, claims: 2, validClaims: 1, note: "x" });
    expect(parseJudge("JSON 아님")).toBeUndefined();
  });
  it("검사자 성적 — 탐지·이유가 틀린 반려·오반려·정밀도", () => {
    const s = scoreVerifier([
      { defect: "D01", verdict: "rejected", judge: { identified: true, claims: 1, validClaims: 1 }, minutes: 1, costUsd: 0.2 },
      { defect: "D02", verdict: "rejected", judge: { identified: false, claims: 1, validClaims: 0 }, minutes: 2, costUsd: 0.4 },
      { defect: "D03", verdict: "approved", judge: { identified: false, claims: 0, validClaims: 0 }, minutes: 1 },
      { defect: null, verdict: "rejected", judge: { identified: null, claims: 1, validClaims: 0 }, minutes: 1 },
    ]);
    expect(s).toMatchObject({ planted: 3, rejected: 2, identified: 1, rejectedWrongReason: 1, approvedDefect: 1, clean: 1, cleanRejected: 1, cleanRejectedValid: 0, precision: 33, meanCostUsd: 0.3 });
  });
  it("겹침 — 둘 다·한쪽만·둘 다 놓침", () => {
    expect(overlap({ D01: true, D02: true, D03: false, D04: false }, { D01: true, D02: false, D03: true, D04: false })).toEqual({ both: ["D01"], onlyA: ["D02"], onlyB: ["D03"], neither: ["D04"] });
  });
  it("누출 감사 — 복사본 안 경로는 무시, 원본 저장소 경로는 잡는다", () => {
    const copy = "/var/folders/x/T/run-abc";
    expect(outsideHits(`cat ${copy}/src/pricing/coupon.ts`, copy)).toEqual([]);
    expect(outsideHits("cat /Users/chan/Documents/develop/harness-lab/experiments/role-split/reference/coupon.ts", copy)).toHaveLength(1);
  });
});
