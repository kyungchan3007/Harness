// 숨겨진 무작위 대조(0037) — 채점할 때만 src/lab/lab.diff.test.ts로, 기준 구현은 src/lab/__ref.ts로 들어간다
// 시드마다 명령 60개를 무작위로 보내고, 매 단계 기준 구현과 비교: 성공·실패가 같고, 성공이면 Receipt·스냅숏이 같아야 한다
// (둘 다 실패하면 오류 코드는 따지지 않는다 — 규칙을 여러 개 어긴 호출은 어떤 코드든 정답). C 검사와 다른 목록·시드·생성 방식
import { describe, expect, it } from "vitest";
import { createLab } from "./lab.js";
import { createLab as createRef } from "./__ref.js";
import type { Catalog, Lab, Result, Receipt, Snapshot } from "./types.js";

const CAT: Catalog = {
  locationIds: ["w", "e"],
  custodianIds: ["m1", "m2"],
  containers: [
    { containerId: "t1", locationId: "w", capacity: 300 },
    { containerId: "t2", locationId: "w", capacity: 300 },
    { containerId: "t3", locationId: "e", capacity: 300 },
    { containerId: "t4", locationId: "e", capacity: 120 },
    { containerId: "t5", locationId: "e", capacity: 40 },
  ],
};

function rng(seed: number) {
  let s = (seed * 2654435761) % 4294967296;
  return () => {
    s = (s ^ (s << 13)) >>> 0; s = (s ^ (s >>> 17)) >>> 0; s = (s ^ (s << 5)) >>> 0;
    return s / 4294967296;
  };
}
/** 키 순서 무시, 계약에 있는 필드만 */
function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v);
}
const only = (o: Record<string, unknown>, keys: string[]) => Object.fromEntries(keys.map((k) => [k, o[k]]));
const SAMPLE = ["sampleId", "parentId", "rootId", "remaining", "reserved", "consumedQty", "discardedQty", "status", "containerId", "custodianId"];
const norm = (snap: Snapshot) => canon({
  samples: [...snap.samples].map((x) => only(x as never, SAMPLE)).sort((a, b) => (String(a.sampleId) < String(b.sampleId) ? -1 : 1)),
  reservations: [...snap.reservations].map((x) => only(x as never, ["reservationId", "sampleId", "qty", "status"])).sort((a, b) => (String(a.reservationId) < String(b.reservationId) ? -1 : 1)),
  events: snap.events.map((x) => only(x as never, ["seq", "eventId", "op", "args"])),
});
const call = (lab: Lab, op: string, args: unknown[]): Result<Receipt> | "THREW" => {
  try { return (lab as unknown as Record<string, (...a: unknown[]) => Result<Receipt>>)[op]!(...JSON.parse(JSON.stringify(args))); } catch { return "THREW"; }
};

function scenario(seed: number): string | null {
  const r = rng(seed);
  const pick = <T>(xs: T[]): T => xs[Math.floor(r() * xs.length)]!;
  const lab = createLab(JSON.parse(JSON.stringify(CAT)));
  const ref = createRef(JSON.parse(JSON.stringify(CAT)));
  const sent: { op: string; args: unknown[] }[] = [];
  for (let n = 1; n <= 60; n++) {
    const snap = ref.snapshot();
    const sids = snap.samples.map((x) => x.sampleId);
    const rids = snap.reservations.map((x) => x.reservationId);
    const sid = () => (sids.length && r() < 0.85 ? pick(sids) : `n${n}`);
    const cid = () => pick(CAT.containers).containerId;
    const q = () => pick([5, 10, 15, 20, 30, 40, 60, 80, 120, 150]);
    // 가끔 성공했던 명령을 그대로 다시 보내고(R7), 가끔 예전 eventId에 새 명령을 붙인다(충돌)
    if (sent.length && r() < 0.08) {
      const old = pick(sent);
      const want = call(ref, old.op, old.args), got = call(lab, old.op, old.args);
      const where = `시드 ${seed} 단계 ${n} ${old.op} 재전송`;
      if (got === "THREW") return `${where}: 예외를 던짐`;
      if (want !== "THREW" && canon(got) !== canon(want)) return `${where}: ${JSON.stringify(got)} (기준 ${JSON.stringify(want)})`;
      if (norm(lab.snapshot()) !== norm(ref.snapshot())) return `${where}: 스냅숏이 기준과 다름`;
      continue;
    }
    const ev = sent.length && r() < 0.05 ? (pick(sent).args[0] as string) : `d${n}`;
    const k = r();
    let op: string, rest: unknown[];
    if (k < 0.2 || !sids.length) { op = "receive"; rest = [{ sampleId: r() < 0.9 ? `n${n}` : sid(), containerId: cid(), custodianId: pick(CAT.custodianIds), qty: q() }]; }
    else if (k < 0.36) { op = "split"; rest = [sid(), Array.from({ length: 1 + Math.floor(r() * 2) }, (_, i) => ({ sampleId: `n${n}k${i}`, containerId: cid(), qty: q() }))]; }
    else if (k < 0.52) { op = "reserve"; rest = [{ reservationId: rids.length && r() < 0.1 ? pick(rids) : `r${n}`, sampleId: sid(), qty: q() }]; }
    else if (k < 0.62) { op = "consume"; rest = [rids.length ? pick(rids) : "r0"]; }
    else if (k < 0.7) { op = "cancel"; rest = [rids.length ? pick(rids) : "r0"]; }
    else if (k < 0.78) { op = "discard"; rest = [sid()]; }
    else if (k < 0.92) { op = "move"; rest = [sid(), cid()]; }
    else { op = "transferCustody"; rest = [sid(), pick(CAT.custodianIds)]; }
    const args = [ev, ...rest];
    const opUsed = op;
    const want = call(ref, opUsed, args);
    const got = call(lab, opUsed, args);
    if (want !== "THREW" && want.ok) sent.push({ op: opUsed, args });
    const where = `시드 ${seed} 단계 ${n} ${opUsed}(${JSON.stringify(args)})`;
    if (got === "THREW") return `${where}: 예외를 던짐`;
    if (want === "THREW") continue;
    if (got.ok !== want.ok) return `${where}: ${got.ok ? "성공" : `실패 ${got.code}`} (기준: ${want.ok ? "성공" : `실패 ${want.code}`})`;
    if (want.ok && got.ok && canon(got.value) !== canon(want.value)) return `${where}: Receipt ${JSON.stringify(got.value)} (기준 ${JSON.stringify(want.value)})`;
    if (norm(lab.snapshot()) !== norm(ref.snapshot())) return `${where}: 스냅숏이 기준과 다름`;
  }
  return null;
}

describe("무작위 대조", () => {
  for (let seed = 1; seed <= 20; seed++) {
    it(`D${String(seed).padStart(2, "0")} 시드 ${seed}`, () => {
      expect(scenario(seed)).toBeNull();
    });
  }
});
