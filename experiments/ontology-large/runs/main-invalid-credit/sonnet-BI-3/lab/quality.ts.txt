// 품질관리 — 격리·해제 (docs/quality.md)
import type { Engine } from "./events.js";
import type { Lab } from "./types.js";

export function qualityCommands(_engine: Engine): Pick<Lab, "quarantine" | "release"> {
  return {
    quarantine(_eventId, _sampleId) {
      throw new Error("미구현: quarantine (docs/quality.md)");
    },
    release(_eventId, _sampleId) {
      throw new Error("미구현: release (docs/quality.md)");
    },
  };
}
