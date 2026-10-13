// 다른 회사 검사자 실험(0036) — 같은 코드 묶음: 정답 구현에 틀린 구현을 하나씩 심은 23개 + 정상 3개
import { readFileSync } from "node:fs";
import { REFERENCE_FILE } from "../role-split/lib.mjs";
import { MUTANTS } from "../role-split/selfcheck.mjs";

export const CLEAN_COUNT = 3;

/** 결정적 섞기 (시드 고정) — 실행 순서가 시간대에 따라 치우치지 않게, 다시 돌려도 같은 순서 */
export function shuffle(list, seed = 36) {
  const a = [...list];
  let s = seed;
  const rand = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 정답 구현 맨 위의 "정답 구현 — 채점용…" 주석은 검사자에게 정답이라고 알려 주는 힌트라 지운다 (0036 시범에서 발견) */
export function stripHeader(code) {
  return code.replace(/^\/\/ 정답 구현[^\n]*\n/, "");
}

/** 코드 묶음. key(무엇을 심었나)는 검사자에게 보이지 않고 채점에만 쓴다 */
export function buildCases(reference = stripHeader(readFileSync(REFERENCE_FILE, "utf8")), mutants = MUTANTS) {
  const planted = mutants.map((m, i) => {
    if (!reference.includes(m.find)) throw new Error(`틀린 구현을 적용할 수 없음: ${m.name}`);
    return { defect: `D${String(i + 1).padStart(2, "0")}`, name: m.name, expect: m.expect, find: m.find, replace: m.replace, code: reference.replace(m.find, m.replace) };
  });
  const clean = Array.from({ length: CLEAN_COUNT }, (_, i) => ({ defect: null, name: `정상 ${i + 1}`, expect: [], code: reference }));
  return shuffle([...planted, ...clean]).map((c, i) => ({ id: `case-${String(i + 1).padStart(2, "0")}`, ...c }));
}

/** 판정서의 판정 줄 — 없으면 undefined (형식 오류로 따로 셈) */
export function verdictOf(text = "") {
  return /^[#\s*]*[판判]정\s*[:：]\s*\**\s*(approved|rejected)\b/im.exec(text)?.[1]?.toLowerCase();
}
