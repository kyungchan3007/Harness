// 온톨로지 검사 — pnpm onto:check
// ontology.json의 불변식(I1~I14)을 공개 API로 확인한다. 고정 시드로 명령을 무작위로 섞어 보내고 명령마다 스냅숏을 검사한다.
// 실패하면 "불변식 ID: 관찰값 (시드·단계·명령)"을 보여 준다. 이 파일과 ontology.json은 고치지 않는다.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Catalog, Lab, Receipt, Result, Snapshot, StorageGrade } from "../../src/lab/types.js";

// 구현(src/lab/lab.ts)이 아직 없으면 검사를 건너뛴다
const IMPL = new URL("../../src/lab/lab.ts", import.meta.url);
const createLab: (c: Catalog) => Lab = existsSync(IMPL) ? (await import("../../src/lab/lab.js")).createLab : () => { throw new Error("구현 없음"); };

const ONTO = JSON.parse(readFileSync(new URL("./ontology.json", import.meta.url), "utf8"));
const IDS: string[] = ONTO.invariants.map((i: { id: string }) => i.id);

const G = (...g: StorageGrade[]) => g;
const CATALOG: Catalog = {
  locationIds: ["north", "south"],
  custodianIds: ["ana", "ben"],
  containers: [
    { containerId: "v1", locationId: "north", capacity: 400, supportedGrades: G("AMBIENT") },
    { containerId: "v2", locationId: "north", capacity: 400, supportedGrades: G("AMBIENT", "FROZEN") },
    { containerId: "v3", locationId: "south", capacity: 400, supportedGrades: G("CHILLED") },
    { containerId: "v4", locationId: "south", capacity: 400, supportedGrades: G("CHILLED", "AMBIENT") },
    { containerId: "v5", locationId: "south", capacity: 400, supportedGrades: G("FROZEN") },
    { containerId: "tiny", locationId: "north", capacity: 25, supportedGrades: G("AMBIENT", "CHILLED", "FROZEN") },
  ],
};
const CAP = new Map(CATALOG.containers.map((c) => [c.containerId, c]));

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
}

type Call = { op: string; eventId: string; args: unknown[] };
const violations: Record<string, string[]> = Object.fromEntries(IDS.map((id) => [id, []]));
const note = (id: string, msg: string) => { if ((violations[id] ??= []).length < 5) violations[id]!.push(msg); };

function invoke(lab: Lab, c: Call): Result<Receipt> {
  try {
    return (lab as unknown as Record<string, (...a: unknown[]) => Result<Receipt>>)[c.op]!(c.eventId, ...c.args);
  } catch (error) {
    note("I8", `${c.op}가 예외를 던짐(실패는 { ok: false, code }로): ${(error as Error).message}`);
    return { ok: false, code: "INVALID_INPUT" };
  }
}

