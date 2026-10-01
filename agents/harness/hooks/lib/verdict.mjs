// 검사자 판정서(verdict.md) — 회차별 판정과 다음 차례 (0014)
// 형식: "## N차 · 날짜" 아래 "판정: approved|rejected", "### 근거", "### 확인한 것"

export const MAX_REJECTIONS = 2; // 반려는 최대 2회, 3회째 반려면 막힘
export const ROLE_SPLIT_LINE = /^- \*\*역할 분리:\*\* on\b/m;

function listUnder(block, heading) {
  const part = block.split(new RegExp(`^### ${heading}\\s*$`, "m"))[1]?.split(/^#{2,3} /m)[0] ?? "";
  return part
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[-*] \S/.test(l) && !/^[-*] \(.*(필수|작성)/.test(l))
    .map((l) => l.slice(2).trim());
}

/** 판정서 → 회차 목록 [{ round, verdict, reasons, checked, problems }] */
export function parseVerdict(text = "", { requireSourceCheck = false } = {}) {
  const blocks = text.split(/^## (?=\d+차)/m).slice(1);
  return blocks.map((block) => {
    const round = Number(/^(\d+)차/.exec(block)?.[1]);
    const verdict = /^판정:\s*(approved|rejected)\s*$/m.exec(block)?.[1];
    const reasons = listUnder(block, "근거");
    const checked = listUnder(block, "확인한 것");
    const sourceChecks = listUnder(block, "원문 대조");
    const problems = [];
    // 원문이 있는 작업(0022): 통과·반려 모두 원문 기준으로 판단했는지 — 0016에서 실패는 "틀린 기준으로 통과"였다
    if (requireSourceCheck && sourceChecks.length === 0) problems.push(`${round}차: ### 원문 대조 항목이 없습니다 (request.md의 규칙별로 무엇을 대조했는지)`);
    if (!verdict) problems.push(`${round}차: "판정: approved" 또는 "판정: rejected" 줄이 없습니다`);
    if (verdict === "rejected") {
      if (reasons.length === 0) problems.push(`${round}차: 반려인데 ### 근거 항목이 없습니다`);
      for (const r of reasons) if (!/기대/.test(r) || !/실제/.test(r)) problems.push(`${round}차: 근거에 "기대"와 "실제"가 모두 있어야 합니다 — "${r.slice(0, 50)}"`);
    }
    if (verdict === "approved" && checked.length === 0) problems.push(`${round}차: 통과인데 ### 확인한 것 항목이 없습니다 (무엇을 확인하고 통과시켰는지)`);
    return { round, verdict, reasons, checked, sourceChecks, problems };
  });
}

/** 다음 차례: verifier(검사 전·재검사) | builder(반려됨) | done(통과) | blocked(반려 한도 초과) */
export function verdictStatus(rounds) {
  const problems = rounds.flatMap((r) => r.problems);
  rounds.forEach((r, i) => {
    if (r.round !== i + 1) problems.push(`회차 번호가 순서대로가 아닙니다 (${i + 1}번째 회차가 "${r.round}차")`);
  });
  const rejections = rounds.filter((r) => r.verdict === "rejected").length;
  const last = rounds.at(-1);
  let next = "verifier";
  if (rejections > MAX_REJECTIONS) next = "blocked";
  else if (last?.verdict === "approved") next = "done";
  else if (last?.verdict === "rejected") next = "builder";
  return { next, rejections, rounds: rounds.length, problems };
}

export const NEXT_LABEL = {
  verifier: "검사자 차례 — 검사 전이거나, 구현자가 고친 뒤 재검사",
  builder: "구현자 차례 — 반려 근거대로 고친 뒤 검사자에게 다시",
  done: "완료 — 최신 판정 통과",
  blocked: `막힘 — 반려가 ${MAX_REJECTIONS}회를 넘음. TASKS를 blocked로 바꾸고 사람이 판단`,
};
