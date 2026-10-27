// 0039 장치 자체 검증 — 기준 구현·시작 코드 채점, 단계별 공개 범위, 위치 안내 제거
import { cpSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LAB_DIR, REFERENCE_FILE, REPO_ROOT, START_DIR, workDir } from "../ontology-large/lib.mjs";
import { LOCATION_ZONE, SPLIT, TASK_H0, locationHints, scoreIsolated } from "./lib.mjs";
import { harnessAgents } from "./run.mjs";

let fail = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`); if (!ok) fail++; };
const clone = (n) => join(REPO_ROOT, ".tmp-work", `selfcheck-${n}`);

const ref = workDir("sh-ref");
cpSync(REFERENCE_FILE, join(ref, LAB_DIR, "lab.ts"));
const dev = scoreIsolated(ref, "gate", clone("dev"));
check("기준 구현 개발 단계: 학습 100 · 명시 100 · 회귀 45", dev.train === 100 && dev.explicit === 100 && dev.regression.passed === 45, JSON.stringify({ train: dev.train, explicit: dev.explicit, reg: dev.regression.passed }));
check("개발 단계엔 평가·결합 규칙이 실행되지 않음", [...SPLIT.eval, ...SPLIT.combined].every((id) => !dev.byRule[id]) && dev.eval === undefined);
const fin = scoreIsolated(ref, "final", clone("fin"));
check("기준 구현 최종: 평가 100 · 결합 100", fin.eval === 100 && fin.combined === 100 && fin.train === 100, JSON.stringify({ eval: fin.eval, combined: fin.combined }));

const start = workDir("sh-start");
cpSync(join(START_DIR, LAB_DIR), join(start, LAB_DIR), { recursive: true });
cpSync(join(REPO_ROOT, "experiments/ontology-large/types.ts"), join(start, LAB_DIR, "types.ts"));
const st = scoreIsolated(start, "final", clone("start"));
check("시작 코드: 회귀 45 유지 · 학습·평가 미달", st.regression.passed === 45 && st.train < 100 && st.eval < 100, JSON.stringify({ train: st.train, eval: st.eval, reg: st.regression.passed }));

check("H0 요청에 위치 안내 없음", locationHints(TASK_H0).length === 0, JSON.stringify(locationHints(TASK_H0)));
const hubAgents = readFileSync(join(REPO_ROOT, "AGENTS.md"), "utf8");
const a0 = harnessAgents(hubAgents.replace(/\| Context \| [^\n]*\|/, "| Context | [architecture](agents/context/architecture.md) · 정책 문서 [docs/](docs/) |"), "");
check("H0 AGENTS.md에서 docs 목록 제거", locationHints(a0).length === 0, JSON.stringify(locationHints(a0)));
check("H-location 개선 구역 = 따를 계약 (≤800자)", LOCATION_ZONE.includes("docs/") && LOCATION_ZONE.length <= 800, `${LOCATION_ZONE.length}자`);

console.log(fail ? `❌ ${fail}건 실패` : "✅ 0039 자체 검증 통과");
process.exit(fail ? 1 : 0);
