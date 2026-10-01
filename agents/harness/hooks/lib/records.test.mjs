import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { describeSession } from "../session-context.mjs";
import { checkBeforeStop, checkPrd, checkSdd, checkTrace, decideEdit, decideRequest, decideRole, hasReadRequest, inspectTask, isFixBranch, isRecordPath, issueNumberOf, ownersOf, parseTaskId } from "./records.mjs";

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), "../../../intent/templates");
const template = (name) => readFileSync(join(TEMPLATES, name), "utf8");

const FILLED_PRD = "# 0042 — 추가 배송비 — PRD\n\n- **이슈:** #12\n\n## Acceptance\n- [ ] 도서산간 3,000원 추가\n";
const FILLED_SDD = "# 0042 — SDD\n\n## 설계\n- **접근:** 배송 정책에 지역 가산 추가\n- **대안·트레이드오프:**\n  - 지역 테이블 분리: 과함 → 기각\n- **검증 계획:** 경계값 테스트\n";
const FILLED_TRACE = "# 0042 — Trace\n\n| 순서 | 단계 | 한 일 | 판단·이유 |\n| --- | --- | --- | --- |\n| 1 | CLAIM | 브랜치 생성 | - |\n";

let repo;
const git = (...args) => execFileSync("git", ["-C", repo, ...args], { stdio: "pipe" });
const write = (rel, text) => {
  mkdirSync(dirname(join(repo, rel)), { recursive: true });
  writeFileSync(join(repo, rel), text);
};
const TASK = "agents/intent/specs/0042-extra-shipping";

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "records-"));
  git("init", "-q", "-b", "main");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  write("src/a.ts", "export {};\n");
  write("agents/orchestration/TASKS.md", "| ID | 제목 |\n| --- | --- |\n");
  git("add", "-A");
  git("commit", "-qm", "init");
});

const fillTask = ({ trace = true } = {}) => {
  write(`${TASK}/prd.md`, FILLED_PRD);
  write(`${TASK}/sdd.md`, FILLED_SDD);
  if (trace) write(`${TASK}/trace.md`, FILLED_TRACE);
  write("agents/orchestration/TASKS.md", "| ID | 제목 |\n| --- | --- |\n| 0042 | 추가 배송비 |\n");
};

describe("템플릿 탐지", () => {
  it("실제 템플릿 파일은 모두 미완으로 판정한다", () => {
    expect(checkPrd(template("prd.md"), "0042")).toHaveLength(3); // 제목 · Acceptance · 이슈 번호("#번호" 자리표시)
    expect(checkSdd(template("sdd.md"))).toHaveLength(3);
    expect(checkTrace(template("trace.md"))).toHaveLength(1);
  });

  it("채운 문서는 통과한다 (sdd 하위 불릿 형식 포함)", () => {
    expect(checkPrd(FILLED_PRD, "0042")).toEqual([]);
    expect(checkSdd(FILLED_SDD)).toEqual([]);
    expect(checkTrace(FILLED_TRACE)).toEqual([]);
  });

  it("과정 기록 누락 표기는 0008 이전 태스크만 허용한다", () => {
    const omitted = "# 0001 — Trace\n\n> **과정 기록 누락:** trace 제도 도입 전 태스크\n";
    expect(checkTrace(omitted, "0001")).toEqual([]);
    expect(checkTrace(omitted, "0007")).toEqual([]);
    expect(checkTrace(omitted, "0008")).toHaveLength(1);
    expect(checkTrace(omitted, "0042")[0]).toContain("0008 이전 태스크만");
  });

  it("sdd 하위 항목은 번호 목록도 인정한다", () => {
    const numbered = "- **접근:**\n  1. 서브에이전트로 역할 정의\n- **대안·트레이드오프:** 없음\n- **검증 계획:** e2e\n";
    expect(checkSdd(numbered)).toEqual([]);
  });

  it("0021부터 prd에 이슈 번호가 필수, 이전 태스크는 면제", () => {
    const noIssue = FILLED_PRD.replace("- **이슈:** #12\n", "");
    expect(checkPrd(noIssue, "0042")[0]).toContain("gh issue develop");
    expect(checkPrd(noIssue.replace("# 0042", "# 0019"), "0019")).toEqual([]);
    expect(issueNumberOf(FILLED_PRD)).toBe("12");
    expect(issueNumberOf("- **이슈:** #번호")).toBeUndefined();
  });

  it("fix 브랜치는 원 태스크 번호로 인식한다", () => {
    expect(parseTaskId("task/0042-extra")).toBe("0042");
    expect(parseTaskId("fix/0042-rounding")).toBe("0042");
    expect(parseTaskId("feature/0042-x")).toBeUndefined();
    expect(isFixBranch("fix/0042-rounding")).toBe(true);
    expect(isFixBranch("task/0042-extra")).toBe(false);
  });

  it("다른 태스크 번호의 제목은 미완이다", () => {
    expect(checkPrd(FILLED_PRD, "0043")).toHaveLength(1);
  });

  it("기록 경로를 구분한다", () => {
    expect(isRecordPath("agents/intent/specs/0042-x/prd.md")).toBe(true);
    expect(isRecordPath("agents/orchestration/TASKS.md")).toBe(true);
    expect(isRecordPath("src/a.ts")).toBe(false);
    expect(isRecordPath("agents/harness/hooks/guard.mjs")).toBe(false);
  });
});

