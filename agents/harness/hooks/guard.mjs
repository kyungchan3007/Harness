#!/usr/bin/env node
// PreToolUse(Edit·Write·MultiEdit·NotebookEdit): 기록(TASKS·PRD·SDD) 없이 코드 수정을 막는다. 차단은 exit 2.
import { relative } from "node:path";
import { decideEdit } from "./lib/records.mjs";
import { appendTrace, toEntry } from "./trace.mjs";
import { isMain, projectDirOf, readHookInput, runHook } from "./lib/io.mjs";

if (isMain(import.meta.url)) {
  runHook("guard", async () => {
    const input = await readHookInput();
    const projectDir = projectDirOf(input);
    const target = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
    if (!target) process.exit(0);

    // 실행 번호: 보조 에이전트는 agent_id, 없으면(--agent 모드) 자동 기록과 같은 세션 번호 앞 8자리
    const executor = input.agent_id ? String(input.agent_id) : String(input.session_id ?? "").slice(0, 8);
    const decision = decideEdit(projectDir, relative(projectDir, target), input.agent_type, { executor });
    if (decision.allow) process.exit(0);
    // 차단된 호출은 PostToolUse가 오지 않으므로 여기서 자동 기록에 남긴다
    try {
      appendTrace(projectDir, toEntry({ ...input, reason: decision.reason.split("\n")[0] }, projectDir));
    } catch {}
    process.stderr.write(decision.reason + "\n");
    process.exit(2);
  });
}
