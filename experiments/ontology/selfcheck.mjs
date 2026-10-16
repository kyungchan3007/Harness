// 채점 장치 자체 검증(0037) — node experiments/ontology/selfcheck.mjs  (pnpm check에 연결)
// 1) 구현 없음 → 숨겨진 테스트 전부 실패  2) 기준 구현 → 전부 통과 + C 검사 통과
// 3) 틀린 구현마다 노린 숨겨진 테스트가 실패  4) C 검사는 틀린 구현을 몇 개 잡나(참고 — 채점과 독립이라 다 못 잡아도 됨)
// 5) B·C 온톨로지가 원문 규칙 R1~R8을 모두 출처로 갖고, 숨겨진 테스트의 ID·값을 담지 않는다
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CHECK_FILE, IMPL_PATH, ONTO_DIR, ONTO_JSON, ONTO_MD, ORACLE_FILE, REFERENCE_FILE, runCheck, scoreLab, trapIds, workDir } from "./lib.mjs";
import { MUTANTS } from "./mutants.mjs";

export function runSelfcheck({ log = console.log } = {}) {
  const problems = [];
  const reference = readFileSync(REFERENCE_FILE, "utf8");
  const ids = trapIds();
  const dir = workDir("selfcheck");
  try {
    const empty = scoreLab(dir);
    log(`  구현 없음: ${empty.passed}/${empty.total}`);
    if (empty.passed !== 0) problems.push(`구현이 없는데 ${empty.passed}개 통과`);
    if (ids.length < 30) problems.push(`숨겨진 테스트가 너무 적음: ${ids.length}`);

    writeFileSync(join(dir, IMPL_PATH), reference);
    const ref = scoreLab(dir);
    log(`  기준 구현: ${ref.passed}/${ref.total} · 대조 ${ref.diff.passed}/${ref.diff.total}`);
    if (ref.passed !== ref.total) problems.push(`기준 구현이 숨겨진 테스트 실패: ${ref.failed.join(" ")}`);
    if (ref.diff.passed !== ref.diff.total) problems.push(`기준 구현이 무작위 대조 실패: ${ref.diff.firstFailures.join(" / ")}`);
    if (empty.diff.passed !== 0) problems.push(`구현이 없는데 무작위 대조 ${empty.diff.passed}개 통과`);

    mkdirSync(join(dir, ONTO_DIR), { recursive: true });
    cpSync(CHECK_FILE, join(dir, ONTO_DIR, "check.test.ts"));
    cpSync(ONTO_JSON, join(dir, ONTO_DIR, "ontology.json"));
    const refCheck = runCheck(dir);
    log(`  기준 구현 C 검사: ${refCheck.passed ? "통과" : `실패 ${refCheck.failed.join(" ")}`}`);
    if (!refCheck.passed) problems.push(`기준 구현이 C 검사 실패(오탐): ${refCheck.failed.join(" ") || "실행 안 됨"}`);

    let caughtByCheck = 0;
    for (const m of MUTANTS) {
      if (!reference.includes(m.find)) { problems.push(`틀린 구현을 적용할 수 없음: ${m.name}`); continue; }
      writeFileSync(join(dir, IMPL_PATH), reference.replace(m.find, m.replace));
      const r = scoreLab(dir);
      const missed = m.expect.filter((id) => r.tests[id]);
      if (missed.length) problems.push(`"${m.name}"이 ${missed.join(" ")}에서 안 걸림`);
      const c = runCheck(dir);
      if (!c.passed) caughtByCheck++;
      log(`  ${missed.length ? "❌" : "✅"} ${m.name}: 숨겨진 ${r.passed}/${r.total} · 대조 ${r.diff.passed}/20 · C 검사 ${c.passed ? "통과(못 잡음)" : `잡음 ${c.failed.join(",")}`}`);
    }
    log(`  C 검사가 잡은 틀린 구현: ${caughtByCheck}/${MUTANTS.length} (참고)`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  // B·C에 새 사실·정답 값이 들어가지 않았는지 — 출처 R1~R8 모두, 숨겨진 테스트 전용 ID(K1·KS·P1…)는 없어야
  const oracleIds = [...new Set([...readFileSync(ORACLE_FILE, "utf8").matchAll(/"(K[0-9S]|P[0-9]|L[0-9]|Q[0-9]|[a-z][0-9])"/g)].map((m) => m[1]))];
  for (const [name, file] of [["B", ONTO_MD], ["C", ONTO_JSON]]) {
    const text = readFileSync(file, "utf8");
    for (let i = 1; i <= 8; i++) if (!text.includes(`R${i}`)) problems.push(`${name} 온톨로지에 출처 R${i} 없음`);
    const leaked = oracleIds.filter((id) => new RegExp(`(?<![A-Za-z0-9])${id}(?![A-Za-z0-9])`).test(text));
    if (leaked.length) problems.push(`${name} 온톨로지에 숨겨진 테스트 ID: ${leaked.join(" ")}`);
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("온톨로지 실험 채점 장치 자체 검증 (0037)");
  const problems = runSelfcheck();
  for (const p of problems) console.error(`  ❌ ${p}`);
  if (problems.length) process.exit(1);
  console.log("  ✅ 통과");
}
