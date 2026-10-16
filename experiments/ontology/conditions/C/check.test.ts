// 온톨로지 검사 — pnpm onto:check
// ontology.json의 불변식(I1~I10)과 명령 효과를 공개 API로 확인한다. 고정 시드로 명령을 무작위로 섞어 보내고, 명령마다 스냅숏을 검사한다.
// 실패하면 "불변식 ID: 관찰값 (시드·단계·명령)"을 보여 준다. 이 파일과 ontology.json은 고치지 않는다.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Catalog, Lab, Result, Receipt, SampleView, Snapshot } from "../../src/lab/types.js";

// 구현(src/lab/lab.ts)이 아직 없으면 검사를 건너뛴다 — 끝낼 때(Stop)는 구현이 있을 때만 검사한다
const IMPL = new URL("../../src/lab/lab.ts", import.meta.url);
const createLab: (c: Catalog) => Lab = existsSync(IMPL) ? (await import("../../src/lab/lab.js")).createLab : () => { throw new Error("구현 없음"); };

const ONTO = JSON.parse(readFileSync(new URL("./ontology.json", import.meta.url), "utf8"));
const IDS: string[] = ONTO.invariants.map((i: { id: string }) => i.id);

const CATALOG: Catalog = {
  locationIds: ["north", "south"],
  custodianIds: ["ana", "ben", "cho"],
  containers: [
    ...["v1", "v2", "v3", "v4", "v5", "v6"].map((id, i) => ({ containerId: id, locationId: i % 2 ? "south" : "north", capacity: 400 })),
    { containerId: "tiny", locationId: "north", capacity: 25 },
    { containerId: "s2", locationId: "south", capacity: 400 }, // 시료 ID로도 쓰는 글자
  ],
};
const CAP = new Map(CATALOG.containers.map((c) => [c.containerId, c.capacity]));

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
}

type Call = { op: string; eventId: string; args: unknown[] };
const violations: Record<string, string[]> = Object.fromEntries(IDS.map((id) => [id, []]));
const note = (id: string, msg: string) => {
  if ((violations[id] ??= []).length < 5) violations[id]!.push(msg);
};

function invoke(lab: Lab, c: Call): Result<Receipt> {
  try {
    return (lab as unknown as Record<string, (...a: unknown[]) => Result<Receipt>>)[c.op]!(c.eventId, ...c.args);
  } catch (error) {
    note("I8", `${c.op}가 예외를 던짐(실패는 { ok: false, code }로): ${(error as Error).message}`);
    return { ok: false, code: "INVALID_INPUT" };
  }
}
const byId = (snap: Snapshot) => new Map(snap.samples.map((x) => [x.sampleId, x]));

