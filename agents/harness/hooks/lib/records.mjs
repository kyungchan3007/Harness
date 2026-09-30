// 기록 강제 판정 로직 — hooks(guard·stop-check·session-context)와 게이트가 모두 이 모듈을 쓴다.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const SPECS_DIR = "agents/intent/specs";
export const TASKS_FILE = "agents/orchestration/TASKS.md";
export const RECORD_PREFIXES = ["agents/intent/", "agents/orchestration/", "agents/JOURNAL.md", "LEARNINGS.md"];

/** 기록 경로(항상 수정 허용)인지. 프로젝트 기준 상대 경로를 받는다 */
export function isRecordPath(relPath) {
  return RECORD_PREFIXES.some((prefix) => relPath === prefix || relPath.startsWith(prefix));
}

/** task/NNNN-* 와 fix/NNNN-* 모두 태스크 NNNN 소속 (fix는 원 이슈·원 태스크 폴더를 쓴다) */
export function parseTaskId(branch) {
  return /^(?:task|fix)\/(\d{4})-/.exec(branch ?? "")?.[1];
}

export function isFixBranch(branch) {
  return /^fix\/\d{4}-/.test(branch ?? "");
}

/** 이 번호부터는 prd에 연결된 GitHub 이슈 번호가 필수 (이전 태스크는 이슈 없이 진행됨) */
export const ISSUE_REQUIRED_FROM = "0021";
export const ISSUE_LINE = /^- \*\*이슈:\*\* #(\d+)/m;

export function issueNumberOf(prdText) {
  return ISSUE_LINE.exec(prdText ?? "")?.[1];
}