describe("PreToolUse: decideEdit", () => {
  it("main에서 코드 수정은 차단하고 해야 할 일을 알려준다", () => {
    const d = decideEdit(repo, "src/a.ts");
    expect(d.allow).toBe(false);
    expect(d.reason).toContain("task/NNNN-슬러그");
  });

  it("기록 경로와 프로젝트 밖 파일은 언제나 허용한다", () => {
    expect(decideEdit(repo, `${TASK}/prd.md`).allow).toBe(true);
    expect(decideEdit(repo, "../other/x.ts").allow).toBe(true);
  });

  it("태스크 브랜치여도 폴더가 없으면 차단한다", () => {
    git("checkout", "-qb", "task/0042-extra-shipping");
    expect(decideEdit(repo, "src/a.ts").reason).toContain("폴더가 없습니다");
  });

  it("템플릿 그대로면 차단하고, 채우면 허용한다 (trace는 코드 전에 요구하지 않음)", () => {
    git("checkout", "-qb", "task/0042-extra-shipping");
    write(`${TASK}/prd.md`, template("prd.md"));
    write(`${TASK}/sdd.md`, template("sdd.md"));
    expect(decideEdit(repo, "src/a.ts").allow).toBe(false);

    fillTask({ trace: false });
    expect(decideEdit(repo, "src/a.ts")).toEqual({ allow: true });
  });

  it("TASKS.md 행이 없으면 차단한다", () => {
    git("checkout", "-qb", "task/0042-extra-shipping");
    fillTask();
    write("agents/orchestration/TASKS.md", "| ID | 제목 |\n| --- | --- |\n");
    expect(decideEdit(repo, "src/a.ts").reason).toContain("0042 행이 없습니다");
  });
});

describe("done 작업의 체크박스 방치 금지", () => {
  it("TASKS가 done인데 사유 없는 미체크가 있으면 문제, 사유가 있으면 통과", () => {
    const tasksDone = "| ID | 제목 | owner | status | spec |\n| --- | --- | --- | --- | --- |\n| 0042 | x | c | done | - |\n";
    write(`${TASK}/prd.md`, FILLED_PRD);
    write(`${TASK}/sdd.md`, FILLED_SDD);
    write(`${TASK}/trace.md`, FILLED_TRACE);
    write("agents/orchestration/TASKS.md", tasksDone);
    expect(inspectTask(repo, "0042-extra-shipping").join("\n")).toContain("사유 없이 미체크");
    write(`${TASK}/prd.md`, FILLED_PRD.replace("- [ ] 도서산간 3,000원 추가", "- [ ] 도서산간 3,000원 추가 (후속 #13)"));
    expect(inspectTask(repo, "0042-extra-shipping")).toEqual([]);
    write(`${TASK}/prd.md`, FILLED_PRD.replace("- [ ]", "- [x]"));
    expect(inspectTask(repo, "0042-extra-shipping")).toEqual([]);
  });
});

