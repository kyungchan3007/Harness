#!/usr/bin/env node
// 체크박스 한 곳 관리 — 원본은 prd.md의 ## Acceptance, 이슈는 복사본.
//   pnpm issue-sync           prd Acceptance로 연결된 이슈의 ## Acceptance 체크리스트를 교체
//   pnpm issue-sync --check   이슈와 prd가 어긋나면 exit 1 (수정 안 함)
//   pnpm issue-sync --close   이 브랜치의 PR이 합쳐졌는데 이슈가 열려 있으면 닫음 (사유 없는 미체크가 있으면 거부)
//   pnpm issue-sync --close 18   머지 후 main에서 — 이슈 번호로 태스크 폴더·합쳐진 PR을 찾는다 (다른 모드도 번호를 받음)
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { acceptanceSection, currentBranch, findTaskFolder, issueNumberOf, listTaskFolders, parseChecklist, parseTaskId, SPECS_DIR } from "../hooks/lib/records.mjs";

const norm = (t) => t.replace(/\s+/g, " ").trim();

export function renderChecklist(items) {
  return items.map((i) => `- [${i.checked ? "x" : " "}] ${i.text}`).join("\n");
}

/** 이슈 본문의 ## Acceptance 체크리스트를 prd 목록으로 교체 (다른 섹션은 그대로) */
export function replaceIssueAcceptance(issueBody, prdItems) {
  const m = /(^## Acceptance[^\n]*\n)([\s\S]*?)(?=^## |^---|$(?![\s\S]))/m.exec(issueBody);
  const block = renderChecklist(prdItems);
  if (!m) return `${issueBody.replace(/\s*$/, "")}\n\n## Acceptance\n${block}\n`;
  const rest = m[2].split("\n").filter((l) => !/^\s*[-*] \[( |x|X)\] /.test(l)).join("\n").trim();
  return issueBody.slice(0, m.index) + m[1] + block + "\n" + (rest ? `${rest}\n` : "") + "\n" + issueBody.slice(m.index + m[0].length).replace(/^\n+/, "");
}

/** prd와 이슈 체크리스트 비교 → 어긋난 항목 목록 */
export function compareChecklists(prdItems, issueItems) {
  const issue = new Map(issueItems.map((i) => [norm(i.text), i.checked]));
  const prd = new Map(prdItems.map((i) => [norm(i.text), i.checked]));
  const diffs = [];
  for (const [text, checked] of prd) {
    if (!issue.has(text)) diffs.push(`이슈에 없음: ${text}`);
    else if (issue.get(text) !== checked) diffs.push(`상태 다름 (prd ${checked ? "체크" : "미체크"} / 이슈 ${issue.get(text) ? "체크" : "미체크"}): ${text}`);
  }
  for (const text of issue.keys()) if (!prd.has(text)) diffs.push(`prd에 없음: ${text}`);
  return diffs;
}

/** 이슈 번호로 태스크 폴더 찾기 — prd.md의 "- **이슈:** #N" 기준 */
export function findFolderByIssue(projectDir, issue) {
  return listTaskFolders(projectDir).find((name) => {
    const prd = join(projectDir, SPECS_DIR, name, "prd.md");
    return existsSync(prd) && issueNumberOf(readFileSync(prd, "utf8")) === String(issue);
  });
}

/** 합쳐진 PR 중 이 태스크 번호의 브랜치(task/·fix/)에서 온 것 — 최근 것 먼저 */
export function mergedPrsOfTask(prs, taskId) {
  return prs.filter((pr) => parseTaskId(pr.headRefName) === taskId).sort((a, b) => b.number - a.number);
}

/** 대상 결정: 이슈 번호를 주면 그 이슈의 폴더, 없으면 지금 브랜치의 폴더 */
export function resolveTarget(projectDir, branch, issueArg) {
  if (issueArg) {
    const folder = findFolderByIssue(projectDir, issueArg);
    return folder ? { folder, taskId: folder.slice(0, 4) } : { error: `prd에 "- **이슈:** #${issueArg}"인 태스크 폴더가 없습니다` };
  }
  const taskId = parseTaskId(branch);
  const folder = findTaskFolder(projectDir, taskId);
  return folder ? { folder, taskId, branch } : { error: `태스크 브랜치가 아니거나 폴더가 없습니다: ${branch} (머지 후 main이면 pnpm issue-sync --close <이슈번호>)` };
}

export const MODES = ["--check", "--close"];

/** 인자 해석 — 모르는 인자는 기본 동작(이슈 수정)으로 흘려보내지 않고 오류로 */
export function parseArgs(argv) {
  let mode;
  let issueArg;
  for (const a of argv) {
    if (MODES.includes(a) && !mode) mode = a;
    else if (/^#?\d+$/.test(a) && !issueArg) issueArg = a.replace("#", "");
    else return { error: `알 수 없는 인자: "${a}" (사용법: pnpm issue-sync [--check|--close] [이슈번호])` };
  }
  return { mode, issueArg };
}

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
  const parsed = parseArgs(process.argv.slice(2));
  const { mode, issueArg } = parsed;
  const fail = (msg) => {
    console.log(`  ❌ ${msg}`);
    process.exit(1);
  };
  if (parsed.error) fail(parsed.error);
  const target = resolveTarget(root, currentBranch(root), issueArg);
  if (target.error) fail(target.error);
  const { folder, taskId } = target;
  const prd = readFileSync(join(root, SPECS_DIR, folder, "prd.md"), "utf8");
  const issue = issueNumberOf(prd);
  if (issueArg && issue !== issueArg) fail(`${folder}의 이슈가 #${issue}입니다 (요청 #${issueArg})`);
  if (!issue) fail(`${folder}/prd.md에 "- **이슈:** #번호"가 없습니다`);
  const prdItems = parseChecklist(acceptanceSection(prd));
  const { body, state } = JSON.parse(gh(["issue", "view", issue, "--json", "body,state"]));
  const issueItems = parseChecklist(acceptanceSection(body));

  if (mode === "--check") {
    const diffs = compareChecklists(prdItems, issueItems);
    if (diffs.length) fail(`이슈 #${issue}와 prd가 어긋남:\n${diffs.map((d) => `     - ${d}`).join("\n")}\n     → pnpm issue-sync 로 맞추세요`);
    console.log(`  ✅ 이슈 #${issue} ↔ prd 체크박스 일치 (${prdItems.filter((i) => i.checked).length}/${prdItems.length} 체크)`);
  } else if (mode === "--close") {
    const abandoned = prdItems.filter((i) => !i.checked && !i.reasoned);
    if (abandoned.length) fail(`사유 없는 미체크가 ${abandoned.length}개 있어 닫지 않습니다: ${abandoned.map((i) => i.text).join(" / ")}`);
    const merged = JSON.parse(gh(["pr", "list", "--state", "merged", "--limit", "200", "--json", "number,headRefName"]));
    const prs = mergedPrsOfTask(merged, taskId);
    if (!prs.length) fail(`태스크 ${taskId}(task/·fix/ 브랜치)의 합쳐진 PR이 없습니다`);
    if (state === "CLOSED") console.log(`  ✅ 이슈 #${issue}는 이미 닫혀 있음`);
    else {
      gh(["issue", "close", issue, "--comment", `PR #${prs[0].number} 합쳐짐 — 완료 조건 ${prdItems.filter((i) => i.checked).length}/${prdItems.length} (pnpm issue-sync --close)`]);
      console.log(`  ✅ 이슈 #${issue} 닫음 (PR #${prs[0].number} 합쳐짐, 자동으로 닫히지 않았던 경우)`);
    }
  } else {
    const next = replaceIssueAcceptance(body, prdItems);
    if (next === body) console.log(`  ✅ 이슈 #${issue} 이미 prd와 같음`);
    else {
      const file = join(mkdtempSync(join(tmpdir(), "issue-sync-")), "body.md");
      writeFileSync(file, next);
      gh(["issue", "edit", issue, "--body-file", file]);
      console.log(`  ✅ 이슈 #${issue} 체크리스트를 prd에 맞춤 (${prdItems.filter((i) => i.checked).length}/${prdItems.length} 체크)`);
    }
  }
}
