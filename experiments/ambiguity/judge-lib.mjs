// 모호한 요청 실험 판정 — 순수 함수 (0024)
export const LABELS = ["asked", "assumed", "silent"];

/** 채점 AI 응답에서 JSON만 꺼낸다 (앞뒤 설명·코드 울타리 허용) */
export function parseJudgment(text) {
  const m = /\{[\s\S]*\}/.exec(text ?? "");
  if (!m) throw new Error("판정 JSON 없음");
  const j = JSON.parse(m[0]);
  for (const [id, v] of Object.entries(j.items ?? {})) {
    if (!LABELS.includes(v?.label)) throw new Error(`${id}: 알 수 없는 판정 ${v?.label}`);
    // asked·assumed는 근거 문장 인용이 있어야 인정 — 채점 AI가 "명시 안 함"이라 쓰고 assumed로 판정한 사례(시범 A-1)를 막는다
    if (v.label !== "silent" && !String(v.flagQuote ?? "").trim()) {
      v.downgradedFrom = v.label;
      v.label = "silent";
    }
  }
  return j;
}

/** 실행별 판정 → 실험군별 집계 */
export function tally(runs, ids) {
  const groups = {};
  for (const r of runs) {
    const g = (groups[r.group] ??= { runs: 0, asked: 0, assumed: 0, silent: 0, majorSilent: 0, clearAsked: 0, implemented: 0, stoppedToAsk: 0 });
    g.runs++;
    if (r.implemented) g.implemented++;
    if (!r.implemented && r.judgment.items && Object.values(r.judgment.items).some((v) => v.label === "asked")) g.stoppedToAsk++;
    for (const { id, weight } of ids) {
      const label = r.judgment.items?.[id]?.label ?? "silent";
      g[label]++;
      if (label === "silent" && weight === "major") g.majorSilent++;
    }
    g.clearAsked += (r.judgment.clearAsked ?? []).length;
  }
  return groups;
}
