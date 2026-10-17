// 채점 장치 자체 검증(0038) — node experiments/ontology-large/selfcheck.mjs  (pnpm check에 연결)
// 1) 시작 코드 → 누락 규칙 0점, 0037 회귀 45/45  2) 기준 구현 → 누락·명시·결합 100, 회귀 45, 두 대조 20/20, C 검사 통과(오탐 없음)
// 3) 틀린 구현마다 노린 숨겨진 테스트가 실패  4) C 검사가 잡은 틀린 구현 수(참고)
// 5) B·C 온톨로지가 R1~R12를 모두 출처로 갖고 숨겨진 테스트 전용 ID를 담지 않는다  6) 규칙 대장 = 숨겨진 테스트
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CHECK_FILE, IMPL_PATH, LAB_DIR, ONTO_DIR, ONTO_JSON, ONTO_MD, ORACLE_FILE, REFERENCE_FILE, RULES, START_DIR, runCheck, scoreLab, workDir } from "./lib.mjs";
import { MUTANTS } from "./mutants.mjs";

export function runSelfcheck({ log = console.log } = {}) {
  const problems = [];
  const reference = readFileSync(REFERENCE_FILE, "utf8");
  const dir = workDir("selfcheck38");
  try {
    for (const f of readdirSync(join(START_DIR, LAB_DIR))) cpSync(join(START_DIR, LAB_DIR, f), join(dir, LAB_DIR, f));
    const start = scoreLab(dir);
    log(`  시작 코드: 누락 ${start.missing.score} · 명시 ${start.explicit.score} · 결합 ${start.combined.score} · 회귀 ${start.regression.passed}/45 · 새 대조 ${start.diff.passed}/20`);
    if (start.missing.score !== 0) problems.push(`시작 코드가 누락 규칙 ${start.missing.score}점`);
    if (start.regression.passed !== 45) problems.push(`시작 코드 회귀 ${start.regression.passed}/45`);
    if (start.diff.passed !== 0) problems.push(`시작 코드가 새 대조 ${start.diff.passed}개 통과`);

    rmSync(join(dir, LAB_DIR), { recursive: true, force: true });
    mkdirSync(join(dir, LAB_DIR), { recursive: true });
    cpSync(join(START_DIR, "..", "types.ts"), join(dir, LAB_DIR, "types.ts"));
    writeFileSync(join(dir, IMPL_PATH), reference);
    const ref = scoreLab(dir);
    log(`  기준 구현: 누락 ${ref.missing.score} · 명시 ${ref.explicit.score} · 결합 ${ref.combined.score} · 회귀 ${ref.regression.passed}/45 · 0037 대조 ${ref.legacyDiff.passed}/20 · 새 대조 ${ref.diff.passed}/20`);
    for (const k of ["missing", "explicit", "combined"]) if (ref[k].score !== 100) problems.push(`기준 구현 ${k} ${ref[k].score}`);
    if (ref.regression.passed !== 45 || ref.legacyDiff.passed !== 20 || ref.diff.passed !== 20) problems.push("기준 구현이 회귀·대조 실패");
    if (ref.incomplete.length) problems.push(`규칙 대장과 테스트 수 불일치: ${ref.incomplete.join(" ")}`);

    mkdirSync(join(dir, ONTO_DIR), { recursive: true });
    cpSync(CHECK_FILE, join(dir, ONTO_DIR, "check.test.ts"));
    cpSync(ONTO_JSON, join(dir, ONTO_DIR, "ontology.json"));
    const refCheck = runCheck(dir);
    log(`  기준 구현 C 검사: ${refCheck.passed ? "통과" : `실패 ${refCheck.failed.join(" ")}`}`);
    if (!refCheck.passed) problems.push(`기준 구현이 C 검사 실패(오탐): ${refCheck.failed.join(" ") || "실행 안 됨"}`);

    let caught = 0;
    for (const m of MUTANTS) {
      if (reference.split(m.find).length !== 2) { problems.push(`틀린 구현을 한 곳에 적용할 수 없음: ${m.name}`); continue; }
      writeFileSync(join(dir, IMPL_PATH), reference.replace(m.find, m.replace));
      const r = scoreLab(dir);
      const missed = m.expect.filter((id) => r.tests[id] !== false);
      if (missed.length) problems.push(`"${m.name}"이 ${missed.join(" ")}에서 안 걸림`);
      const c = runCheck(dir);
      if (!c.passed) caught++;
      log(`  ${missed.length ? "❌" : "✅"} ${m.name}: 누락 ${r.missing.score} · 결합 ${r.combined.score} · 새 대조 ${r.diff.passed}/20 · C ${c.passed ? "못 잡음" : `잡음 ${c.failed.join(",")}`}`);
    }
    log(`  C 검사가 잡은 틀린 구현: ${caught}/${MUTANTS.length} (참고)`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  const oracle = readFileSync(ORACLE_FILE, "utf8");
  const oracleIds = [...new Set([...oracle.matchAll(/"([A-Z][0-9]|P[0-9])"/g)].map((m) => m[1]))].filter((id) => !/^I\d/.test(id));
  for (const [name, file] of [["B", ONTO_MD], ["C", ONTO_JSON]]) {
    const text = readFileSync(file, "utf8");
    for (const src of ["engine.md", "quality.md", "storage.md", "reservations.md", "transit.md", "요청"]) if (!text.includes(src)) problems.push(`${name} 온톨로지에 출처 ${src} 없음`);
    for (let i = 1; i <= 14; i++) if (!text.includes(`"I${i}"`) && !text.includes(`| I${i} |`)) problems.push(`${name} 온톨로지에 불변식 I${i} 없음`);
    const leaked = oracleIds.filter((id) => new RegExp(`(?<![A-Za-z0-9])${id}(?![A-Za-z0-9])`).test(text));
    if (leaked.length) problems.push(`${name} 온톨로지에 숨겨진 테스트 ID: ${leaked.join(" ")}`);
  }
  const planned = RULES.reduce((a, r) => a + r.tests, 0);
  const titled = [...oracle.matchAll(/it\("R\d+\.\d+[a-z] /g)].length;
  if (planned !== titled) problems.push(`규칙 대장 ${planned}개 ≠ 숨겨진 테스트 ${titled}개`);
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("온톨로지 후속 실험 채점 장치 자체 검증 (0038)");
  const problems = runSelfcheck();
  for (const p of problems) console.error(`  ❌ ${p}`);
  if (problems.length) process.exit(1);
  console.log("  ✅ 통과");
}
