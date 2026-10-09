import { describe, expect, it } from "vitest";
import {
  CHECK_REQUEST, classifyPastRead, extractFollowups, followupMentioned, inPeriod, isEdit, keywords, localDate, parseCheckboxes,
  segmentUnits, summarizeIssues, summarizeUnits, toEvents, typedText,
} from "./lib.mjs";

const user = (ts, text, extra = {}) => JSON.stringify({ type: "user", timestamp: ts, gitBranch: extra.branch ?? "main", message: { content: text }, ...extra.raw });
const tool = (ts, id, name, input, extra = {}) =>
  JSON.stringify({ type: "assistant", timestamp: ts, gitBranch: extra.branch ?? "main", isSidechain: extra.side, message: { id: `m-${id}`, content: [{ type: "tool_use", id, name, input }] } });

describe("과거 기록 분류", () => {
  it("읽기 도구·읽기 명령만 과거 기록으로 센다", () => {
    expect(classifyPastRead("Read", { file_path: "/p/agents/JOURNAL.md" })).toBe("작업 기록");
    expect(classifyPastRead("Read", { file_path: "/p/agents/intent/specs/0002-x/sdd.md" })).toBe("태스크 문서");
    expect(classifyPastRead("Read", { file_path: "/u/.claude/projects/p/memory/a.md" })).toBe("메모리");
    expect(classifyPastRead("Bash", { command: "git log --oneline -5" })).toBe("git·이슈 이력");
    expect(classifyPastRead("Bash", { command: "cat agents/orchestration/TASKS.md" })).toBe("작업 기록");
    expect(classifyPastRead("mcp__x__notion-fetch", { id: "1" })).toBe("Notion");
    expect(classifyPastRead("Read", { file_path: "/p/src/cart.ts" })).toBeUndefined();
  });

  it("Bash로 쓰는 명령은 읽기가 아니라 수정이다", () => {
    const append = { command: "echo '| 0019 |' >> agents/orchestration/TASKS.md" };
    expect(classifyPastRead("Bash", append)).toBeUndefined();
    expect(isEdit("Bash", append)).toBe(true);
    expect(isEdit("Bash", { command: "sed -i '' 's/a/b/' README.md" })).toBe(true);
    expect(isEdit("Bash", { command: "pnpm check 2>&1 | tail -3" })).toBe(false);
    expect(isEdit("Bash", { command: "git log > /dev/null" })).toBe(false);
  });
});

describe("작업 시작 단위", () => {
  it("도구 결과·메타·사이드체인·중복 tool_use는 제외한다", () => {
    const lines = [
      user("2026-09-29T01:00:00Z", "진짜 요청"),
      user("2026-09-29T01:00:01Z", "메타", { raw: { isMeta: true } }),
      JSON.stringify({ type: "user", timestamp: "2026-09-29T01:00:02Z", message: { content: [{ type: "tool_result" }] } }),
      tool("2026-09-29T01:00:03Z", "t1", "Read", { file_path: "a" }),
      tool("2026-09-29T01:00:03Z", "t1", "Read", { file_path: "a" }),
      tool("2026-09-29T01:00:04Z", "t2", "Read", { file_path: "b" }, { side: true }),
    ];
    const ev = toEvents(lines);
    expect(ev.filter((e) => e.kind === "prompt")).toHaveLength(1);
    expect(ev.filter((e) => e.kind === "tool")).toHaveLength(1);
  });

  it("서울 날짜·브랜치가 바뀌면 새 단위, 첫 수정 전까지만 센다", () => {
    expect(localDate("2026-09-29T15:30:00Z")).toBe("2026-09-30");
    const lines = [
      user("2026-09-29T01:00:00Z", "1일차"),
      tool("2026-09-29T01:00:01Z", "a", "Read", { file_path: "/p/agents/JOURNAL.md" }),
      tool("2026-09-29T01:00:02Z", "b", "Edit", { file_path: "/p/src/a.ts" }),
      tool("2026-09-29T01:00:03Z", "c", "Bash", { command: "git log -3" }),
      user("2026-09-29T02:00:00Z", "같은 날 두 번째 요청"),
      user("2026-09-30T01:00:00Z", "2일차 — 체크해줘"),
      tool("2026-09-30T01:00:01Z", "d", "Read", { file_path: "/p/src/a.ts" }),
      tool("2026-09-30T01:00:02Z", "e", "Bash", { command: "cat > src/b.ts <<EOF" }),
      user("2026-09-30T02:00:00Z", "새 브랜치", { branch: "task/0020-x" }),
    ];
    const units = segmentUnits(toEvents(lines));
    expect(units.map((u) => [u.date, u.branch, u.prompts])).toEqual([
      ["2026-09-29", "main", 2],
      ["2026-09-30", "main", 1],
      ["2026-09-30", "task/0020-x", 1],
    ]);
    expect(units[0].pastReads).toEqual({ "작업 기록": 1 }); // 수정 뒤 git log는 제외
    expect(units[1]).toMatchObject({ pastReads: {}, edited: true, checkRequests: 1, toolsBeforeEdit: 1 });
    const s = summarizeUnits(units);
    expect(s).toMatchObject({ units: 3, worked: 2, referenced: 1, rate: 0.5, checkRequests: 1 });
  });
});

