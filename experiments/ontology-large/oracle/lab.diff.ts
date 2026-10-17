// 숨겨진 무작위 대조 R1~R12 (0038) — 채점할 때만 src/lab/lab.diff.test.ts로, 기준 구현은 src/lab/__ref.ts로
// 시드마다 새 명령을 섞은 70개 명령을 보내고, 매 단계 기준 구현과 비교 (성공·실패 여부, 성공이면 Receipt·스냅숏). 둘 다 실패면 코드는 안 따짐
import { describe, expect, it } from "vitest";
import { createLab } from "./lab.js";
import { createLab as createRef } from "./__ref.js";
import type { Catalog, Lab, Result, Receipt, Snapshot, StorageGrade } from "./types.js";

const G = (...g: StorageGrade[]) => g;
const CAT: Catalog = {
  locationIds: ["w", "e"],
  custodianIds: ["m1", "m2"],
  containers: [
    { containerId: "t1", locationId: "w", capacity: 300, supportedGrades: G("AMBIENT") },
    { containerId: "t2", locationId: "w", capacity: 300, supportedGrades: G("AMBIENT", "CHILLED") },
    { containerId: "t3", locationId: "e", capacity: 300, supportedGrades: G("CHILLED") },
    { containerId: "t4", locationId: "e", capacity: 120, supportedGrades: G("FROZEN") },
    { containerId: "t5", locationId: "e", capacity: 300, supportedGrades: G("AMBIENT") },
    { containerId: "t6", locationId: "w", capacity: 60, supportedGrades: G("CHILLED", "FROZEN") },
  ],
};

function rng(seed: number) {
  let s = (seed * 2246822519) % 4294967296 || 1;
  return () => {
    s = (s ^ (s << 13)) >>> 0; s = (s ^ (s >>> 17)) >>> 0; s = (s ^ (s << 5)) >>> 0;
    return s / 4294967296;
  };
}
function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v);
}
const only = (o: Record<string, unknown>, keys: string[]) => Object.fromEntries(keys.map((k) => [k, o[k]]));
const byKey = (k: string) => (a: Record<string, unknown>, b: Record<string, unknown>) => (String(a[k]) < String(b[k]) ? -1 : 1);
const norm = (snap: Snapshot) => canon({
  now: snap.now,
  samples: snap.samples.map((x) => only(x as never, ["sampleId", "parentId", "rootId", "remaining", "reserved", "consumedQty", "discardedQty", "status", "containerId", "custodianId", "storageGrade", "quarantined"])).sort(byKey("sampleId")),
  reservations: snap.reservations.map((x) => only(x as never, ["reservationId", "sampleId", "qty", "status", "expiresAt"])).sort(byKey("reservationId")),
  transits: snap.transits.map((x) => only(x as never, ["transitId", "sampleId", "sourceContainerId", "targetContainerId", "status"])).sort(byKey("transitId")),
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
  for (let n = 1; n <= 70; n++) {
    const snap = ref.snapshot();
    const sids = snap.samples.map((x) => x.sampleId);
    const rids = snap.reservations.map((x) => x.reservationId);
    const tids = snap.transits.map((x) => x.transitId);
    const sid = () => (sids.length && r() < 0.85 ? pick(sids) : `n${n}`);
    const cid = () => pick(CAT.containers).containerId;
    const q = () => pick([5, 10, 20, 30, 50, 80, 120]);
    const grade = () => pick<StorageGrade>(["AMBIENT", "AMBIENT", "CHILLED", "FROZEN"]);
    if (sent.length && r() < 0.07) {
      const old = pick(sent);
      const want = call(ref, old.op, old.args), got = call(lab, old.op, old.args);
      const where = `시드 ${seed} 단계 ${n} ${old.op} 재전송`;
      if (got === "THREW") return `${where}: 예외를 던짐`;
      if (want !== "THREW" && canon(got) !== canon(want)) return `${where}: ${JSON.stringify(got)} (기준 ${JSON.stringify(want)})`;
      if (norm(lab.snapshot()) !== norm(ref.snapshot())) return `${where}: 스냅숏이 기준과 다름`;
      continue;
    }
    const ev = sent.length && r() < 0.04 ? (pick(sent).args[0] as string) : `d${n}`;
    const k = r();
    let op: string, rest: unknown[];
    if (k < 0.16 || !sids.length) { op = "receive"; rest = [{ sampleId: r() < 0.9 ? `n${n}` : sid(), containerId: cid(), custodianId: pick(CAT.custodianIds), qty: q(), storageGrade: grade() }]; }
    else if (k < 0.27) { op = "split"; rest = [sid(), Array.from({ length: 1 + Math.floor(r() * 2) }, (_, i) => ({ sampleId: `n${n}k${i}`, containerId: cid(), qty: q() }))]; }
    else if (k < 0.39) { op = "reserve"; rest = [{ reservationId: rids.length && r() < 0.1 ? pick(rids) : `r${n}`, sampleId: sid(), qty: q(), expiresAt: r() < 0.4 ? null : snap.now + pick([0, 1, 2, 3, 5]) }]; }
    else if (k < 0.46) { op = "consume"; rest = [rids.length ? pick(rids) : "r0"]; }
    else if (k < 0.51) { op = "cancel"; rest = [rids.length ? pick(rids) : "r0"]; }
    else if (k < 0.56) { op = "discard"; rest = [sid()]; }
    else if (k < 0.63) { op = "move"; rest = [sid(), cid()]; }
    else if (k < 0.66) { op = "transferCustody"; rest = [sid(), pick(CAT.custodianIds)]; }
    else if (k < 0.72) { op = r() < 0.6 ? "quarantine" : "release"; rest = [sid()]; }
    else if (k < 0.79) { op = "advanceTime"; rest = [r() < 0.1 ? Math.max(0, snap.now - 1) : snap.now + pick([0, 1, 2, 4])]; }
    else if (k < 0.89) { op = "startTransit"; rest = [{ transitId: tids.length && r() < 0.1 ? pick(tids) : `x${n}`, sampleId: sid(), targetContainerId: cid() }]; }
    else if (k < 0.95) { op = "confirmArrival"; rest = [tids.length ? pick(tids) : "x0"]; }
    else { op = "cancelTransit"; rest = [tids.length ? pick(tids) : "x0"]; }
    const args = [ev, ...rest];
    const want = call(ref, op, args);
    const got = call(lab, op, args);
    if (want !== "THREW" && want.ok) sent.push({ op, args });
    const where = `시드 ${seed} 단계 ${n} ${op}(${JSON.stringify(args)})`;
    if (got === "THREW") return `${where}: 예외를 던짐`;
    if (want === "THREW") continue;
    if (got.ok !== want.ok) return `${where}: ${got.ok ? "성공" : `실패 ${got.code}`} (기준: ${want.ok ? "성공" : `실패 ${want.code}`})`;
    if (want.ok && got.ok && canon(got.value) !== canon(want.value)) return `${where}: Receipt ${JSON.stringify(got.value)} (기준 ${JSON.stringify(want.value)})`;
    if (norm(lab.snapshot()) !== norm(ref.snapshot())) return `${where}: 스냅숏이 기준과 다름`;
  }
  return null;
}

describe("무작위 대조 (R1~R12)", () => {
  for (let seed = 1; seed <= 20; seed++) {
    it(`X${String(seed).padStart(2, "0")} 시드 ${seed}`, () => {
      expect(scenario(seed)).toBeNull();
    });
  }
});
