import { describe, expect, it } from "vitest";
import { acceptanceSection, parseChecklist, taskStatus } from "../hooks/lib/records.mjs";
import { compareChecklists, replaceIssueAcceptance } from "./issue-sync.mjs";

const ISSUE = "## 왜\n설명\n\n## Acceptance\n- [ ] A 항목\n- [x] B 항목\n\n## 예상 허점\n- 의심\n";

describe("체크박스 동기화", () => {
  it("이슈의 ## Acceptance만 prd 목록으로 교체하고 다른 섹션은 보존한다", () => {
    const prd = [{ text: "A 항목", checked: true }, { text: "C 항목", checked: false }];
    const out = replaceIssueAcceptance(ISSUE, prd);
    expect(parseChecklist(acceptanceSection(out)).map((i) => [i.text, i.checked])).toEqual([["A 항목", true], ["C 항목", false]]);
    expect(out).toContain("## 왜\n설명");
    expect(out).toContain("## 예상 허점\n- 의심");
  });

  it("Acceptance 섹션이 없으면 끝에 추가한다", () => {
    expect(replaceIssueAcceptance("본문만", [{ text: "A", checked: false }])).toBe("본문만\n\n## Acceptance\n- [ ] A\n");
  });

  it("어긋남: 없는 항목·상태 다름을 찾고, 공백 차이는 무시한다", () => {
    const prd = parseChecklist("- [x] A 항목\n- [ ] C  항목");
    const issue = parseChecklist("- [ ] A 항목\n- [ ] C 항목\n- [ ] D");
    expect(compareChecklists(prd, issue)).toEqual(["상태 다름 (prd 체크 / 이슈 미체크): A 항목", "prd에 없음: D"]);
    expect(compareChecklists(prd, parseChecklist("- [x] A 항목\n- [ ] C 항목"))).toEqual([]);
  });

  it("TASKS.md에서 태스크 상태를 읽는다", () => {
    const tasks = "| ID | 제목 | owner | status | spec |\n| --- | --- | --- | --- | --- |\n| 0020 | x | claude | done | [0020](a) · #12 |\n";
    expect(taskStatus(tasks, "0020")).toBe("done");
    expect(taskStatus(tasks, "0099")).toBeUndefined();
  });
});
