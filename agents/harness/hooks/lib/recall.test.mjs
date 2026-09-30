import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { recallOnPrompt } from "../recall-hook.mjs";
import { pendingFollowups, recentJournal, renderRecap, shouldInject } from "./recall.mjs";

const commit = (subject, followups) => ({ subject, body: `[허점]\n- x\n\n[보완]\n${followups.map((f) => `- ${f}`).join("\n")}\n` });

describe("복기 조합", () => {
  it("이후 커밋·TASKS에서 언급된 [보완]은 빼고, 최신 것부터", () => {
    const commits = [
      commit("feat(0017): 지침서", ["Codex 토큰 집계", "CI 커밋 메시지 검사"]),
      commit("feat(0019): 측정", ["표본 원본 대조 절차"]),
      { subject: "feat(0030): Codex 세션 토큰 집계", body: "" },
    ];
    const out = pendingFollowups(commits, "| 0007 | CI 커밋 메시지 검사 |", 6);
    expect(out.map((f) => f.item)).toEqual(["표본 원본 대조 절차"]);
  });

  it("작업 일지의 마지막 n행", () => {
    const journal = "| 날짜 | 태스크 | 결과 | 드러난 공백 | 기록 |\n| --- | --- | --- | --- | --- |\n| 09-29 | 0001 | ok | 공백A | t |\n| 09-30 | 0019 | ok | 공백B | t |\n";
    expect(recentJournal(journal, 1)).toEqual([{ date: "09-30", task: "0019", gap: "공백B" }]);
  });

  it("길이 제한(1,500자)을 지킨다", () => {
    const followups = Array.from({ length: 50 }, (_, i) => ({ item: "가".repeat(200) + i, from: "feat: x" }));
    expect(renderRecap({ followups, journal: [], status: "" }).length).toBeLessThanOrEqual(1501);
  });

  it("날짜나 브랜치가 바뀌었을 때만 다시 주입한다", () => {
    const state = { s1: { date: "2026-09-30", branch: "task/0020-x" } };
    expect(shouldInject(state, "s1", "2026-09-30", "task/0020-x")).toBe(false);
    expect(shouldInject(state, "s1", "2026-10-01", "task/0020-x")).toBe(true);
    expect(shouldInject(state, "s1", "2026-09-30", "task/0021-y")).toBe(true);
    expect(shouldInject(state, "s2", "2026-09-30", "task/0020-x")).toBe(true);
  });
});

describe("recallOnPrompt (임시 git repo)", () => {
  it("첫 요청에 주입, 같은 조건 반복 안 함, 날짜가 바뀌면 다시 주입", () => {
    const repo = mkdtempSync(join(tmpdir(), "recall-"));
    const git = (...a) => execFileSync("git", ["-C", repo, ...a], { stdio: "pipe" });
    git("init", "-q", "-b", "main");
    git("config", "user.email", "t@t");
    git("config", "user.name", "t");
    mkdirSync(join(repo, "agents/harness/hooks"), { recursive: true });
    writeFileSync(join(repo, "a.txt"), "1");
    git("add", "-A");
    git("commit", "-qm", "feat(0001): 뼈대\n\n[보완]\n- 모바일 폭 가독성 확인");
    const first = recallOnPrompt(repo, "s1", { date: "2026-09-30", branch: "main" });
    expect(first.text).toContain("모바일 폭 가독성 확인");
    expect(first.followups).toBe(1);
    expect(recallOnPrompt(repo, "s1", { date: "2026-09-30", branch: "main" })).toBeUndefined();
    expect(recallOnPrompt(repo, "s1", { date: "2026-10-01", branch: "main" })).toBeDefined();
  });
});
