// 명령 실행 — 재전송 판정(E5)·작업 복사본·이력·커밋(E6). 모든 명령은 run을 거친다
import { copyState, initialState, type State } from "./state.js";
import type { ErrorCode, EventView, ID, Receipt, Result } from "./types.js";

/** 키 순서는 무시, 배열 순서는 구별 */
export function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v);
}
export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
export const fail = (code: ErrorCode): Result<Receipt> => ({ ok: false, code });

export class Engine {
  st: State = initialState();

  run(eventId: ID, op: EventView["op"], args: unknown, body: (s: State) => ErrorCode | null): Result<Receipt> {
    const key = canon(args);
    const prev = this.st.seen.get(eventId);
    if (prev) return prev.op === op && prev.key === key ? { ok: true, value: { ...prev.receipt } } : fail("EVENT_CONFLICT");
    const work = copyState(this.st);
    const err = body(work);
    if (err) return fail(err);
    const receipt = { eventId, seq: work.events.length + 1 };
    work.events.push({ seq: receipt.seq, eventId, op, args: clone(args) });
    work.seen.set(eventId, { op, key, receipt });
    this.st = work;
    return { ok: true, value: { ...receipt } };
  }
}