export function git(projectDir, args) {
  try {
    return execFileSync("git", ["-C", projectDir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

export function currentBranch(projectDir) {
  // symbolic-ref는 커밋이 없는 새 repo에서도 브랜치 이름을 준다
  return process.env.GITHUB_HEAD_REF || git(projectDir, ["symbolic-ref", "--short", "HEAD"]) || git(projectDir, ["rev-parse", "--abbrev-ref", "HEAD"]);
}

export function listTaskFolders(projectDir) {
  const dir = join(projectDir, SPECS_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}-/.test(d.name))
    .map((d) => d.name);
}

export function findTaskFolder(projectDir, id) {
  return id ? listTaskFolders(projectDir).find((name) => name.startsWith(`${id}-`)) : undefined;
}

// ── 템플릿 탐지 ─────────────────────────────────────────────

function sectionField(text, label) {
  const lines = text.split("\n");
  const i = lines.findIndex((line) => line.startsWith(`- **${label}:**`));
  if (i === -1) return "";
  const inline = lines[i].slice(`- **${label}:**`.length).trim();
  if (inline) return inline;
  const next = lines[i + 1] ?? "";
  // 하위 항목은 불릿(-)이나 번호 목록(1.) 모두 인정
  return /^\s+(-|\d+\.)\s+\S/.test(next) ? next.trim() : "";
}

export function checkPrd(text, id) {
  const problems = [];
  const title = text.split("\n")[0] ?? "";
  if (!title.startsWith(`# ${id}`) || /NNNN|— 제목 —/.test(title)) problems.push(`제목을 "# ${id} — <태스크 제목> — PRD"로 채우세요`);
  const acceptance = text.split(/^## Acceptance\s*$/m)[1]?.split(/^## /m)[0] ?? "";
  if (!/^- \[[ x]\] \S/m.test(acceptance)) problems.push("## Acceptance에 내용 있는 체크박스를 1개 이상 쓰세요");
  if (id >= ISSUE_REQUIRED_FROM && !issueNumberOf(text)) {
    problems.push('"- **이슈:** #번호" 줄이 없습니다. 이슈를 먼저 만들고 그 이슈에서 브랜치를 만드세요 (gh issue develop <번호> --name task/NNNN-슬러그 --checkout)');
  }
  return problems;
}

export const SDD_REQUIRED = ["접근", "대안·트레이드오프", "검증 계획"];

export function checkSdd(text) {
  return SDD_REQUIRED.filter((label) => !sectionField(text, label)).map((label) => `"${label}" 항목을 채우세요`);
}

/** trace 제도(0008)가 생기기 전 태스크만 "과정 기록 누락" 표기로 trace 행 검사를 면제한다 */
export const TRACE_REQUIRED_FROM = "0008";
export const TRACE_OMITTED_MARK = "> **과정 기록 누락:**";

export function checkTrace(text, id = TRACE_REQUIRED_FROM) {
  if (text.includes(TRACE_OMITTED_MARK)) {
    return id < TRACE_REQUIRED_FROM ? [] : [`"과정 기록 누락" 표기는 ${TRACE_REQUIRED_FROM} 이전 태스크만 쓸 수 있습니다. 판단·이유를 표에 기록하세요`];
  }
  const rows = text
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|\s*-/.test(line))
    .slice(1) // 헤더
    .map((line) => line.split("|").map((cell) => cell.trim()));
  return rows.some((cells) => cells[3]) ? [] : ['표에 "한 일"을 채운 행을 1개 이상 쓰세요'];
}

// ── 체크박스 (원본 = prd.md의 ## Acceptance) ─────────────────

/** 미체크 항목에 이 표지가 있으면 "사유 있는 미체크"(후속으로 넘김 등) */
export const REASON_MARK = /후속|다음|이후|보류|제외|대체|범위 밖|비목표|사유|별도|#\d+|→/;

export function acceptanceSection(prdText) {
  return prdText.split(/^## Acceptance\s*$/m)[1]?.split(/^## /m)[0] ?? "";
}

export function parseChecklist(text) {
  const items = [];
  for (const line of text.split("\n")) {
    const m = /^\s*[-*] \[( |x|X)\] (.+)$/.exec(line);
    if (!m) continue;
    const checked = m[1] !== " ";
    items.push({ text: m[2].trim(), checked, reasoned: !checked && REASON_MARK.test(m[2]) });
  }
  return items;
}

/** TASKS.md에서 태스크의 status 칸 */
export function taskStatus(tasksText, id) {
  const row = tasksText.split("\n").find((line) => new RegExp(`^\\|\\s*${id}\\s*\\|`).test(line));
  return row?.split("|")[4]?.trim();
}

export function hasTasksRow(tasksText, id) {
  return new RegExp(`^\\|\\s*${id}\\s*\\|`, "m").test(tasksText);
}

/**
 * 태스크 폴더의 기록 상태. problems가 비어 있으면 통과.
 * @param {{ requireTrace?: boolean }} opts trace는 코드 수정 전에는 요구하지 않는다
 */
export function inspectTask(projectDir, folder, { requireTrace = true } = {}) {
  const id = folder.slice(0, 4);
  const dir = join(projectDir, SPECS_DIR, folder);
  const read = (name) => (existsSync(join(dir, name)) ? readFileSync(join(dir, name), "utf8") : undefined);
  const problems = [];

  const prd = read("prd.md");
  if (prd === undefined) problems.push(`${SPECS_DIR}/${folder}/prd.md 가 없습니다 (템플릿: agents/intent/templates/prd.md)`);
  else problems.push(...checkPrd(prd, id).map((p) => `prd.md: ${p}`));

  const sdd = read("sdd.md");
  if (sdd === undefined) problems.push(`${SPECS_DIR}/${folder}/sdd.md 가 없습니다 (템플릿: agents/intent/templates/sdd.md)`);
  else problems.push(...checkSdd(sdd).map((p) => `sdd.md: ${p}`));

  if (requireTrace) {
    const trace = read("trace.md");
    if (trace === undefined) problems.push(`${SPECS_DIR}/${folder}/trace.md 가 없습니다 (템플릿: agents/intent/templates/trace.md)`);
    else problems.push(...checkTrace(trace, id).map((p) => `trace.md: ${p}`));
  }

  const tasksPath = join(projectDir, TASKS_FILE);
  const tasks = existsSync(tasksPath) ? readFileSync(tasksPath, "utf8") : "";
  if (!hasTasksRow(tasks, id)) problems.push(`${TASKS_FILE}에 ${id} 행이 없습니다 (owner·status=in-progress로 추가)`);

  // 완료(done)로 표시한 작업은 prd의 완료 조건이 모두 체크됐거나, 미체크면 사유가 있어야 한다
  if (prd !== undefined && taskStatus(tasks, id) === "done") {
    const abandoned = parseChecklist(acceptanceSection(prd)).filter((i) => !i.checked && !i.reasoned);
    for (const item of abandoned) problems.push(`prd.md: done인데 사유 없이 미체크된 완료 조건 — "${item.text.slice(0, 60)}" (체크하거나 "(후속 #번호)"처럼 사유를 적으세요)`);
  }

  return problems;
}

// ── PreToolUse 판정 ─────────────────────────────────────────

/** 코드 수정 허용 여부. 차단이면 에이전트에게 보여줄 이유를 돌려준다 */
export function decideEdit(projectDir, relPath) {
  if (relPath.startsWith("..") || relPath.startsWith("/")) return { allow: true };
  if (isRecordPath(relPath)) return { allow: true };

  const branch = currentBranch(projectDir);
  const id = parseTaskId(branch);
  if (!id) {
    return {
      allow: false,
      reason: [
        `[기록 강제] ${relPath} 수정 차단: 현재 브랜치(${branch || "알 수 없음"})가 태스크 브랜치가 아닙니다.`,
        "먼저 할 일:",
        "1. 이슈 먼저: gh issue create → gh issue develop <이슈> --name task/NNNN-슬러그 --base main --checkout",
        "   (기존 이슈 작업의 fix면 새 이슈 없이 그 이슈에서 fix/NNNN-슬러그)",
        `2. ${TASKS_FILE}에 행 추가 (owner·status=in-progress)`,
        `3. ${SPECS_DIR}/NNNN-슬러그/에 prd.md·sdd.md·trace.md 작성 (agents/intent/templates/)`,
      ].join("\n"),
    };
  }

  const folder = findTaskFolder(projectDir, id);
  if (!folder) {
    return {
      allow: false,
      reason: `[기록 강제] ${relPath} 수정 차단: 태스크 ${id} 폴더가 없습니다.\n${SPECS_DIR}/${id}-슬러그/ 에 prd.md·sdd.md·trace.md를 먼저 작성하세요 (agents/intent/templates/).`,
    };
  }

  const problems = inspectTask(projectDir, folder, { requireTrace: false });
  if (problems.length > 0) {
    return {
      allow: false,
      reason: `[기록 강제] ${relPath} 수정 차단: 코드보다 PRD·SDD·TASKS가 먼저입니다.\n${problems.map((p) => `- ${p}`).join("\n")}`,
    };
  }
  return { allow: true };
}

// ── Stop 판정 ───────────────────────────────────────────────

export function changedFiles(projectDir) {
  const base = git(projectDir, ["merge-base", "HEAD", "main"]) || git(projectDir, ["merge-base", "HEAD", "origin/main"]);
  const committed = base ? git(projectDir, ["diff", "--name-only", `${base}...HEAD`]) : "";
  const working = git(projectDir, ["diff", "--name-only", "HEAD"]);
  const staged = git(projectDir, ["diff", "--name-only", "--cached"]);
  const untracked = git(projectDir, ["ls-files", "--others", "--exclude-standard"]);
  return [...new Set([committed, working, staged, untracked].join("\n").split("\n").filter(Boolean))];
}

/** 응답 종료 전 기록 점검. 문제가 있으면 problems를 돌려준다 */
export function checkBeforeStop(projectDir) {
  const changed = changedFiles(projectDir);
  const codeChanged = changed.filter((f) => !isRecordPath(f));
  if (codeChanged.length === 0) return [];

  const branch = currentBranch(projectDir);
  const id = parseTaskId(branch);
  if (!id) return [`태스크 브랜치가 아닌 ${branch || "알 수 없는 브랜치"}에서 코드가 바뀌었습니다: ${codeChanged.slice(0, 5).join(", ")}`];

  const folder = findTaskFolder(projectDir, id);
  if (!folder) return [`태스크 ${id} 폴더(${SPECS_DIR}/${id}-슬러그/)가 없습니다`];

  const problems = inspectTask(projectDir, folder);
  if (!changed.includes(`${SPECS_DIR}/${folder}/trace.md`)) {
    problems.push(`trace.md가 이번 태스크에서 갱신되지 않았습니다. 판단·이유·막힘·되돌림을 기록하세요`);
  }
  return problems;
}
