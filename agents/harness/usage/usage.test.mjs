import { describe, expect, it } from "vitest";
import { countFilesRead, extractRequests, fmt, projectTranscriptDir, renderSection, summarize } from "./usage.mjs";

const line = (id, branch, usage, extra = {}) =>
  JSON.stringify({ type: "assistant", sessionId: extra.session ?? "s1", gitBranch: branch, timestamp: extra.ts ?? "2026-09-29T10:00:00Z", message: { id, model: "claude-opus-5-5", usage } });
const U = (input, cw, cr, out) => ({ input_tokens: input, cache_creation_input_tokens: cw, cache_read_input_tokens: cr, output_tokens: out });

describe("토큰 집계", () => {
  it("같은 message.id(스트리밍 중복)는 한 번만 센다", () => {
    const lines = [line("m1", "task/0001-a", U(1, 10, 100, 5)), line("m1", "task/0001-a", U(1, 10, 100, 5)), line("m2", "task/0001-a", U(2, 0, 200, 7))];
    expect(extractRequests(lines)).toHaveLength(2);
  });

  it("브랜치로 걸러 합산하고, 컨텍스트는 입력+캐시 읽기+캐시 쓰기의 최대·마지막", () => {
    const lines = [
      line("m1", "task/0001-a", U(1, 10, 100, 5), { ts: "2026-09-29T10:00:00Z" }),
      line("m2", "task/0001-a", U(2, 0, 300, 7), { ts: "2026-09-29T10:01:00Z", session: "s2" }),
      line("m3", "main", U(999, 999, 999, 999)),
      "not json",
      JSON.stringify({ type: "user", message: { content: "hi" } }),
    ];
    const s = summarize(extractRequests(lines, (d) => d.gitBranch === "task/0001-a"));
    expect(s).toMatchObject({ requests: 2, sessions: 2, input: 3, cacheWrite: 10, cacheRead: 400, output: 12, maxContext: 302, lastContext: 302 });
  });

  it("읽은 파일은 성공한 Read의 고유 경로 수", () => {
    const trace = [
      { tool: "Read", ok: true, detail: "a.ts" },
      { tool: "Read", ok: true, detail: "a.ts" },
      { tool: "Read", ok: false, detail: "b.ts" },
      { tool: "Edit", ok: true, detail: "c.ts" },
    ].map((e) => JSON.stringify(e)).join("\n");
    expect(countFilesRead(trace)).toBe(1);
  });

  it("섹션 렌더링과 기록이 없을 때의 표시", () => {
    expect(fmt(1234)).toBe("1.2k");
    expect(fmt(2_500_000)).toBe("2.50M");
    expect(renderSection(summarize([]), { scope: "브랜치 x" })).toContain("집계 불가");
    const out = renderSection(summarize(extractRequests([line("m1", "b", U(1, 2, 3, 4))])), { scope: "브랜치 b 누적", filesRead: 5 });
    expect(out).toContain("요청 1회");
    expect(out).toContain("읽은 파일: 5개");
  });

  it("프로젝트 경로를 Claude Code transcript 폴더 이름으로 바꾼다", () => {
    expect(projectTranscriptDir("/Users/me/develop/harness-lab", "/Users/me")).toBe("/Users/me/.claude/projects/-Users-me-develop-harness-lab");
  });
});