function checkState(snap: Snapshot, before: Snapshot | null, where: string, received: Map<string, number>, successes: number) {
  const samples = byId(snap);
  // I1
  const sums = new Map<string, number>();
  for (const x of snap.samples) sums.set(x.rootId, (sums.get(x.rootId) ?? 0) + x.remaining + x.consumedQty + x.discardedQty);
  for (const [root, got] of received) if ((sums.get(root) ?? 0) !== got) note("I1", `계보 ${root}: 받은 양 ${got}, Σ(remaining+consumed+discarded) ${sums.get(root) ?? 0} ${where}`);
  // I2
  const seen = new Map<string, string>();
  for (const x of snap.samples) {
    if (x.status === "ACTIVE") {
      if (!x.containerId) note("I2", `ACTIVE ${x.sampleId}에 용기 없음 ${where}`);
      else if (seen.has(x.containerId)) note("I2", `용기 ${x.containerId}에 ${seen.get(x.containerId)}·${x.sampleId} ${where}`);
      else seen.set(x.containerId, x.sampleId);
    } else if (x.containerId !== null) note("I2", `${x.status} ${x.sampleId}의 containerId=${x.containerId} (null이어야) ${where}`);
  }
  // I3·I4
  for (const x of snap.samples) {
    if (x.containerId && x.remaining > (CAP.get(x.containerId) ?? -1)) note("I3", `${x.sampleId} remaining ${x.remaining} > 용기 ${x.containerId} 용량 ${CAP.get(x.containerId)} ${where}`);
    if (x.reserved < 0 || x.reserved > x.remaining) note("I3", `${x.sampleId} reserved ${x.reserved}, remaining ${x.remaining} ${where}`);
    const act = snap.reservations.filter((r) => r.sampleId === x.sampleId && r.status === "ACTIVE").reduce((a, r) => a + r.qty, 0);
    if (act !== x.reserved) note("I4", `${x.sampleId} reserved ${x.reserved}, ACTIVE 예약 합 ${act} ${where}`);
  }
  // I5·I6
  if (before) {
    const prev = byId(before);
    for (const [id, p] of prev) {
      const x = samples.get(id);
      if (!x) { note("I6", `${id}가 스냅숏에서 사라짐 ${where}`); continue; }
      if (p.status !== "ACTIVE" && x.status !== p.status) note("I5", `${id} ${p.status} → ${x.status} ${where}`);
      if (p.parentId !== x.parentId || p.rootId !== x.rootId) note("I6", `${id} parent/root ${p.parentId}/${p.rootId} → ${x.parentId}/${x.rootId} ${where}`);
    }
    const pr = new Map(before.reservations.map((r) => [r.reservationId, r]));
    for (const r of snap.reservations) {
      const p = pr.get(r.reservationId);
      if (p && p.status !== "ACTIVE" && r.status !== p.status) note("I5", `예약 ${r.reservationId} ${p.status} → ${r.status} ${where}`);
    }
  }
  for (const x of snap.samples) {
    if (x.parentId === null && x.rootId !== x.sampleId) note("I6", `시작 시료 ${x.sampleId}의 rootId ${x.rootId} ${where}`);
    if (x.parentId !== null && samples.get(x.parentId)?.rootId !== x.rootId) note("I6", `${x.sampleId} rootId ${x.rootId} ≠ 부모 ${x.parentId}의 rootId ${samples.get(x.parentId)?.rootId} ${where}`);
  }
  // I7
  snap.events.forEach((ev, i) => { if (ev.seq !== i + 1) note("I7", `events[${i}].seq = ${ev.seq} (${i + 1}이어야) ${where}`); });
  if (snap.events.length !== successes) note("I7", `이벤트 ${snap.events.length}개, 성공한 새 명령 ${successes}개 ${where}`);
}

function effectChecks(c: Call, before: Snapshot, after: Snapshot, where: string) {
  const b = byId(before), a = byId(after);
  const same = (x: SampleView | undefined, y: SampleView | undefined, except: (keyof SampleView)[]) =>
    x && y && (Object.keys(x) as (keyof SampleView)[]).every((k) => except.includes(k) || JSON.stringify(x[k]) === JSON.stringify(y[k]));
  if (c.op === "reserve") {
    const { sampleId, qty } = c.args[0] as { sampleId: string; qty: number };
    const x = a.get(sampleId), p = b.get(sampleId);
    if (x && p && (x.remaining !== p.remaining || x.reserved !== p.reserved + qty)) note("I4", `reserve ${qty}: remaining ${p.remaining}→${x.remaining}, reserved ${p.reserved}→${x.reserved} (remaining 그대로·reserved +${qty}) ${where}`);
  }
  if (c.op === "consume") {
    const r = before.reservations.find((y) => y.reservationId === c.args[0]);
    if (r) {
      const x = a.get(r.sampleId), p = b.get(r.sampleId);
      if (x && p && (x.remaining !== p.remaining - r.qty || x.consumedQty !== p.consumedQty + r.qty || x.reserved !== p.reserved - r.qty)) note("I1", `consume ${r.qty}: remaining ${p.remaining}→${x.remaining}, consumed ${p.consumedQty}→${x.consumedQty}, reserved ${p.reserved}→${x.reserved} (예약 양 전체) ${where}`);
    }
  }
  if (c.op === "move") {
    const id = c.args[0] as string;
    if (!same(b.get(id), a.get(id), ["containerId"])) note("I6", `move가 containerId 말고 다른 값을 바꿈 ${where}`);
  }
  if (c.op === "transferCustody") {
    const id = c.args[0] as string;
    for (const [k, p] of b) if (k !== id && !same(p, a.get(k), [])) note("I6", `transferCustody(${id})가 ${k}도 바꿈 ${where}`);
  }
  if (c.op === "split") {
    const parent = b.get(c.args[0] as string)!;
    for (const ch of c.args[1] as { sampleId: string }[]) {
      const x = a.get(ch.sampleId);
      if (x && (x.parentId !== parent.sampleId || x.rootId !== parent.rootId || x.custodianId !== parent.custodianId)) note("I6", `자식 ${ch.sampleId} parent ${x.parentId}·root ${x.rootId}·책임자 ${x.custodianId} (부모 ${parent.sampleId}·${parent.rootId}·${parent.custodianId}) ${where}`);
    }
  }
}

