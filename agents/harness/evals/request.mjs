#!/usr/bin/env node
// 원문 복사 — pnpm request [이슈번호]  (번호 없으면 현재 작업 브랜치의 prd 이슈)
// 이슈 본문을 닫을 때 채우는 칸(--- 아래) 앞까지 태스크 폴더 request.md로 그대로 복사한다. 이미 있으면 덮어쓰지 않는다.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { issueNumberOf, REQUEST_FILE, SPECS_DIR } from "../hooks/lib/records.mjs";
import { currentBranch } from "../hooks/lib/records.mjs";
import { resolveTarget } from "./issue-sync.mjs";

/** 이슈 본문 → 원문 파일 내용. 닫을 때 채우는 칸(첫 단독 --- 줄 아래)은 원문이 아니다 */
export function renderRequest(issue, body) {
  const original = body.replace(/\r\n/g, "\n").split(/^---\s*$/m)[0].trim();
  return [
    `# 원문 — 이슈 #${issue}`,
    "",
    "> `pnpm request`로 이슈 본문을 그대로 복사한 파일입니다. **고칠 수 없습니다**(자동 검사가 막음). 요구사항·설계 문서와 다르면 이 파일이 기준입니다.",
    "",
    original,
    "",
  ].join("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
  const issueArg = process.argv[2]?.replace("#", "");
  const target = resolveTarget(root, currentBranch(root), issueArg);
  if (target.error) {
    console.log(`  ❌ ${target.error}`);
    process.exit(1);
  }
  const dir = join(root, SPECS_DIR, target.folder);
  const out = join(dir, REQUEST_FILE);
  if (existsSync(out)) {
    console.log(`  ✅ 원문이 이미 있습니다 (고치지 않음): ${SPECS_DIR}/${target.folder}/${REQUEST_FILE}`);
    process.exit(0);
  }
  const issue = issueArg ?? issueNumberOf(readFileSync(join(dir, "prd.md"), "utf8"));
  const body = execFileSync("gh", ["issue", "view", issue, "--json", "body", "--jq", ".body"], { encoding: "utf8" });
  writeFileSync(out, renderRequest(issue, body));
  console.log(`  ✅ 이슈 #${issue} 본문을 원문으로 복사: ${SPECS_DIR}/${target.folder}/${REQUEST_FILE}`);
}
