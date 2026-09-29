import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { describeSession } from "../session-context.mjs";
import { checkBeforeStop, checkPrd, checkSdd, checkTrace, decideEdit, inspectTask, isRecordPath } from "./records.mjs";

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), "../../../intent/templates");
const template = (name) => readFileSync(join(TEMPLATES, name), "utf8");

const FILLED_PRD = "# 0042 — 추가 배송비 — PRD\n\n## Acceptance\n- [ ] 도서산간 3,000원 추가\n";
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
    expect(checkPrd(template("prd.md"), "0042")).toHaveLength(2);
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