function randomCall(r: () => number, snap: Snapshot, n: number, retired: string[]): Call {
  const pick = <T>(xs: T[]): T | undefined => xs[Math.floor(r() * xs.length)];
  const actives = snap.samples.filter((x) => x.status === "ACTIVE");
  const used = new Set(snap.samples.filter((x) => x.containerId).map((x) => x.containerId));
  const free = CATALOG.containers.map((c) => c.containerId).filter((c) => !used.has(c));
  const any = [...CATALOG.containers.map((c) => c.containerId)];
  const qty = () => (r() < 0.08 ? pick([0, -1, 3.5])! : 1 + Math.floor(r() * 120));
  const sample = () => (r() < 0.85 ? pick(actives)?.sampleId : pick(snap.samples)?.sampleId) ?? "nope";
  const newSample = () => (r() < 0.1 && retired.length ? pick(retired)! : r() < 0.05 ? "s2" : `x${n}`);
  const ev = `ev${n}`;
  const k = r();
  if (k < 0.18 || actives.length === 0) return { op: "receive", eventId: ev, args: [{ sampleId: newSample(), containerId: (r() < 0.8 ? pick(free) : pick(any)) ?? "v1", custodianId: pick(CATALOG.custodianIds)!, qty: qty() }] };
  if (k < 0.34) {
    const kids = Array.from({ length: 1 + Math.floor(r() * 3) }, (_, i) => ({ sampleId: `${newSample()}c${i}`, containerId: (r() < 0.85 ? free[i] : pick(any)) ?? "tiny", qty: qty() }));
    return { op: "split", eventId: ev, args: [sample(), kids] };
  }
  if (k < 0.5) return { op: "reserve", eventId: ev, args: [{ reservationId: r() < 0.1 && snap.reservations.length ? pick(snap.reservations)!.reservationId : `q${n}`, sampleId: sample(), qty: qty() }] };
  const resv = () => (r() < 0.8 ? pick(snap.reservations.filter((x) => x.status === "ACTIVE")) : pick(snap.reservations))?.reservationId ?? "q-none";
  if (k < 0.6) return { op: "consume", eventId: ev, args: [resv()] };
  if (k < 0.68) return { op: "cancel", eventId: ev, args: [resv()] };
  if (k < 0.76) return { op: "discard", eventId: ev, args: [sample()] };
  if (k < 0.9) return { op: "move", eventId: ev, args: [sample(), (r() < 0.75 ? pick(free) : pick(any)) ?? "v1"] };
  return { op: "transferCustody", eventId: ev, args: [sample(), r() < 0.9 ? pick(CATALOG.custodianIds)! : "nobody"] };
}

