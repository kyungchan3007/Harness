// 예약 — 예약·취소·소비, 논리 시각
import { active, finish } from "./state.js";
import { isQty } from "./samples.js";
import type { Engine } from "./events.js";
import type { Lab } from "./types.js";

export function reservationCommands(engine: Engine): Pick<Lab, "reserve" | "cancel" | "consume" | "advanceTime"> {
  return {
    reserve(eventId, input) {
      return engine.run(eventId, "reserve", input, (s) => {
        if (!isQty(input.qty)) return "INVALID_INPUT";
        if (s.reservations.has(input.reservationId)) return "ID_TAKEN";
        const x = active(s, input.sampleId);
        if (typeof x === "string") return x;
        if (input.qty > x.remaining - x.reserved) return "INSUFFICIENT";
        x.reserved += input.qty;
        s.reservations.set(input.reservationId, { reservationId: input.reservationId, sampleId: x.sampleId, qty: input.qty, status: "ACTIVE", expiresAt: input.expiresAt });
        return null;
      });
    },

    cancel(eventId, reservationId) {
      return engine.run(eventId, "cancel", { reservationId }, (s) => {
        const r = s.reservations.get(reservationId);
        if (!r) return "UNKNOWN_RESERVATION";
        if (r.status !== "ACTIVE") return "RESERVATION_CLOSED";
        r.status = "CANCELED";
        s.samples.get(r.sampleId)!.reserved -= r.qty;
        return null;
      });
    },

    consume(eventId, reservationId) {
      return engine.run(eventId, "consume", { reservationId }, (s) => {
        const r = s.reservations.get(reservationId);
        if (!r) return "UNKNOWN_RESERVATION";
        if (r.status !== "ACTIVE") return "RESERVATION_CLOSED";
        const x = s.samples.get(r.sampleId)!;
        r.status = "CONSUMED";
        x.reserved -= r.qty;
        x.remaining -= r.qty;
        x.consumedQty += r.qty;
        if (x.remaining === 0) finish(s, x, "DEPLETED");
        return null;
      });
    },

    advanceTime(_eventId, _to) {
      throw new Error("미구현: advanceTime (docs/reservations.md)");
    },
  };
}
