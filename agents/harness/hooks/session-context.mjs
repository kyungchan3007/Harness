#!/usr/bin/env node
// SessionStart: 현재 브랜치·태스크·기록 상태를 에이전트 컨텍스트로 알려준다 (stdout → 컨텍스트).
import { currentBranch, findTaskFolder, inspectTask, isFixBranch, parseTaskId, SPECS_DIR } from "./lib/records.mjs";
import { isMain, projectDirOf, readHookInput, runHook } from "./lib/io.mjs";

export function describeSession(projectDir) {
  const branch = currentBranch(projectDir);
  const id = parseTaskId(branch);
  const lines = [`[harness-lab 기록 규칙] 현재 브랜치: ${branch || "알 수 없음"}`];

  if (!id) {
    lines.push("태스크 브랜치가 아닙니다. 코드(기록 경로 밖 파일)를 수정하려면 먼저 이슈 → 그 이슈에서 만든 task/NNNN-슬러그 브랜치(gh issue develop), TASKS.md 행, prd.md(이슈 번호 포함)·sdd.md가 필요합니다. 없으면 수정이 차단됩니다. 지침: agents/harness/branch-and-issue.md");
    return lines.join("\n");
  }
  const folder = findTaskFolder(projectDir, id);
  if (!folder) {
    lines.push(`태스크 ${id}: ${SPECS_DIR}/${id}-슬러그/ 폴더가 없습니다. prd.md·sdd.md·trace.md를 먼저 작성하세요.`);
    return lines.join("\n");
  }
  const problems = inspectTask(projectDir, folder);
  lines.push(`태스크 ${id} (${SPECS_DIR}/${folder}/)${isFixBranch(branch) ? " — fix 브랜치: 기록은 이 태스크의 trace.md에, 원 이슈에 코멘트로 요약" : ""}`);
  lines.push(problems.length === 0 ? "기록 상태: 정상. 작업하면서 trace.md에 판단·이유를 계속 남기세요." : `기록 상태: 미완\n${problems.map((p) => `- ${p}`).join("\n")}`);
  return lines.join("\n");
}

if (isMain(import.meta.url)) {
  runHook("session-context", async () => {
    const input = await readHookInput();
    const projectDir = projectDirOf(input);
    // 대화 시작에도 복기를 넣고, 같은 날·같은 브랜치의 첫 요청에서 반복하지 않도록 상태를 기록한다
    const { recallOnPrompt } = await import("./recall-hook.mjs");
    const recap = recallOnPrompt(projectDir, String(input.session_id ?? "unknown"));
    if (recap) {
      try {
        const { appendTrace, toEntry } = await import("./trace.mjs");
        appendTrace(projectDir, { ...toEntry(input, projectDir), event: "RecallInjected", detail: `대화 시작 · 보완 ${recap.followups}개 · 일지 ${recap.journal}개` });
      } catch {}
    }
    process.stdout.write((recap ? recap.text : describeSession(projectDir)) + "\n");
    process.exit(0);
  });
}
