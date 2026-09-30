#!/usr/bin/env node
// 체크박스 한 곳 관리 — 원본은 prd.md의 ## Acceptance, 이슈는 복사본.
//   pnpm issue-sync           prd Acceptance로 연결된 이슈의 ## Acceptance 체크리스트를 교체
//   pnpm issue-sync --check   이슈와 prd가 어긋나면 exit 1 (수정 안 함)
//   pnpm issue-sync --close   이 브랜치의 PR이 합쳐졌는데 이슈가 열려 있으면 닫음 (사유 없는 미체크가 있으면 거부)
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { acceptanceSection, currentBranch, findTaskFolder, issueNumberOf, parseChecklist, parseTaskId, SPECS_DIR } from "../hooks/lib/records.mjs";

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

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
  const mode = process.argv[2];
  const fail = (msg) => {
    console.log(`  ❌ ${msg}`);
    process.exit(1);
  };
  const branch = currentBranch(root);
  const folder = findTaskFolder(root, parseTaskId(branch));
  if (!folder) fail(`태스크 브랜치가 아니거나 폴더가 없습니다: ${branch}`);
  const prd = readFileSync(join(root, SPECS_DIR, folder, "prd.md"), "utf8");
  const issue = issueNumberOf(prd);
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
    const prs = JSON.parse(gh(["pr", "list", "--head", branch, "--state", "merged", "--json", "number"]));
    if (!prs.length) fail(`브랜치 ${branch}의 합쳐진 PR이 없습니다`);
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
