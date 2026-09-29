import { describe, expect, it } from "vitest";
import { redact, resolveTraceFile, sanitize, toEntry, UNASSIGNED_FILE } from "./trace.mjs";

const PROJECT = "/Users/me/develop/harness-lab";
const NOW = new Date("2026-09-29T08:00:00Z");

describe("trace hook", () => {
  it("태스크 브랜치면 해당 태스크 폴더의 trace.auto.jsonl로 보낸다", () => {
    const folders = ["0002-cart-pricing", "0008-trace-observability"];
    expect(resolveTraceFile("task/0008-anything", folders)).toBe("agents/intent/specs/0008-trace-observability/trace.auto.jsonl");
  });

  it("태스크 브랜치가 아니거나 폴더가 없으면 커밋되지 않는 파일로 보낸다", () => {
    expect(resolveTraceFile("main", ["0002-cart-pricing"])).toBe(UNASSIGNED_FILE);
    expect(resolveTraceFile("task/0099-none", ["0002-cart-pricing"])).toBe(UNASSIGNED_FILE);
    expect(resolveTraceFile("", [])).toBe(UNASSIGNED_FILE);
  });

  it("비밀값으로 보이는 문자열을 가린다", () => {
    expect(redact("gh auth --with-token ghp_abcdefghijklmnop1234")).not.toContain("ghp_abcdefghijklmnop1234");
    expect(redact("curl -H 'Authorization: Bearer abc.def.ghi'")).not.toContain("abc.def.ghi");
    expect(redact("API_KEY=supersecret pnpm test")).toBe("API_KEY=[REDACTED] pnpm test");
    expect(redact("password: 'hunter2'")).not.toContain("hunter2");
    expect(redact("pnpm exec vitest run")).toBe("pnpm exec vitest run");
  });

  it("경로를 프로젝트 기준 상대 경로와 ~로 바꾸고 200자로 자른다", () => {
    expect(sanitize(`${PROJECT}/src/cart/cart.ts`, PROJECT, "/Users/me")).toBe("src/cart/cart.ts");
    expect(sanitize("cat /Users/me/.zshrc", PROJECT, "/Users/me")).toBe("cat ~/.zshrc");
    expect(sanitize(`cwd is ${PROJECT}.`, PROJECT, "/Users/me")).toBe("cwd is <project>.");
    expect(sanitize("x".repeat(300), PROJECT)).toHaveLength(201);
  });

  it("도구 호출을 기록 항목으로 바꾼다 (성공·실패)", () => {
    const base = { session_id: "abcdef123456", tool_name: "Edit", tool_input: { file_path: `${PROJECT}/src/money.ts` } };
    expect(toEntry({ ...base, hook_event_name: "PostToolUse" }, PROJECT, NOW)).toEqual({
      ts: "2026-09-29T08:00:00.000Z",
      session: "abcdef12",
      event: "PostToolUse",
      tool: "Edit",
      detail: "src/money.ts",
      ok: true,
    });
    const failed = toEntry(
      { ...base, hook_event_name: "PostToolUseFailure", tool_name: "Bash", tool_input: { command: "pnpm check" }, error: "exit 1" },
      PROJECT,
      NOW,
    );
    expect(failed).toMatchObject({ tool: "Bash", detail: "pnpm check", ok: false, error: "exit 1" });
  });

  it("guard가 차단한 호출은 blocked로 남긴다", () => {
    const entry = toEntry(
      { hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path: `${PROJECT}/src/a.ts` }, reason: "[기록 강제] src/a.ts 수정 차단" },
      PROJECT,
      NOW,
    );
    expect(entry).toMatchObject({ event: "PreToolUse", tool: "Edit", detail: "src/a.ts", ok: false, blocked: true, error: "[기록 강제] src/a.ts 수정 차단" });
  });

  it("프롬프트·세션 시작·종료 이벤트도 남긴다", () => {
    expect(toEntry({ hook_event_name: "UserPromptSubmit", prompt: "0003 진행해줘" }, PROJECT, NOW).detail).toBe("0003 진행해줘");
    expect(toEntry({ hook_event_name: "SessionStart", source: "startup" }, PROJECT, NOW).detail).toBe("startup");
    expect(toEntry({ hook_event_name: "Stop" }, PROJECT, NOW)).toEqual({ ts: "2026-09-29T08:00:00.000Z", session: "", event: "Stop" });
  });
});
