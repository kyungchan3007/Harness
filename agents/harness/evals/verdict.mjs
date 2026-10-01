#!/usr/bin/env node
// 판정서 상태와 다음 차례.  pnpm verdict [NNNN]  (번호 없으면 현재 작업 브랜치)
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { currentBranch, findTaskFolder, parseTaskId, REQUEST_FILE, SPECS_DIR } from "../hooks/lib/records.mjs";
import { MAX_REJECTIONS, NEXT_LABEL, parseVerdict, verdictStatus } from "../hooks/lib/verdict.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const id = process.argv[2] ?? parseTaskId(currentBranch(root));
const folder = findTaskFolder(root, id);
if (!folder) {
  console.log(`  ❌ 작업 ${id ?? "(번호 없음)"} 폴더가 없습니다`);
  process.exit(1);
}
const file = join(root, SPECS_DIR, folder, "verdict.md");
const requireSourceCheck = existsSync(join(root, SPECS_DIR, folder, REQUEST_FILE)); // 원문이 있으면 회차마다 원문 대조 필수 (0022)
const s = verdictStatus(existsSync(file) ? parseVerdict(readFileSync(file, "utf8"), { requireSourceCheck }) : []);
console.log(`  ${folder} — 판정 ${s.rounds}회 · 반려 ${s.rejections}/${MAX_REJECTIONS}`);
console.log(`  다음: ${NEXT_LABEL[s.next]}`);
for (const p of s.problems) console.log(`  ⚠️ ${p}`);
process.exit(s.problems.length ? 1 : 0);
