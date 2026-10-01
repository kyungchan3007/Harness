import { describe, expect, it } from "vitest";
import { analyzeTrace, findAccess, verdictRounds } from "./metrics.mjs";

describe("analyzeTrace", () => {
  it("역할별 호출, 역할 없는 수정, 차단, 테스트 실행을 센다", () => {
    const entries = [
      { event: "SessionStart" },
      { event: "PostToolUse", tool: "Read", ok: true },
      { event: "PostToolUse", tool: "Write", ok: true },
      { event: "PostToolUse", tool: "Edit", ok: true, role: "builder" },
      { event: "PreToolUse", tool: "Edit", ok: false, blocked: true, role: "builder" },
      { event: "PostToolUse", tool: "Bash", ok: true, role: "verifier", detail: "pnpm exec vitest run" },
      { event: "PostToolUseFailure", tool: "Edit", ok: false },
      { event: "StopBlocked", ok: false, blocked: true },
    ];
    expect(analyzeTrace(entries)).toEqual({
      toolCalls: 5,
      byRole: { main: 3, builder: 1, verifier: 1 },
      mainEdits: 1,
      edits: 2,
      blocked: 1,
      stopBlocked: 1,
      testRuns: 1,
    });
  });
});

describe("findAccess", () => {
  it("도구 호출 입력에서만 원본 경로·채점 파일 흔적을 찾는다", () => {
    const lines = [
      JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Read", input: { file_path: "/Users/me/develop/harness-lab/experiments/role-split/oracle/x.ts" } }] } }),
      JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "harness-lab 이야기" }] } }),
      JSON.stringify({ type: "user", message: { content: "/Users/me/develop/harness-lab" } }),
      "깨진 줄",
    ];
    const hits = findAccess(lines, [/harness-lab/, /oracle/]);
    expect(hits.map((h) => [h.tool, h.pattern])).toEqual([["Read", "/harness-lab/"], ["Read", "/oracle/"]]);
  });
});

describe("verdictRounds", () => {
  it("회차 판정을 순서대로", () => {
    expect(verdictRounds("## 1차\n판정: rejected\n...\n## 2차\n판정: approved\n")).toEqual(["rejected", "approved"]);
    expect(verdictRounds(undefined)).toEqual([]);
  });
});
