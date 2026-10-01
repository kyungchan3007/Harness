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

describe("머지 후 main에서 이슈 번호로 대상 찾기 (fix/0020)", async () => {
  const { mkdtempSync, mkdirSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { findFolderByIssue, mergedPrsOfTask, resolveTarget } = await import("./issue-sync.mjs");

  const dir = mkdtempSync(join(tmpdir(), "issue-sync-"));
  for (const [name, issue] of [["0014-verdict-flow", 16], ["0015-sample-task", 18]]) {
    mkdirSync(join(dir, "agents/intent/specs", name), { recursive: true });
    writeFileSync(join(dir, "agents/intent/specs", name, "prd.md"), `# x\n\n- **이슈:** #${issue}\n`);
  }

  it("이슈 번호로 폴더를 찾는다", () => {
    expect(findFolderByIssue(dir, "18")).toBe("0015-sample-task");
    expect(findFolderByIssue(dir, "99")).toBeUndefined();
  });

  it("main에서도 이슈 번호를 주면 대상이 정해진다", () => {
    expect(resolveTarget(dir, "main", "18")).toEqual({ folder: "0015-sample-task", taskId: "0015" });
    expect(resolveTarget(dir, "main", undefined).error).toContain("<이슈번호>");
    expect(resolveTarget(dir, "task/0014-verdict-flow", undefined).folder).toBe("0014-verdict-flow");
  });

  it("합쳐진 PR은 태스크 번호의 task/·fix/ 브랜치만, 최근 것 먼저", () => {
    const prs = [
      { number: 17, headRefName: "task/0014-verdict-flow" },
      { number: 19, headRefName: "task/0015-sample-task" },
      { number: 21, headRefName: "fix/0015-sample-fix" },
      { number: 3, headRefName: "main" },
    ];
    expect(mergedPrsOfTask(prs, "0015").map((p) => p.number)).toEqual([21, 19]);
  });
});

describe("인자 해석 (fix/0020)", async () => {
  const { parseArgs } = await import("./issue-sync.mjs");
  it("모드와 이슈 번호", () => {
    expect(parseArgs([])).toEqual({ mode: undefined, issueArg: undefined });
    expect(parseArgs(["--close", "#18"])).toEqual({ mode: "--close", issueArg: "18" });
    expect(parseArgs(["18", "--check"])).toEqual({ mode: "--check", issueArg: "18" });
  });
  it("모르는 인자는 기본 동작(이슈 수정)으로 흘려보내지 않고 오류", () => {
    expect(parseArgs(["--close 18"]).error).toContain("알 수 없는 인자");
    expect(parseArgs(["--clsoe"]).error).toContain("알 수 없는 인자");
  });
});
