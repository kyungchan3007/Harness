import { describe, expect, it } from "vitest";
import { isWaitingForAnswer, plumbingProblems, summarizeOracle, testIds } from "./intent-lib.mjs";

describe("연결 파일 검사 (값 전달만)", () => {
  it("필드 옮기기·뺄셈·비교는 허용", () => {
    expect(plumbingProblems(`import { calc } from "./points.js";\nexport function earn(b, m) { return calc({ amount: b.subtotal - b.discount, vip: m.grade === "VIP", coupon: b.discount > 0 }); }`)).toEqual([]);
  });
  it("곱셈·Math·0이 아닌 숫자는 계산으로 본다 (주석·문자열 안은 무시)", () => {
    expect(plumbingProblems("export const earn = (b) => calc(b.total * 2); // 2배")).toEqual(["곱셈·나눗셈·나머지 연산", "0이 아닌 숫자"]);
    expect(plumbingProblems("export const earn = (b) => Math.floor(calc(b));")).toEqual(["Math 사용"]);
    expect(plumbingProblems('// 1% 적립\nexport const earn = (b) => calc(b, "VIP2");')).toEqual([]);
  });
});

describe("채점 결과 정리", () => {
  const titles = ["T1 기준 금액은 배송비 제외 (M1)", "T3 쿠폰 주문은 절반 (M3·M4)"];
  it("테스트 이름에서 T번호와 애매한 곳을 꺼낸다", () => {
    expect(testIds(titles[1])).toEqual({ t: "T3", items: ["M3", "M4"] });
  });
  it("통과한 테스트로 항목별 일치를 낸다, 결과가 없으면 0점", () => {
    const json = { testResults: [{ assertionResults: [{ title: titles[0], status: "failed" }, { title: titles[1], status: "passed" }] }] };
    expect(summarizeOracle(json, titles)).toEqual({ passed: ["T3"], total: 2, score: 1, items: { M1: false, M3: true, M4: true } });
    expect(summarizeOracle(null, titles).score).toBe(0);
  });
});

describe("답을 기다리는지", () => {
  it("구현 없이 질문으로 끝나면 기다림, 구현했으면 아님", () => {
    expect(isWaitingForAnswer({ implemented: false, finalMessage: "쿠폰 감액은 몇 %인가요?" })).toBe(true);
    expect(isWaitingForAnswer({ implemented: true, finalMessage: "몇 %인가요?" })).toBe(false);
    expect(isWaitingForAnswer({ implemented: false, finalMessage: "문서를 작성했습니다." })).toBe(false);
  });
});

describe("요청자 답장 만들기", async () => {
  const { composeAnswer } = await import("./intent-lib.mjs");
  const intent = { answers: { M1: "배송비 제외.", M3: "절반." }, interface: "입력은 PriceBreakdown.", unknown: "알아서 정해 주세요." };
  it("분류된 항목의 답만, 없는 항목·분류 없음은 '알아서'", () => {
    expect(composeAnswer([{ n: 1, items: ["M3"] }, { n: 2, items: [] }, { n: 3, items: ["M9"] }], intent)).toEqual({
      answer: "1. 절반.\n2. 알아서 정해 주세요.\n3. 알아서 정해 주세요.", usedItems: ["M3"], usedInterface: false,
    });
  });
  it("입력 모양을 물으면 인터페이스 문장", () => {
    expect(composeAnswer([{ n: 1, items: [], interface: true }], intent)).toEqual({ answer: "1. 입력은 PriceBreakdown.", usedItems: [], usedInterface: true });
  });
});

describe("단계별 사용량 (0029)", () => {
  it("claude -p 결과에서 비용·요청 수·토큰을 꺼내고, 없으면 0", async () => {
    const { phaseUsage } = await import("./interactive.mjs");
    expect(phaseUsage({ total_cost_usd: 0.5, num_turns: 4, usage: { input_tokens: 1, cache_creation_input_tokens: 2, cache_read_input_tokens: 3, output_tokens: 4 } }))
      .toEqual({ costUsd: 0.5, turns: 4, input: 1, cacheWrite: 2, cacheRead: 3, output: 4 });
    expect(phaseUsage({ result: "API Error" })).toEqual({ costUsd: 0, turns: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0 });
  });
});