function explore(seed: number) {
  const r = rng(seed);
  const lab = createLab(JSON.parse(JSON.stringify(CATALOG)));
  const received = new Map<string, number>();
  const done: { call: Call; receipt: Receipt }[] = [];
  const retired: string[] = [];
  let successes = 0;
  for (let n = 1; n <= 70; n++) {
    const before = lab.snapshot();
    // 가끔 성공했던 명령을 그대로(I9) 또는 인자를 바꿔(I9 충돌) 다시 보낸다
    if (done.length && r() < 0.12) {
      const old = done[Math.floor(r() * done.length)]!;
      const where = `(시드 ${seed}, 단계 ${n}, ${old.call.op} 재전송)`;
      const again = invoke(lab, old.call);
      if (!again.ok || again.value.seq !== old.receipt.seq || again.value.eventId !== old.receipt.eventId) note("I9", `같은 명령 재전송 결과 ${JSON.stringify(again)} (처음 ${JSON.stringify(old.receipt)}) ${where}`);
      if (JSON.stringify(lab.snapshot()) !== JSON.stringify(before)) note("I9", `같은 명령 재전송이 상태를 바꿈 ${where}`);
      const other = invoke(lab, { ...old.call, op: old.call.op === "discard" ? "cancel" : "discard" });
      if (other.ok || other.code !== "EVENT_CONFLICT") note("I9", `같은 eventId·다른 명령 결과 ${JSON.stringify(other)} (EVENT_CONFLICT여야) ${where}`);
      continue;
    }
    const call = randomCall(r, before, n, retired);
    const where = `(시드 ${seed}, 단계 ${n}, ${call.op} ${JSON.stringify(call.args)})`;
    const res = invoke(lab, call);
    const after = lab.snapshot();
    if (!res.ok) {
      if (JSON.stringify(after) !== JSON.stringify(before)) note("I8", `실패(${res.code})했는데 스냅숏이 바뀜 ${where}`);
      // 실패한 eventId는 기록되지 않는다 — 같은 eventId로 다른 명령이 성공할 수 있어야 한다(I9)
      const probe = { op: "transferCustody", eventId: call.eventId, args: [before.samples.find((x) => x.status === "ACTIVE")?.sampleId ?? "nope", "ana"] };
      if (probe.args[0] !== "nope") {
        const pr = invoke(lab, probe);
        if (!pr.ok && pr.code === "EVENT_CONFLICT") note("I9", `실패한 eventId ${call.eventId}가 기록돼 다시 못 씀 ${where}`);
        if (pr.ok) { successes++; done.push({ call: probe, receipt: pr.value }); }
      }
      checkState(lab.snapshot(), before, where, received, successes);
      continue;
    }
    successes++;
    if (res.value.seq !== successes || res.value.eventId !== call.eventId) note("I7", `Receipt ${JSON.stringify(res.value)} (seq ${successes}여야) ${where}`);
    done.push({ call, receipt: res.value });
    // I11: 넘긴 객체를 호출한 쪽이 고쳐도 이력 args는 그대로여야 한다 (확인 뒤 되돌린다)
    const recorded = JSON.stringify(after.events.at(-1)?.args);
    const backup = JSON.stringify(call.args);
    for (const a of call.args) {
      if (Array.isArray(a)) { a.push({ sampleId: "zz", containerId: "v1", qty: 1 }); if (a[0] && typeof a[0] === "object") (a[0] as { qty: number }).qty += 1000; }
      else if (a && typeof a === "object") (a as { qty?: number }).qty = 987654;
    }
    if (JSON.stringify(lab.snapshot().events.at(-1)?.args) !== recorded) note("I11", `${call.op} 뒤 넘긴 객체를 고치자 이력 args가 바뀜 ${where}`);
    call.args = JSON.parse(backup);
    if (call.op === "receive") {
      const a = call.args[0] as { sampleId: string; qty: number };
      if (retired.includes(a.sampleId) || before.samples.some((x) => x.sampleId === a.sampleId)) note("I10", `이미 쓴 sampleId ${a.sampleId}로 receive 성공 ${where}`);
      received.set(a.sampleId, a.qty);
    }
    effectChecks(call, before, after, where);
    for (const x of after.samples) if (x.status !== "ACTIVE" && !retired.includes(x.sampleId)) retired.push(x.sampleId);
    checkState(after, before, where, received, successes);
  }
}

describe.skipIf(!existsSync(IMPL))("온톨로지 검사 (ontology.json)", () => {
  if (existsSync(IMPL)) for (let seed = 1; seed <= 40; seed++) explore(seed);
  for (const inv of ONTO.invariants as { id: string; rule: string; source: string[] }[]) {
    it(`${inv.id} ${inv.rule} [${inv.source.join(", ")}]`, () => {
      expect(violations[inv.id], `${inv.id} 위반:\n${(violations[inv.id] ?? []).join("\n")}`).toEqual([]);
    });
  }
});
