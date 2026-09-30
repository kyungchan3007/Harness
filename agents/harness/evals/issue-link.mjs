#!/usr/bin/env node
// 현재 태스크 브랜치가 prd.md의 GitHub 이슈에 실제로 연결됐는지 확인한다 (네트워크 필요 → 게이트 밖, PR 전에 실행).
//   pnpm issue-link
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { currentBranch, findTaskFolder, isFixBranch, issueNumberOf, parseTaskId, SPECS_DIR } from "../hooks/lib/records.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const branch = currentBranch(root);
const id = parseTaskId(branch);
const fail = (msg) => {
  console.log(`  ❌ ${msg}`);
  process.exit(1);
};

if (!id) fail(`태스크 브랜치가 아닙니다: ${branch}`);
const folder = findTaskFolder(root, id);
if (!folder) fail(`태스크 ${id} 폴더가 없습니다`);
const issue = issueNumberOf(readFileSync(join(root, SPECS_DIR, folder, "prd.md"), "utf8"));
if (!issue) fail(`${folder}/prd.md에 "- **이슈:** #번호"가 없습니다`);

let linked;
try {
  linked = execFileSync("gh", ["issue", "develop", "--list", issue], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch (error) {
  fail(`gh로 이슈 #${issue} 연결 브랜치를 조회하지 못했습니다: ${String(error.message).split("\n")[0]}`);
}
const branches = linked.split("\n").map((l) => l.split("\t")[0].trim()).filter(Boolean);
if (!branches.includes(branch)) {
  fail(`브랜치 ${branch}가 이슈 #${issue}에 연결돼 있지 않습니다 (연결된 브랜치: ${branches.join(", ") || "없음"}). gh issue develop ${issue} --name ${branch} 로 만들었는지 확인하세요`);
}
console.log(`  ✅ ${branch} ↔ 이슈 #${issue} 연결됨${isFixBranch(branch) ? " (fix 브랜치)" : ""}`);
