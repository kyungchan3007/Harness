#!/usr/bin/env node
// 게이트: 태스크 기록 검사 (hooks와 같은 판정 모듈 사용)
// - 단일 파일 spec 금지
// - 모든 태스크 폴더: prd·sdd·trace가 템플릿이 아닌 실제 내용 + TASKS.md 행
// - 태스크 브랜치면 해당 폴더가 반드시 있어야 함
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { currentBranch, findTaskFolder, inspectTask, listTaskFolders, parseTaskId, SPECS_DIR } from "../hooks/lib/records.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const problems = [];

const specsDir = join(root, SPECS_DIR);
if (existsSync(specsDir)) {
  for (const name of readdirSync(specsDir)) {
    if (name.endsWith(".md")) problems.push(`${SPECS_DIR}/${name}: 단일 파일 spec은 폴더로 옮기세요`);
  }
}

for (const folder of listTaskFolders(root)) {
  problems.push(...inspectTask(root, folder).map((p) => `${folder}: ${p}`));
}

const branch = currentBranch(root);
const id = parseTaskId(branch);
if (id && !findTaskFolder(root, id)) problems.push(`브랜치 ${branch}의 태스크 폴더 ${SPECS_DIR}/${id}-*/ 가 없습니다`);

if (problems.length > 0) {
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}
console.log(`  태스크 폴더 ${listTaskFolders(root).length}개 확인${id ? `, 현재 태스크 ${id}` : ""}`);