describe("역할 분리 작업의 판정서 (0014)", () => {
  const V_REJECT = "## 1차 · 2026-09-30\n판정: rejected\n### 근거\n- 규칙 2 — 입력: 50,000원 / 기대: 0원 / 실제: 3,000원\n";
  const V_REJECT_SRC = V_REJECT + "### 원문 대조\n- 원문 \"도서산간 3,000원\" ↔ 구현\n";
  const V_OK = V_REJECT_SRC + "## 2차 · 2026-09-30\n판정: approved\n### 확인한 것\n- pnpm check 통과\n### 원문 대조\n- 원문 규칙 전부 대조\n";
  const done = "| ID | 제목 | owner | status | spec |\n| --- | --- | --- | --- | --- |\n| 0042 | x | c | done | - |\n";
  const prep = (verdict) => {
    write(`${TASK}/prd.md`, FILLED_PRD.replace("- [ ]", "- [x]").replace("## Acceptance", "- **역할 분리:** on\n\n## Acceptance"));
    write(`${TASK}/sdd.md`, FILLED_SDD);
    write(`${TASK}/trace.md`, FILLED_TRACE);
    write("agents/orchestration/TASKS.md", done);
    write(`${TASK}/request.md`, "# 원문 — 이슈 #12\n\n도서산간 3,000원 추가\n");
    if (verdict) write(`${TASK}/verdict.md`, verdict);
  };

  it("역할 분리 작업이 done인데 판정서가 없거나 반려 상태면 실패", () => {
    prep();
    expect(inspectTask(repo, "0042-extra-shipping").join("\n")).toContain("판정이 통과가 아닙니다");
    prep(V_REJECT_SRC);
    expect(inspectTask(repo, "0042-extra-shipping").join("\n")).toContain("구현자 차례");
  });

  it("최신 판정이 통과면 통과, 판정서 형식 오류는 실패", () => {
    prep(V_OK);
    expect(inspectTask(repo, "0042-extra-shipping")).toEqual([]);
    prep("## 1차 · x\n판정: rejected\n");
    expect(inspectTask(repo, "0042-extra-shipping").join("\n")).toContain("verdict.md: 1차: 반려인데");
  });
});

