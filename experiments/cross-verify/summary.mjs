// 다른 회사 검사자 실험(0036) 집계 — node experiments/cross-verify/summary.mjs  → runs/summary.json + 표
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { RUNS } from "./run.mjs";

/** 실행 기록에서 복사본 밖(원본 저장소) 경로를 찾는다 — 누출 감사 */
export const OUTSIDE = /\/Users\/[^/\s"']+\/(Documents|Desktop|Library|\.claude|\.codex)|harness-lab/;
export function outsideHits(text, copyDir) {
  return String(text)
    .split("\n")
    .filter((l) => OUTSIDE.test(l.replaceAll(copyDir, "")))
    .map((l) => l.slice(0, 160));
}

/** 검사자 하나의 성적 */
export function scoreVerifier(rows) {
  const planted = rows.filter((r) => r.defect);
  const clean = rows.filter((r) => !r.defect);
  const claims = rows.reduce((s, r) => s + (r.judge?.claims ?? 0), 0);
  const valid = rows.reduce((s, r) => s + (r.judge?.validClaims ?? 0), 0);
  const mean = (xs) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 1000) / 1000 : null);
  return {
    planted: planted.length,
    rejected: planted.filter((r) => r.verdict === "rejected").length,
    identified: planted.filter((r) => r.judge?.identified === true).length,
    rejectedWrongReason: planted.filter((r) => r.verdict === "rejected" && r.judge?.identified !== true).length,
    approvedDefect: planted.filter((r) => r.verdict === "approved").length,
    clean: clean.length,
    cleanRejected: clean.filter((r) => r.verdict === "rejected").length,
    cleanRejectedValid: clean.filter((r) => r.verdict === "rejected" && (r.judge?.validClaims ?? 0) > 0).length,
    formatErrors: rows.filter((r) => !r.verdict).length,
    claims,
    precision: claims ? Math.round((valid / claims) * 100) : null,
    meanCostUsd: mean(rows.map((r) => r.costUsd).filter((x) => x != null)),
    meanMinutes: mean(rows.map((r) => r.minutes)),
    codeChanged: rows.filter((r) => r.codeChanged).length,
  };
}

/** 두 검사자의 겹침 — 심은 결함마다 누가 짚었나 */
export function overlap(a, b) {
  const t = { both: [], onlyA: [], onlyB: [], neither: [] };
  for (const [defect, x] of Object.entries(a)) {
    const y = b[defect];
    if (y === undefined) continue;
    t[x && y ? "both" : x ? "onlyA" : y ? "onlyB" : "neither"].push(defect);
  }
  return t;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const key = Object.fromEntries(JSON.parse(readFileSync(join(RUNS, "key.json"), "utf8")).map((k) => [k.id, k]));
  const rows = readdirSync(RUNS).filter((d) => d.startsWith("case-")).flatMap((c) =>
    readdirSync(join(RUNS, c)).filter((v) => existsSync(join(RUNS, c, v, "result.json"))).map((v) => {
      const r = JSON.parse(readFileSync(join(RUNS, c, v, "result.json"), "utf8"));
      const judge = existsSync(join(RUNS, c, v, "judge.json")) ? JSON.parse(readFileSync(join(RUNS, c, v, "judge.json"), "utf8")) : undefined;
      // 누출 감사: Codex는 이벤트 기록, Claude는 그 복사본의 대화 기록
      let log = "";
      if (v === "codex") log = existsSync(join(RUNS, c, v, "codex-events.jsonl")) ? readFileSync(join(RUNS, c, v, "codex-events.jsonl"), "utf8") : "";
      else {
        const k = r.copyDir.replace(/[^A-Za-z0-9]/g, "-");
        const base = join(homedir(), ".claude", "projects");
        const d = existsSync(base) ? readdirSync(base).find((x) => x.endsWith(k.slice(-12))) : undefined;
        if (d) log = readdirSync(join(base, d)).filter((f) => f.endsWith(".jsonl")).map((f) => readFileSync(join(base, d, f), "utf8")).join("\n");
      }
      // 도구 출력(파일 내용)은 빼고, 실제로 실행한 명령·읽은 경로만 본다
      const toolLines = log.split("\n").flatMap((l) => {
        try {
          const e = JSON.parse(l);
          if (e.item?.type === "command_execution") return [e.item.command];
          const c = e.message?.content;
          return Array.isArray(c) ? c.filter((p) => p.type === "tool_use").map((p) => JSON.stringify(p.input)) : [];
        } catch {
          return [];
        }
      }).join("\n");
      return { ...r, defect: key[c].defect, name: key[c].name, judge, leak: outsideHits(toolLines, r.copyDir) };
    }));
  const by = (v) => rows.filter((r) => r.verifier === v);
  const verifiers = [...new Set(rows.map((r) => r.verifier))];
  const scores = Object.fromEntries(verifiers.map((v) => [v, scoreVerifier(by(v))]));
  const hitMap = (v) => Object.fromEntries(by(v).filter((r) => r.defect).map((r) => [r.defect, r.judge?.identified === true]));
  const pairs = verifiers.flatMap((a, i) => verifiers.slice(i + 1).map((b) => ({ a, b, ...overlap(hitMap(a), hitMap(b)) })));
  const perDefect = [...new Set(rows.filter((r) => r.defect).map((r) => r.defect))].sort().map((d) => ({ defect: d, name: rows.find((r) => r.defect === d).name, ...Object.fromEntries(verifiers.map((v) => [v, by(v).find((r) => r.defect === d)?.judge?.identified ?? null])) }));
  const leaks = rows.filter((r) => r.leak.length).map((r) => ({ case: r.case, verifier: r.verifier, hits: r.leak.slice(0, 3) }));
  const summary = { scores, pairs, perDefect, leaks, cleanFindings: rows.filter((r) => !r.defect && r.verdict === "rejected").map((r) => ({ case: r.case, verifier: r.verifier, valid: r.judge?.validClaims, note: r.judge?.note })) };
  writeFileSync(join(RUNS, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify(summary, null, 2));
}
