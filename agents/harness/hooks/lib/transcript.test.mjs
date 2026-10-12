import { describe, expect, it } from "vitest";
import { answerBacked, humanMessages, typedText } from "./transcript.mjs";

const user = (content, extra = {}) => JSON.stringify({ type: "user", uuid: extra.uuid ?? Math.random().toString(36), message: { role: "user", content }, ...extra });

describe("사람 메시지 (0034)", () => {
  it("직접 친 글만, 도구 결과·메타·대화 요약·보조 에이전트·중복 uuid 제외", () => {
    const lines = [
      user("배송비 기능 만들어 주세요"),
      user([{ type: "tool_result", content: "[확인 필요] 차단" }]),
      user("시스템 안내", { isMeta: true }),
      user("이전 대화 요약", { isCompactSummary: true }),
      user("보조 에이전트에게", { isSidechain: true }),
      JSON.stringify({ type: "assistant", message: { content: "질문입니다" } }),
      user("도서산간은 3,000원입니다", { uuid: "u1" }),
      user("도서산간은 3,000원입니다", { uuid: "u1" }),
      "깨진 줄",
    ];
    expect(humanMessages(lines)).toEqual(["배송비 기능 만들어 주세요", "도서산간은 3,000원입니다"]);
  });
  it("셸 출력·시스템 안내 태그는 걷어 낸다", () => {
    expect(typedText("<system-reminder>x</system-reminder>제주 포함")).toBe("제주 포함");
  });
});

describe("답 대조 (0034)", () => {
  const replies = ["1. 도서산간은 3,000원입니다.\n2. 제주도는 포함하고, 묶음 배송은 절반으로 할인합니다."];
  it("숫자는 모두 있어야", () => {
    expect(answerBacked("3,000원", replies)).toBe(true);
    expect(answerBacked("3000원", replies)).toBe(false);
    expect(answerBacked("5,000원", replies)).toBe(false);
  });
  it("숫자가 없으면 낱말 절반 이상 (끝 조사 한 글자 허용)", () => {
    expect(answerBacked("제주도 포함", replies)).toBe(true);
    expect(answerBacked("묶음 배송 절반", replies)).toBe(true);
    expect(answerBacked("섬 지역 전부 제외", replies)).toBe(false);
  });
  it("사람 답이 없으면 통과 못 함", () => {
    expect(answerBacked("3,000원", [])).toBe(false);
  });
});