function checkState(snap: Snapshot, before: Snapshot | null, where: string, received: Map<string, number>, successes: number, grades: Map<string, StorageGrade>) {
  const samples = new Map(snap.samples.map((x) => [x.sampleId, x]));
  const sums = new Map<string, number>();
  for (const x of snap.samples) sums.set(x.rootId, (sums.get(x.rootId) ?? 0) + x.remaining + x.consumedQty + x.discardedQty);
  for (const [root, got] of received) if ((sums.get(root) ?? 0) !== got) note("I1", `계보 ${root}: 받은 양 ${got}, Σ ${sums.get(root) ?? 0} ${where}`);
  const seen = new Map<string, string>();
  for (const x of snap.samples) {
    if (x.status === "ACTIVE") {
      if (!x.containerId) note("I2", `ACTIVE ${x.sampleId}에 용기 없음 ${where}`);
      else if (seen.has(x.containerId)) note("I2", `용기 ${x.containerId}에 ${seen.get(x.containerId)}·${x.sampleId} ${where}`);
      else seen.set(x.containerId, x.sampleId);
      const c = x.containerId ? CAP.get(x.containerId) : undefined;
      if (c && !c.supportedGrades.includes(x.storageGrade)) note("I12", `${x.sampleId}(${x.storageGrade})가 ${c.containerId}(${c.supportedGrades.join("/")})에 있음 ${where}`);
      if (c && x.remaining > c.capacity) note("I3", `${x.sampleId} remaining ${x.remaining} > 용량 ${c.capacity} ${where}`);
    } else if (x.containerId !== null) note("I2", `${x.status} ${x.sampleId}의 containerId=${x.containerId} ${where}`);
    if (x.reserved < 0 || x.reserved > x.remaining) note("I3", `${x.sampleId} reserved ${x.reserved}, remaining ${x.remaining} ${where}`);
    const act = snap.reservations.filter((r) => r.sampleId === x.sampleId && r.status === "ACTIVE").reduce((a, r) => a + r.qty, 0);
    if (act !== x.reserved) note("I4", `${x.sampleId} reserved ${x.reserved}, ACTIVE 예약 합 ${act} ${where}`);
    const g = grades.get(x.sampleId);
    if (g && g !== x.storageGrade) note("I12", `${x.sampleId} 등급 ${g} → ${x.storageGrade} ${where}`);
    if (!grades.has(x.sampleId)) grades.set(x.sampleId, x.storageGrade);
    if (x.parentId !== null) {
      const p = samples.get(x.parentId);
      if (p && p.rootId !== x.rootId) note("I6", `${x.sampleId} rootId ${x.rootId} ≠ 부모 rootId ${p.rootId} ${where}`);
    } else if (x.rootId !== x.sampleId) note("I6", `시작 시료 ${x.sampleId} rootId ${x.rootId} ${where}`);
  }
  for (const r of snap.reservations) if (r.status === "ACTIVE" && r.expiresAt !== null && r.expiresAt <= snap.now) note("I13", `예약 ${r.reservationId} expiresAt ${r.expiresAt} ≤ now ${snap.now}인데 ACTIVE ${where}`);
  const targets = new Map<string, string>();
  for (const t of snap.transits.filter((t) => t.status === "ACTIVE")) {
    const x = samples.get(t.sampleId);
    if (!x || x.status !== "ACTIVE" || x.containerId !== t.sourceContainerId) note("I14", `운송 ${t.transitId}: 시료 ${t.sampleId}가 ACTIVE·출발 용기 ${t.sourceContainerId}에 있지 않음(${x?.status}, ${x?.containerId}) ${where}`);
    if (seen.has(t.targetContainerId)) note("I14", `운송 ${t.transitId}의 목적 용기 ${t.targetContainerId}에 시료 ${seen.get(t.targetContainerId)} ${where}`);
    if (targets.has(t.targetContainerId)) note("I14", `목적 용기 ${t.targetContainerId}를 운송 ${targets.get(t.targetContainerId)}·${t.transitId}가 함께 확보 ${where}`);
    targets.set(t.targetContainerId, t.transitId);
  }
  if (before) {
    const prev = new Map(before.samples.map((x) => [x.sampleId, x]));
    for (const [id, p] of prev) {
      const x = samples.get(id);
      if (!x) { note("I6", `${id}가 스냅숏에서 사라짐 ${where}`); continue; }
      if (p.status !== "ACTIVE" && x.status !== p.status) note("I5", `${id} ${p.status} → ${x.status} ${where}`);
      if (p.parentId !== x.parentId || p.rootId !== x.rootId) note("I6", `${id} 계보가 바뀜 ${where}`);
    }
    for (const kind of ["reservations", "transits"] as const) {
      const pk = kind === "reservations" ? "reservationId" : "transitId";
      const old = new Map((before[kind] as Array<Record<string, string>>).map((r) => [r[pk], r]));
      for (const r of snap[kind] as Array<Record<string, string>>) {
        const p = old.get(r[pk]!);
        if (p && p.status !== "ACTIVE" && r.status !== p.status) note("I5", `${kind} ${r[pk]} ${p.status} → ${r.status} ${where}`);
      }
      if ((snap[kind] as unknown[]).length < (before[kind] as unknown[]).length) note("I10", `${kind} 기록이 사라짐 ${where}`);
    }
  }
  snap.events.forEach((ev, i) => { if (ev.seq !== i + 1) note("I7", `events[${i}].seq = ${ev.seq} ${where}`); });
  if (snap.events.length !== successes) note("I7", `이벤트 ${snap.events.length}개, 성공한 새 명령 ${successes}개 ${where}`);
}