describe("역할별 권한 (0013)", () => {
  const SPEC = "agents/intent/specs/0042-x";
  const cases = [
    // [역할, 경로, 허용?]
    ["designer", `${SPEC}/prd.md`, true],
    ["designer", "agents/context/domain.md", true],
    ["designer", "agents/orchestration/TASKS.md", true],
    ["designer", "src/money.ts", false],
    ["designer", `${SPEC}/verdict.md`, false],
    ["builder", "src/cart/cart.ts", true],
    ["builder", `${SPEC}/trace.md`, true],
    ["builder", `${SPEC}/prd.md`, false],
    ["builder", `${SPEC}/sdd.md`, false],
    ["builder", `${SPEC}/verdict.md`, false],
    ["verifier", `${SPEC}/verdict.md`, true],
    ["verifier", `${SPEC}/trace.md`, true],
    ["verifier", "src/money.ts", false],
    ["verifier", `${SPEC}/prd.md`, false],
  ];
  it.each(cases)("%s → %s : %s", (role, path, allowed) => {
    expect(decideRole(role, path).allow).toBe(allowed);
  });

  it("차단 이유에 그 파일을 맡을 역할을 알려준다", () => {
    expect(decideRole("builder", `${SPEC}/prd.md`).reason).toContain("설계자(designer)");
    expect(decideRole("verifier", "src/money.ts").reason).toContain("구현자(builder)");
    expect(decideRole("designer", "README.md").reason).toContain("메인 대화");
    expect(ownersOf(`${SPEC}/trace.md`)).toEqual(["designer", "builder", "verifier"]);
  });

  it("역할이 없거나 모르는 역할이면 역할 판정을 하지 않는다 (기존 규칙)", () => {
    expect(decideRole(undefined, "src/a.ts")).toBeUndefined();
    expect(decideRole("probe-reader", "src/a.ts")).toBeUndefined();
  });

  it("역할 규칙이 기록 경로 허용보다 먼저 — 구현자는 태스크 브랜치여도 prd를 못 고친다", () => {
    git("checkout", "-qb", "task/0042-extra-shipping");
    fillTask();
    expect(decideEdit(repo, `${TASK}/prd.md`, "builder").allow).toBe(false);
    expect(decideEdit(repo, `${TASK}/prd.md`).allow).toBe(true); // 메인 대화는 그대로
    expect(decideEdit(repo, "src/a.ts", "builder").allow).toBe(true);
  });

  it("구현자의 코드 수정도 기존 규칙(작업 브랜치·기록)을 함께 따른다", () => {
    expect(decideEdit(repo, "src/a.ts", "builder").allow).toBe(false); // main 브랜치
  });
});

describe("fix 브랜치", () => {
  it("fix/NNNN 브랜치에서도 원 태스크 폴더 기록을 기준으로 수정을 허용한다", () => {
    git("checkout", "-qb", "fix/0042-rounding");
    fillTask();
    expect(decideEdit(repo, "src/a.ts")).toEqual({ allow: true });
    expect(describeSession(repo)).toContain("fix 브랜치");
  });
});

describe("Stop: checkBeforeStop", () => {
  it("코드 변경이 없으면 통과한다", () => {
    expect(checkBeforeStop(repo)).toEqual([]);
  });

  it("main에서 코드가 바뀌면 문제로 본다", () => {
    write("src/a.ts", "export const x = 1;\n");
    expect(checkBeforeStop(repo)[0]).toContain("태스크 브랜치가 아닌 main");
  });

  it("태스크 브랜치에서 trace를 갱신하지 않으면 문제, 갱신하면 통과 (커밋된 변경 포함)", () => {
    git("checkout", "-qb", "task/0042-extra-shipping");
    fillTask({ trace: false });
    write("src/a.ts", "export const x = 1;\n");
    expect(checkBeforeStop(repo).join("\n")).toContain("trace.md");

    write(`${TASK}/trace.md`, FILLED_TRACE);
    git("add", "-A");
    git("commit", "-qm", "work");
    expect(checkBeforeStop(repo)).toEqual([]);
  });
});

describe("SessionStart: describeSession", () => {
  it("main이면 규칙을, 태스크 브랜치면 기록 상태를 알려준다", () => {
    expect(describeSession(repo)).toContain("태스크 브랜치가 아닙니다");
    git("checkout", "-qb", "task/0042-extra-shipping");
    fillTask();
    expect(describeSession(repo)).toContain("기록 상태: 정상");
    expect(inspectTask(repo, "0042-extra-shipping")).toEqual([]);
  });
});

