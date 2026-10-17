// 공개 진입점 — 명령 모듈을 조립한다
import { clone, Engine } from "./events.js";
import { qualityCommands } from "./quality.js";
import { reservationCommands } from "./reservations.js";
import { sampleCommands } from "./samples.js";
import { Storage } from "./storage.js";
import { transitCommands } from "./transit.js";
import type { Catalog, Lab, Snapshot } from "./types.js";

export function createLab(catalog: Catalog): Lab {
  const engine = new Engine();
  const storage = new Storage(catalog);
  const custodians = new Set(catalog.custodianIds);
  return {
    ...sampleCommands(engine, storage, custodians),
    ...reservationCommands(engine),
    ...qualityCommands(engine),
    ...transitCommands(engine, storage),
    snapshot(): Snapshot {
      const s = engine.st;
      return clone({ now: s.now, samples: [...s.samples.values()], reservations: [...s.reservations.values()], transits: [...s.transits.values()], events: s.events });
    },
  };
}