function randomCall(r: () => number, snap: Snapshot, n: number, retired: { s: string[]; q: string[]; t: string[] }): Call {
  const pick = <T>(xs: T[]): T | undefined => xs[Math.floor(r() * xs.length)];
  const actives = snap.samples.filter((x) => x.status === "ACTIVE");
  const all = CATALOG.containers.map((c) => c.containerId);
  const qty = () => (r() < 0.06 ? pick([0, 3.5])! : 1 + Math.floor(r() * 100));
  const sample = () => (r() < 0.85 ? pick(actives)?.sampleId : pick(snap.samples)?.sampleId) ?? "nope";
  const grade = () => pick<StorageGrade>(["AMBIENT", "CHILLED", "FROZEN"])!;
  const resv = () => pick(snap.reservations)?.reservationId ?? "q-none";
  const trans = () => pick(snap.transits)?.transitId ?? "t-none";
  const ev = `ev${n}`;
  const k = r();
  if (k < 0.15 || actives.length === 0) return { op: "receive", eventId: ev, args: [{ sampleId: r() < 0.08 && retired.s.length ? pick(retired.s)! : `s${n}`, containerId: pick(all)!, custodianId: pick(CATALOG.custodianIds)!, qty: qty(), storageGrade: grade() }] };
  if (k < 0.26) return { op: "split", eventId: ev, args: [sample(), Array.from({ length: 1 + Math.floor(r() * 2) }, (_, i) => ({ sampleId: `s${n}c${i}`, containerId: pick(all)!, qty: qty() }))] };
  if (k < 0.38) return { op: "reserve", eventId: ev, args: [{ reservationId: r() < 0.08 && retired.q.length ? pick(retired.q)! : `q${n}`, sampleId: sample(), qty: qty(), expiresAt: r() < 0.5 ? null : snap.now + Math.floor(r() * 4) }] };
  if (k < 0.45) return { op: "consume", eventId: ev, args: [resv()] };
  if (k < 0.5) return { op: "cancel", eventId: ev, args: [resv()] };
  if (k < 0.55) return { op: "discard", eventId: ev, args: [sample()] };
  if (k < 0.62) return { op: "move", eventId: ev, args: [sample(), pick(all)!] };
  if (k < 0.66) return { op: "transferCustody", eventId: ev, args: [sample(), pick(CATALOG.custodianIds)!] };
  if (k < 0.72) return { op: r() < 0.6 ? "quarantine" : "release", eventId: ev, args: [sample()] };
  if (k < 0.79) return { op: "advanceTime", eventId: ev, args: [snap.now + Math.floor(r() * 3)] };
  if (k < 0.89) return { op: "startTransit", eventId: ev, args: [{ transitId: r() < 0.08 && retired.t.length ? pick(retired.t)! : `t${n}`, sampleId: sample(), targetContainerId: pick(all)! }] };
  if (k < 0.95) return { op: "confirmArrival", eventId: ev, args: [trans()] };
  return { op: "cancelTransit", eventId: ev, args: [trans()] };
}

