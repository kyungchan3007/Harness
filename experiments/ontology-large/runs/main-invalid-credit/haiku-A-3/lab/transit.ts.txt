// 운송 — 시작·도착 확정·취소 (docs/transit.md)
import type { Engine } from "./events.js";
import type { Storage } from "./storage.js";
import type { Lab } from "./types.js";

export function transitCommands(_engine: Engine, _storage: Storage): Pick<Lab, "startTransit" | "confirmArrival" | "cancelTransit"> {
  return {
    startTransit(_eventId, _input) {
      throw new Error("미구현: startTransit (docs/transit.md)");
    },
    confirmArrival(_eventId, _transitId) {
      throw new Error("미구현: confirmArrival (docs/transit.md)");
    },
    cancelTransit(_eventId, _transitId) {
      throw new Error("미구현: cancelTransit (docs/transit.md)");
    },
  };
}
