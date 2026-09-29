#!/usr/bin/env node
// SessionStart: 현재 브랜치·태스크·기록 상태를 에이전트 컨텍스트로 알려준다 (stdout → 컨텍스트).
import { currentBranch, findTaskFolder, inspectTask, parseTaskId, SPECS_DIR } from "./lib/records.mjs";
import { isMain, projectDirOf, readHookInput, runHook } from "./lib/io.mjs";

export function describeSession(projectDir) {
  const branch = currentBranch(projectDir);
  const id = parseTaskId(branch);
  const lines = [`[harness-lab 기록 규칙] 현재 브랜치: ${branch || "알 수 없음"}`];

  if (!id) {
    lines.push("태스크 브랜치가 아닙니다. 코드(기록 경로 밖 파일)를 수정하려면 먼저 task/NNNN-슬러그 브랜치, TASKS.md 행, prd.md·sdd.md가 필요합니다. 없으면 수정이 차단됩니다.");
    return lines.join("\n");
  }
  const folder = findTaskFolder(projectDir, id);
  if (!folder) {
    lines.push(`태스크 ${id}: ${SPECS_DIR}/${id}-슬러그/ 폴더가 없습니다. prd.md·sdd.md·trace.md를 먼저 작성하세요.`);
    return lines.join("\n");
  }
  const problems = inspectTask(projectDir, folder);
  lines.push(`태스크 ${id} (${SPECS_DIR}/${folder}/)`);
  lines.push(problems.length === 0 ? "기록 상태: 정상. 작업하면서 trace.md에 판단·이유를 계속 남기세요." : `기록 상태: 미완\n${problems.map((p) => `- ${p}`).join("\n")}`);
  return lines.join("\n");
}

if (isMain(import.meta.url)) {
  runHook("session-context", async () => {
    const input = await readHookInput();
    process.stdout.write(describeSession(projectDirOf(input)) + "\n");
    process.exit(0);
  });
}