function explore(seed: number) {
  const r = rng(seed);
  const lab = createLab(JSON.parse(JSON.stringify(CATALOG)));
  const received = new Map<string, number>();
  const grades = new Map<string, StorageGrade>();
  const done: { call: Call; receipt: Receipt }[] = [];
  const retired = { s: [] as string[], q: [] as string[], t: [] as string[] };
  let successes = 0;
  for (let n = 1; n <= 70; n++) {
    const before = lab.snapshot();
    if (done.length && r() < 0.1) {
      const old = done[Math.floor(r() * done.length)]!;
      const where = `(시드 ${seed}, 단계 ${n}, ${old.call.op} 재전송)`;
      const again = invoke(lab, old.call);
      if (!again.ok || again.value.seq !== old.receipt.seq) note("I9", `같은 명령 재전송 결과 ${JSON.stringify(again)} (처음 ${JSON.stringify(old.receipt)}) ${where}`);
      if (JSON.stringify(lab.snapshot()) !== JSON.stringify(before)) note("I9", `같은 명령 재전송이 상태를 바꿈 ${where}`);
      const other = invoke(lab, { ...old.call, op: old.call.op === "release" ? "quarantine" : "release" });
      if (other.ok || other.code !== "EVENT_CONFLICT") note("I9", `같은 eventId·다른 명령 결과 ${JSON.stringify(other)} (EVENT_CONFLICT여야) ${where}`);
      continue;
    }
    const call = randomCall(r, before, n, retired);
    const where = `(시드 ${seed}, 단계 ${n}, ${call.op} ${JSON.stringify(call.args)})`;
    const res = invoke(lab, call);
    const after = lab.snapshot();
    if (!res.ok) {
      if (JSON.stringify(after) !== JSON.stringify(before)) note("I8", `실패(${res.code})했는데 스냅숏이 바뀜 ${where}`);
      checkState(after, before, where, received, successes, grades);
      continue;
    }
    successes++;
    if (res.value.seq !== successes) note("I7", `Receipt seq ${res.value.seq} (${successes}여야) ${where}`);
    done.push({ call, receipt: res.value });
    const recorded = JSON.stringify(after.events.at(-1)?.args);
    const backup = JSON.stringify(call.args);
    for (const a of call.args) {
      if (Array.isArray(a)) a.push({ sampleId: "zz", containerId: "v1", qty: 1 });
      else if (a && typeof a === "object") (a as { qty?: number }).qty = 987654;
    }
    if (JSON.stringify(lab.snapshot().events.at(-1)?.args) !== recorded) note("I11", `${call.op} 뒤 넘긴 객체를 고치자 이력 args가 바뀜 ${where}`);
    call.args = JSON.parse(backup);
    const a0 = call.args[0] as { sampleId?: string; reservationId?: string; transitId?: string; qty?: number };
    if (call.op === "receive") {
      if (retired.s.includes(a0.sampleId!)) note("I10", `끝난 sampleId ${a0.sampleId}로 receive 성공 ${where}`);
      received.set(a0.sampleId!, a0.qty!);
    }
    if (call.op === "reserve" && retired.q.includes(a0.reservationId!)) note("I10", `끝난 reservationId ${a0.reservationId} 재사용 성공 ${where}`);
    if (call.op === "startTransit" && retired.t.includes(a0.transitId!)) note("I10", `끝난 transitId ${a0.transitId} 재사용 성공 ${where}`);
    for (const x of after.samples) if (x.status !== "ACTIVE" && !retired.s.includes(x.sampleId)) retired.s.push(x.sampleId);
    for (const x of after.reservations) if (x.status !== "ACTIVE" && !retired.q.includes(x.reservationId)) retired.q.push(x.reservationId);
    for (const x of after.transits) if (x.status !== "ACTIVE" && !retired.t.includes(x.transitId)) retired.t.push(x.transitId);
    checkState(after, before, where, received, successes, grades);
  }
}

describe.skipIf(!existsSync(IMPL))("온톨로지 검사 (ontology.json)", () => {
  if (existsSync(IMPL)) for (let seed = 1; seed <= 40; seed++) explore(seed);
  for (const inv of ONTO.invariants as { id: string; rule: string; source: string }[]) {
    it(`${inv.id} ${inv.rule} [${inv.source}]`, () => {
      expect(violations[inv.id], `${inv.id} 위반:\n${(violations[inv.id] ?? []).join("\n")}`).toEqual([]);
    });
  }
});
