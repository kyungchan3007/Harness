// 역할 분리 실험 — 실행 기록에서 지표 뽑기 (0016). 순수 함수만 둔다.

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

/** trace.auto.jsonl 항목들 → 도구 호출·역할별 호출·역할 우회·차단 횟수 */
export function analyzeTrace(entries) {
  const tools = entries.filter((e) => e.tool && e.event !== "PreToolUse");
  const byRole = {};
  for (const e of tools) {
    const role = e.role ?? "main";
    byRole[role] = (byRole[role] ?? 0) + 1;
  }
  const edits = tools.filter((e) => EDIT_TOOLS.has(e.tool) && e.ok);
  return {
    toolCalls: tools.length,
    byRole,
    /** 역할 없는 메인 대화가 직접 고친 횟수 — B에서는 역할 우회 */
    mainEdits: edits.filter((e) => !e.role).length,
    edits: edits.length,
    /** 수정 직전 검사가 막은 횟수 (역할 권한·기록 규칙) */
    blocked: entries.filter((e) => e.event === "PreToolUse" && e.blocked).length,
    stopBlocked: entries.filter((e) => e.event === "StopBlocked").length,
    testRuns: tools.filter((e) => e.tool === "Bash" && /\b(vitest|pnpm (test|check)|checks\.sh)\b/.test(e.detail ?? "")).length,
  };
}

/** 실행 transcript에서 복사본 밖(원본 저장소·채점 파일)에 손댄 흔적 — 도구 호출 입력만 본다 */
export function findAccess(transcriptLines, patterns) {
  const hits = [];
  for (const line of transcriptLines) {
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    const content = d?.message?.content;
    if (d?.type !== "assistant" || !Array.isArray(content)) continue;
    for (const part of content) {
      if (part?.type !== "tool_use") continue;
      const input = JSON.stringify(part.input ?? {});
      for (const p of patterns) if (p.test(input)) hits.push({ tool: part.name, pattern: String(p), input: input.slice(0, 160) });
    }
  }
  return hits;
}

/** 판정서 회차 요약 (pnpm verdict 대신 결과 파일에서 바로) */
export function verdictRounds(text) {
  return [...(text ?? "").matchAll(/^판정:\s*(approved|rejected)/gm)].map((m) => m[1]);
}
