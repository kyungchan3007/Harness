// 시료 보관 엔진 R1~R12 — 기준 구현 (복사본에 들어가지 않음, 숨겨진 테스트·대조의 기준)
import type { Catalog, ErrorCode, EventView, ID, Lab, Qty, Receipt, ReservationView, Result, SampleView, Snapshot, StorageGrade, Tick, TransitView } from "./types.js";

const MAX = 1_000_000;
const GRADES: StorageGrade[] = ["AMBIENT", "CHILLED", "FROZEN"];
const isQty = (q: unknown): q is Qty => typeof q === "number" && Number.isInteger(q) && q >= 1 && q <= MAX;
const isTick = (t: unknown): t is Tick => typeof t === "number" && Number.isInteger(t) && t >= 0 && t <= Number.MAX_SAFE_INTEGER;
const fail = (code: ErrorCode): Result<Receipt> => ({ ok: false, code });

function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v);
}
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

interface State {
  now: Tick;
  samples: Map<ID, SampleView>;
  reservations: Map<ID, ReservationView>;
  transits: Map<ID, TransitView>;
  events: EventView[];
  seen: Map<ID, { op: string; key: string; receipt: Receipt }>;
  occupied: Map<ID, ID>; // containerId → sampleId
}

export function createLab(catalog: Catalog): Lab {
  const containers = new Map(catalog.containers.map((c) => [c.containerId, c]));
  const custodians = new Set(catalog.custodianIds);
  let st: State = { now: 0, samples: new Map(), reservations: new Map(), transits: new Map(), events: [], seen: new Map(), occupied: new Map() };

  const copyState = (s: State): State => ({
    now: s.now,
    samples: new Map([...s.samples].map(([k, v]) => [k, { ...v }])),
    reservations: new Map([...s.reservations].map(([k, v]) => [k, { ...v }])),
    transits: new Map([...s.transits].map(([k, v]) => [k, { ...v }])),
    events: [...s.events],
    seen: new Map(s.seen),
    occupied: new Map(s.occupied),
  });

  function run(eventId: ID, op: EventView["op"], args: unknown, body: (s: State) => ErrorCode | null): Result<Receipt> {
    const key = canon(args);
    const prev = st.seen.get(eventId);
    if (prev) return prev.op === op && prev.key === key ? { ok: true, value: { ...prev.receipt } } : fail("EVENT_CONFLICT");
    const work = copyState(st);
    const err = body(work);
    if (err) return fail(err);
    const receipt = { eventId, seq: work.events.length + 1 };
    work.events.push({ seq: receipt.seq, eventId, op, args: clone(args) });
    work.seen.set(eventId, { op, key, receipt });
    st = work;
    return { ok: true, value: { ...receipt } };
  }

  const finish = (s: State, sample: SampleView, status: "DEPLETED" | "DISCARDED") => {
    sample.status = status;
    if (sample.containerId) s.occupied.delete(sample.containerId);
    sample.containerId = null;
  };
  const active = (s: State, id: ID): SampleView | ErrorCode => {
    const x = s.samples.get(id);
    if (!x) return "UNKNOWN_SAMPLE";
    return x.status === "ACTIVE" ? x : "NOT_ACTIVE";
  };
  const inTransit = (s: State, sampleId: ID) => [...s.transits.values()].some((t) => t.status === "ACTIVE" && t.sampleId === sampleId);
  /** 운송 목적지로 확보된 용기 (R12.4) */
  const held = (s: State, containerId: ID) => [...s.transits.values()].some((t) => t.status === "ACTIVE" && t.targetContainerId === containerId);
  /** 빈 용기인가: 시료도 없고 운송 목적지로 확보되지도 않음 */
  const free = (s: State, containerId: ID) => !s.occupied.has(containerId) && !held(s, containerId);
  const fits = (containerId: ID, grade: StorageGrade) => containers.get(containerId)!.supportedGrades.includes(grade);

  return {
    receive(eventId, input) {
      return run(eventId, "receive", input, (s) => {
        if (!isQty(input.qty) || !GRADES.includes(input.storageGrade)) return "INVALID_INPUT";
        if (s.samples.has(input.sampleId)) return "ID_TAKEN";
        const c = containers.get(input.containerId);
        if (!c) return "UNKNOWN_CONTAINER";
        if (!custodians.has(input.custodianId)) return "UNKNOWN_CUSTODIAN";
        if (!free(s, c.containerId)) return "CONTAINER_OCCUPIED";
        if (input.qty > c.capacity) return "CAPACITY_EXCEEDED";
        if (!fits(c.containerId, input.storageGrade)) return "STORAGE_INCOMPATIBLE";
        s.samples.set(input.sampleId, {
          sampleId: input.sampleId, parentId: null, rootId: input.sampleId, remaining: input.qty, reserved: 0, consumedQty: 0, discardedQty: 0,
          status: "ACTIVE", containerId: c.containerId, custodianId: input.custodianId, storageGrade: input.storageGrade, quarantined: false,
        });
        s.occupied.set(c.containerId, input.sampleId);
        return null;
      });
    },

    split(eventId, parentId, children) {
      return run(eventId, "split", { parentId, children }, (s) => {
        if (!Array.isArray(children) || children.length === 0 || !children.every((ch) => isQty(ch.qty))) return "INVALID_INPUT";
        const parent = active(s, parentId);
        if (typeof parent === "string") return parent;
        if (parent.quarantined) return "QUARANTINED";
        if (inTransit(s, parent.sampleId)) return "IN_TRANSIT";
        const ids = new Set<ID>();
        const used = new Set<ID>();
        for (const ch of children) {
          if (s.samples.has(ch.sampleId) || ids.has(ch.sampleId)) return "ID_TAKEN";
          ids.add(ch.sampleId);
          const c = containers.get(ch.containerId);
          if (!c) return "UNKNOWN_CONTAINER";
          if (!free(s, c.containerId) || used.has(c.containerId)) return "CONTAINER_OCCUPIED";
          used.add(c.containerId);
          if (ch.qty > c.capacity) return "CAPACITY_EXCEEDED";
          if (!fits(c.containerId, parent.storageGrade)) return "STORAGE_INCOMPATIBLE";
        }
        const total = children.reduce((a, ch) => a + ch.qty, 0);
        if (total > parent.remaining - parent.reserved) return "INSUFFICIENT";
        for (const ch of children) {
          s.samples.set(ch.sampleId, {
            sampleId: ch.sampleId, parentId: parent.sampleId, rootId: parent.rootId, remaining: ch.qty, reserved: 0, consumedQty: 0, discardedQty: 0,
            status: "ACTIVE", containerId: ch.containerId, custodianId: parent.custodianId, storageGrade: parent.storageGrade, quarantined: false,
          });
          s.occupied.set(ch.containerId, ch.sampleId);
        }
        parent.remaining -= total;
        if (parent.remaining === 0) finish(s, parent, "DEPLETED");
        return null;
      });
    },

    reserve(eventId, input) {
      return run(eventId, "reserve", input, (s) => {
        if (!isQty(input.qty)) return "INVALID_INPUT";
        if (input.expiresAt !== null && (!isTick(input.expiresAt) || input.expiresAt <= s.now)) return "INVALID_INPUT";
        if (s.reservations.has(input.reservationId)) return "ID_TAKEN";
        const x = active(s, input.sampleId);
        if (typeof x === "string") return x;
        if (x.quarantined) return "QUARANTINED";
        if (input.qty > x.remaining - x.reserved) return "INSUFFICIENT";
        x.reserved += input.qty;
        s.reservations.set(input.reservationId, { reservationId: input.reservationId, sampleId: x.sampleId, qty: input.qty, status: "ACTIVE", expiresAt: input.expiresAt });
        return null;
      });
    },

    cancel(eventId, reservationId) {
      return run(eventId, "cancel", { reservationId }, (s) => {
        const r = s.reservations.get(reservationId);
        if (!r) return "UNKNOWN_RESERVATION";
        if (r.status !== "ACTIVE") return "RESERVATION_CLOSED";
        r.status = "CANCELED";
        s.samples.get(r.sampleId)!.reserved -= r.qty;
        return null;
      });
    },

    consume(eventId, reservationId) {
      return run(eventId, "consume", { reservationId }, (s) => {
        const r = s.reservations.get(reservationId);
        if (!r) return "UNKNOWN_RESERVATION";
        if (r.status !== "ACTIVE") return "RESERVATION_CLOSED";
        const x = s.samples.get(r.sampleId)!;
        if (x.quarantined) return "QUARANTINED";
        if (inTransit(s, x.sampleId)) return "IN_TRANSIT";
        r.status = "CONSUMED";
        x.reserved -= r.qty;
        x.remaining -= r.qty;
        x.consumedQty += r.qty;
        if (x.remaining === 0) finish(s, x, "DEPLETED");
        return null;
      });
    },

    discard(eventId, sampleId) {
      return run(eventId, "discard", { sampleId }, (s) => {
        const x = active(s, sampleId);
        if (typeof x === "string") return x;
        if (inTransit(s, x.sampleId)) return "IN_TRANSIT";
        if (x.reserved > 0) return "HAS_RESERVATION";
        x.discardedQty += x.remaining;
        x.remaining = 0;
        finish(s, x, "DISCARDED");
        return null;
      });
    },

    move(eventId, sampleId, targetContainerId) {
      return run(eventId, "move", { sampleId, targetContainerId }, (s) => {
        const x = active(s, sampleId);
        if (typeof x === "string") return x;
        if (inTransit(s, x.sampleId)) return "IN_TRANSIT";
        const c = containers.get(targetContainerId);
        if (!c) return "UNKNOWN_CONTAINER";
        if (!free(s, c.containerId)) return "CONTAINER_OCCUPIED";
        if (x.remaining > c.capacity) return "CAPACITY_EXCEEDED";
        if (!fits(c.containerId, x.storageGrade)) return "STORAGE_INCOMPATIBLE";
        s.occupied.delete(x.containerId!);
        s.occupied.set(c.containerId, x.sampleId);
        x.containerId = c.containerId;
        return null;
      });
    },

    transferCustody(eventId, sampleId, custodianId) {
      return run(eventId, "transferCustody", { sampleId, custodianId }, (s) => {
        const x = active(s, sampleId);
        if (typeof x === "string") return x;
        if (!custodians.has(custodianId)) return "UNKNOWN_CUSTODIAN";
        x.custodianId = custodianId;
        return null;
      });
    },

    quarantine(eventId, sampleId) {
      return run(eventId, "quarantine", { sampleId }, (s) => {
        const x = active(s, sampleId);
        if (typeof x === "string") return x;
        x.quarantined = true;
        return null;
      });
    },

    release(eventId, sampleId) {
      return run(eventId, "release", { sampleId }, (s) => {
        const x = active(s, sampleId);
        if (typeof x === "string") return x;
        x.quarantined = false;
        return null;
      });
    },

    advanceTime(eventId, to) {
      return run(eventId, "advanceTime", { to }, (s) => {
        if (!isTick(to) || to < s.now) return "INVALID_INPUT";
        s.now = to;
        for (const r of s.reservations.values()) {
          if (r.status === "ACTIVE" && r.expiresAt !== null && r.expiresAt <= to) {
            r.status = "EXPIRED";
            s.samples.get(r.sampleId)!.reserved -= r.qty;
          }
        }
        return null;
      });
    },

    startTransit(eventId, input) {
      return run(eventId, "startTransit", input, (s) => {
        if (s.transits.has(input.transitId)) return "ID_TAKEN";
        const x = active(s, input.sampleId);
        if (typeof x === "string") return x;
        if (inTransit(s, x.sampleId)) return "IN_TRANSIT";
        const c = containers.get(input.targetContainerId);
        if (!c) return "UNKNOWN_CONTAINER";
        if (!free(s, c.containerId)) return "CONTAINER_OCCUPIED";
        if (x.remaining > c.capacity) return "CAPACITY_EXCEEDED";
        if (!fits(c.containerId, x.storageGrade)) return "STORAGE_INCOMPATIBLE";
        s.transits.set(input.transitId, { transitId: input.transitId, sampleId: x.sampleId, sourceContainerId: x.containerId!, targetContainerId: c.containerId, status: "ACTIVE" });
        return null;
      });
    },

    confirmArrival(eventId, transitId) {
      return run(eventId, "confirmArrival", { transitId }, (s) => {
        const t = s.transits.get(transitId);
        if (!t) return "UNKNOWN_TRANSIT";
        if (t.status !== "ACTIVE") return "TRANSIT_CLOSED";
        const x = s.samples.get(t.sampleId)!;
        s.occupied.delete(t.sourceContainerId);
        s.occupied.set(t.targetContainerId, x.sampleId);
        x.containerId = t.targetContainerId;
        t.status = "ARRIVED";
        return null;
      });
    },

    cancelTransit(eventId, transitId) {
      return run(eventId, "cancelTransit", { transitId }, (s) => {
        const t = s.transits.get(transitId);
        if (!t) return "UNKNOWN_TRANSIT";
        if (t.status !== "ACTIVE") return "TRANSIT_CLOSED";
        t.status = "CANCELED";
        return null;
      });
    },

    snapshot(): Snapshot {
      return clone({ now: st.now, samples: [...st.samples.values()], reservations: [...st.reservations.values()], transits: [...st.transits.values()], events: st.events });
    },
  };
}
