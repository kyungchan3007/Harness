// 0027 의도 일치 채점·대화형 실행의 순수 함수 (단위 테스트 대상)

/** 연결 파일은 값 전달만 — 곱셈·나눗셈·나머지·Math·0이 아닌 숫자가 있으면 계산을 한 것으로 본다 (뺄셈은 "할인 후 금액"을 넘길 때 필요해서 허용) */
export function plumbingProblems(adapterText) {
  const code = adapterText.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""');
  const problems = [];
  if (/[*/%](?![*/])/.test(code.replace(/\/\/|\/\*|\*\//g, ""))) problems.push("곱셈·나눗셈·나머지 연산");
  if (/\bMath\./.test(code)) problems.push("Math 사용");
  if (/(?<![\w.])(?!0\b)\d+(?:\.\d+)?(?![\w])/.test(code)) problems.push("0이 아닌 숫자");
  return problems;
}

/** "T3 쿠폰 주문은 절반 (M3·M4)" → { t: "T3", items: ["M3","M4"] } */
export function testIds(title) {
  const t = /^T\d+/.exec(title)?.[0];
  const items = /\(([^)]*)\)\s*$/.exec(title)?.[1].match(/M\d+/g) ?? [];
  return t ? { t, items } : undefined;
}

/** vitest JSON → 통과한 T번호·애매한 곳별 일치 */
export function summarizeOracle(json, titles) {
  const results = (json?.testResults ?? []).flatMap((f) => f.assertionResults ?? []);
  const passed = new Set(results.filter((r) => r.status === "passed").map((r) => testIds(r.title)?.t).filter(Boolean));
  const items = {};
  for (const title of titles) {
    const id = testIds(title);
    if (id) for (const m of id.items) items[m] = (items[m] ?? true) && passed.has(id.t);
  }
  return { passed: [...passed].sort(), total: titles.length, score: passed.size, items };
}

/** 구현 파일이 없고 마지막 메시지에 물음이 있으면 "답을 기다리는 중" */
export function isWaitingForAnswer({ implemented, finalMessage }) {
  return !implemented && /\?|？|확인.{0,6}(필요|부탁)|알려 ?주/.test(finalMessage ?? "");
}

/**
 * 요청자 답장을 코드로 만든다 — AI는 "질문 n번이 어떤 항목을 묻는가"만 분류하고, 답 문장은 intent.json에서 그대로 꺼낸다.
 * (첫 시도에서 요청자 AI가 답장을 직접 쓰자 묻지 않은 항목(M1 배송비)까지 덧붙였다)
 */
export function composeAnswer(questions, intent) {
  const used = new Set();
  let usedInterface = false;
  const lines = questions.map(({ n, items = [], interface: iface = false }) => {
    const parts = items.filter((m) => intent.answers[m]).map((m) => (used.add(m), intent.answers[m]));
    if (iface) { usedInterface = true; parts.push(intent.interface); }
    return `${n}. ${parts.length ? parts.join(" ") : intent.unknown}`;
  });
  return { answer: lines.join("\n"), usedItems: [...used].sort(), usedInterface };
}
