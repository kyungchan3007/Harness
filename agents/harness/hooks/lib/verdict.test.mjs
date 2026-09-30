import { describe, expect, it } from "vitest";
import { parseVerdict, verdictStatus } from "./verdict.mjs";

const round = (n, verdict, { reasons = [], checked = [] } = {}) =>
  `## ${n}차 · 2026-09-30\n판정: ${verdict}\n### 근거\n${reasons.map((r) => `- ${r}`).join("\n")}\n### 확인한 것\n${checked.map((c) => `- ${c}`).join("\n")}\n`;
const REJECT = { reasons: ["배송비 규칙 2 — 입력: 할인 후 50,000원 / 기대: 0원 / 실제: 3,000원"] };
const APPROVE = { checked: ["pnpm check 통과", "경계값 49,999 / 50,000 직접 계산"] };

describe("판정서", () => {
  it("검사 전이면 검사자 차례", () => {
    expect(verdictStatus(parseVerdict(""))).toMatchObject({ next: "verifier", rejections: 0, problems: [] });
  });

  it("반려 → 구현자 차례, 통과 → 완료", () => {
    const one = parseVerdict(round(1, "rejected", REJECT));
    expect(verdictStatus(one)).toMatchObject({ next: "builder", rejections: 1, problems: [] });
    const two = parseVerdict(round(1, "rejected", REJECT) + round(2, "approved", APPROVE));
    expect(verdictStatus(two)).toMatchObject({ next: "done", rejections: 1, problems: [] });
  });

  it("반려 2회까지는 구현자 차례, 3회째 반려면 막힘", () => {
    const two = parseVerdict(round(1, "rejected", REJECT) + round(2, "rejected", REJECT));
    expect(verdictStatus(two).next).toBe("builder");
    const three = parseVerdict(round(1, "rejected", REJECT) + round(2, "rejected", REJECT) + round(3, "rejected", REJECT));
    expect(verdictStatus(three).next).toBe("blocked");
  });

  it("근거 없는 반려, 기대/실제 없는 근거, 확인한 것 없는 통과는 무효", () => {
    expect(verdictStatus(parseVerdict(round(1, "rejected"))).problems[0]).toContain("근거 항목이 없습니다");
    expect(verdictStatus(parseVerdict(round(1, "rejected", { reasons: ["그냥 틀림"] }))).problems[0]).toContain("기대");
    expect(verdictStatus(parseVerdict(round(1, "approved"))).problems[0]).toContain("확인한 것");
  });

  it("템플릿의 안내 문장은 내용으로 치지 않는다, 판정 줄이 없거나 회차가 어긋나면 문제", () => {
    const tpl = "## 1차 · YYYY-MM-DD\n판정: approved\n### 근거\n- (반려일 때 필수) …\n### 확인한 것\n- (통과일 때 필수) …\n";
    expect(verdictStatus(parseVerdict(tpl)).problems[0]).toContain("확인한 것");
    expect(verdictStatus(parseVerdict("## 1차 · x\n판정 없음\n")).problems[0]).toContain("판정:");
    expect(verdictStatus(parseVerdict(round(2, "approved", APPROVE))).problems[0]).toContain("회차 번호");
  });
});