describe("원문 고정 (0022)", () => {
  const REQ = `${TASK}/request.md`;
  const branchWithTask = () => {
    fillTask();
    git("checkout", "-q", "-b", "task/0042-extra-shipping");
  };
  const readBy = (agent) => ({ event: "PostToolUse", tool: "Read", ok: true, session: "s1", agent, detail: `<project>/${REQ}` });

  it("원문은 없을 때 역할 없는 메인만 만들 수 있고, 있으면 아무도 못 고친다", () => {
    branchWithTask();
    expect(decideEdit(repo, REQ, undefined).allow).toBe(true);
    expect(decideEdit(repo, REQ, "designer").reason).toContain("[원문 고정]");
    write(REQ, "# 원문\n");
    expect(decideEdit(repo, REQ, undefined).reason).toContain("[원문 고정]");
    expect(decideEdit(repo, REQ, "designer", { executor: "a1", entries: [readBy("a1")] }).reason).toContain("[원문 고정]");
  });

  it("역할 에이전트는 이번 실행에서 원문을 읽어야 고칠 수 있다", () => {
    branchWithTask();
    write(REQ, "# 원문\n");
    expect(decideEdit(repo, `${TASK}/prd.md`, "designer", { executor: "a1", entries: [] }).reason).toContain("[원문 먼저]");
    expect(decideEdit(repo, "src/a.ts", "builder", { executor: "a2", entries: [readBy("a1")] }).reason).toContain("[원문 먼저]"); // 다른 실행이 읽은 건 안 됨
    expect(decideEdit(repo, "src/a.ts", "builder", { executor: "a2", entries: [readBy("a2")] }).allow).toBe(true);
    // 원문을 읽었어도 역할 권한은 그대로
    expect(decideEdit(repo, `${TASK}/prd.md`, "builder", { executor: "a2", entries: [readBy("a2")] }).reason).toContain("[역할 권한]");
  });

  it("역할 없는 메인, 원문 없는 작업은 기존 규칙만", () => {
    branchWithTask();
    expect(decideRequest(repo, "src/a.ts", "builder", { executor: "a1", entries: [] })).toBeUndefined();
    write(REQ, "# 원문\n");
    expect(decideRequest(repo, "src/a.ts", undefined, {})).toBeUndefined();
  });

  it("읽기 판단: 성공한 Read, 같은 실행 번호(없으면 세션), 이 태스크의 원문만", () => {
    const folder = "0042-extra-shipping";
    expect(hasReadRequest([readBy("a1")], folder, "a1")).toBe(true);
    expect(hasReadRequest([{ ...readBy("a1"), ok: false }], folder, "a1")).toBe(false);
    expect(hasReadRequest([{ ...readBy(undefined) }], folder, "s1")).toBe(true); // --agent 모드: 세션 번호
    expect(hasReadRequest([{ ...readBy("a1"), detail: "<project>/agents/intent/specs/0041-y/request.md" }], folder, "a1")).toBe(false);
  });

  it("역할 분리 작업은 원문 필수, 원문이 있으면 판정서 회차마다 원문 대조 필수", () => {
    write(`${TASK}/prd.md`, FILLED_PRD.replace("## Acceptance", "- **역할 분리:** on\n\n## Acceptance"));
    write(`${TASK}/sdd.md`, FILLED_SDD);
    write(`${TASK}/trace.md`, FILLED_TRACE);
    write("agents/orchestration/TASKS.md", "| ID | 제목 | owner | status | spec |\n| --- | --- | --- | --- | --- |\n| 0042 | x | c | in-progress | - |\n");
    expect(inspectTask(repo, "0042-extra-shipping").join("\n")).toContain("원문");
    write(REQ, "# 원문\n");
    write(`${TASK}/verdict.md`, "## 1차 · x\n판정: approved\n### 확인한 것\n- 테스트 통과\n");
    expect(inspectTask(repo, "0042-extra-shipping").join("\n")).toContain("### 원문 대조 항목이 없습니다");
    write(`${TASK}/verdict.md`, "## 1차 · x\n판정: approved\n### 확인한 것\n- 테스트 통과\n### 원문 대조\n- 규칙 1~3 ↔ 구현·테스트\n");
    expect(inspectTask(repo, "0042-extra-shipping")).toEqual([]);
  });
});