describe("쓰려고 읽은 것 제외", () => {
  it("같은 단위에서 나중에 수정하는 파일·Notion 페이지를 읽은 것은 복기가 아니다", () => {
    const lines = [
      user("2026-09-29T01:00:00Z", "기록 남겨줘"),
      tool("2026-09-29T01:00:01Z", "a", "Read", { file_path: "/p/agents/JOURNAL.md" }),
      tool("2026-09-29T01:00:02Z", "b", "mcp__n__notion-fetch", { id: "3d8deddc12a78128a7ddcc5ac03b164a" }),
      tool("2026-09-29T01:00:03Z", "c", "Read", { file_path: "/p/agents/intent/specs/0002-x/sdd.md" }),
      tool("2026-09-29T01:00:04Z", "d", "Edit", { file_path: "/p/agents/JOURNAL.md" }),
      tool("2026-09-29T01:00:05Z", "e", "mcp__n__notion-update-page", { page_id: "3d8deddc-12a7-8128-a7dd-cc5ac03b164a" }),
    ];
    const [u] = segmentUnits(toEvents(lines));
    expect(u.readToWrite).toBe(2);
    expect(u.pastReads).toEqual({ "태스크 문서": 1 });
  });
});

describe("체크박스", () => {
  it("체크·사유 있는 미체크·방치를 구분한다", () => {
    const body = "## 완료 조건\n- [x] 업로드\n- [ ] 재시도 (후속 #72)\n- [ ] 진행률 표시\n* [X] 로그인\n- 그냥 불릿";
    expect(parseCheckboxes(body)).toEqual([
      { checked: true, reasoned: false },
      { checked: false, reasoned: true },
      { checked: false, reasoned: false },
      { checked: true, reasoned: false },
    ]);
    const s = summarizeIssues([{ body }, { body: "체크박스 없음" }, { body: "- [x] a" }]);
    expect(s).toMatchObject({ issues: 3, withBoxes: 2, withAbandoned: 1, total: 5, checked: 3, reasoned: 1, abandoned: 1 });
    expect(s.abandonRate).toBeCloseTo(0.2);
  });
});

describe("[보완] 반영", () => {
  it("커밋의 [보완] 항목을 뽑는다", () => {
    const msg = "feat: x\n\n[허점]\n- a\n\n[보완]\n- CI에서 커밋 메시지 검사\n- Codex 토큰 집계\n\n[컨텍스트·토큰]\n- 토큰\n\nCo-Authored-By: A <a@a>";
    expect(extractFollowups(msg)).toEqual(["CI에서 커밋 메시지 검사", "Codex 토큰 집계"]);
    expect(extractFollowups("feat: 형식 없음")).toEqual([]);
  });

  it("핵심어가 이후 텍스트에 함께 나오면 언급 후보", () => {
    expect(keywords("Codex 토큰 집계")).toEqual(["Codex", "토큰"]);
    expect(followupMentioned("Codex 토큰 집계", ["feat(0030): Codex 세션 토큰 집계 추가"])).toBe(true);
    expect(followupMentioned("Codex 토큰 집계", ["feat: 토큰만 언급"])).toBe(false);
  });
});

describe("사용자가 직접 친 요청만 (0031, 2026-10-09 ClauseLens 재측정에서 발견한 오탐)", () => {
  const checks = (lines) => summarizeUnits(segmentUnits(toEvents(lines))).checkRequests;
  it("실제 체크 요청 3종은 센다", () => {
    for (const t of [
      "니가 커밋하고 푸쉬하고 나면 이거 체크를 체워줘여 할거 같은데",
      "여기에 완료 조건이 있던데 이거 체크 안해도 되는거야?",
      "왜 이슈 체크박스는 확인 안해 이거도 지침서에 있지 않아?",
    ]) expect(CHECK_REQUEST.test(t), t).toBe(true);
  });
  it("체크박스를 언급만 한 문장은 세지 않는다 (붙여 넣은 이슈 제목 목록)", () => {
    expect(CHECK_REQUEST.test("* [fix(harness): 체크박스 동기화·검사가 폴더형 spec(0025~)을 못 찾음 #153](https://x)")).toBe(false);
    expect(CHECK_REQUEST.test("체크박스 도구가 단일 파일 가정 → 폴더형 미인식")).toBe(false);
  });
  it("셸 명령·출력, 시스템 안내, 붙여 넣은 글은 걷어 낸다", () => {
    expect(typedText("<bash-input>bash checks.sh</bash-input><bash-stdout>✔ 체크박스 확인 안 해도 됨</bash-stdout>")).toBe("");
    expect(typedText("<system-reminder>체크해줘</system-reminder>\n좋아")).toBe("좋아");
    expect(typedText('<pasted_content id="1">체크 해줘</pasted_content> 이거 봐줘')).toBe("이거 봐줘");
    expect(typedText("<artifact-content-authored-by-others/>요약")).toBe("요약");
  });
  it("대화 요약과 같은 uuid 중복은 요청으로 세지 않는다", () => {
    const lines = [
      user("2026-10-01T01:00:00Z", "이거 체크 안해?", { raw: { uuid: "u1" } }),
      user("2026-10-01T01:00:00Z", "이거 체크 안해?", { raw: { uuid: "u1" } }), // 다른 파일에 같은 메시지
      user("2026-10-01T02:00:00Z", "This session is being continued … 체크해줘", { raw: { uuid: "u2", isCompactSummary: true } }),
      user("2026-10-01T03:00:00Z", "<bash-input>bash checks.sh</bash-input><bash-stdout>체크 해야 함</bash-stdout>", { raw: { uuid: "u3" } }),
    ];
    expect(checks(lines)).toBe(1);
  });
});

describe("기간 (0031)", () => {
  it("[since, until) — 날짜만·시각까지 모두", () => {
    expect(inPeriod("2026-10-02T08:11:00Z", "2026-10-01", "2026-10-02T08:12")).toBe(true);
    expect(inPeriod("2026-10-02T08:12:30Z", undefined, "2026-10-02T08:12Z")).toBe(false);
    expect(inPeriod("2026-09-30T23:00:00+09:00", "2026-09-30T15:00Z")).toBe(false);
  });
});
