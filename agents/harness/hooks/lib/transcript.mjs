// 대화 기록(transcript)에서 사람이 직접 친 글만 꺼낸다 — 측정 도구(0031)와 확인됨 대조(0034)가 함께 쓴다
import { existsSync, readFileSync } from "node:fs";

/** 사람이 직접 친 부분만 — 셸 명령·출력, 시스템 안내, 붙여 넣은 글, 명령 태그를 걷어 낸다 (0031) */
const NOT_TYPED = /<(bash-input|bash-stdout|bash-stderr|system-reminder|pasted_content|local-command-[a-z]+|command-[a-z]+|task-notification)\b[^>]*>[\s\S]*?<\/\1>|<[a-z-]+\/>/g;
export function typedText(content) {
  return String(content ?? "").replace(NOT_TYPED, " ").trim();
}

export function readTranscript(path) {
  return path && existsSync(path) ? readFileSync(path, "utf8").split("\n") : [];
}

/** 사람 메시지(순서대로) — 도구 결과·메타·대화 요약 제외, 같은 uuid는 한 번 */
export function humanMessages(lines) {
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    if (o?.type !== "user" || o.isMeta || o.isCompactSummary || o.isSidechain) continue;
    if (o.uuid && seen.has(o.uuid)) continue;
    const c = o.message?.content;
    const raw = typeof c === "string" ? c : Array.isArray(c) ? c.filter((p) => p?.type === "text").map((p) => p.text).join("\n") : "";
    const text = typedText(raw);
    if (!text) continue;
    if (o.uuid) seen.add(o.uuid);
    out.push(text);
  }
  return out;
}

const norm = (t) => t.replace(/\s+/g, "").toLowerCase();
const NUMBER = /\d[\d,.]*\s*(?:%|퍼센트|배|원|포인트|점|일|개|건)?/g;
const STOP = new Set(["사용자", "확인", "확인됨", "답변", "요청", "기준", "적용", "사용", "경우"]);

/** 답의 숫자는 모두, 숫자가 없으면 두 글자 이상 낱말의 절반 이상이 사람 메시지에 있어야 한다 */
export function answerBacked(answer, messages) {
  const hay = norm(messages.join("\n"));
  if (!hay) return false;
  const numbers = (answer.match(NUMBER) ?? []).map(norm).filter(Boolean);
  if (numbers.length) return numbers.every((n) => hay.includes(n));
  const words = (answer.match(/[가-힣A-Za-z]{2,}/g) ?? []).filter((w) => !STOP.has(w));
  if (!words.length) return false;
  const hits = words.filter((w) => hay.includes(norm(w).slice(0, Math.max(2, w.length - 1)))); // 끝 조사 한 글자 허용
  return hits.length * 2 >= words.length;
}
