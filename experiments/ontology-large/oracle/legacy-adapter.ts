// 회귀 채점용 어댑터(0038) — 0037 계약으로 새 엔진을 부른다. 채점 때만 src/lab/__legacy/lab.ts로 들어간다
// 새로 생긴 필드는 기본값으로 채우고(등급 AMBIENT·만료 없음), 스냅숏에서는 0037 계약에 없는 필드를 뺀다
import { createLab as createNew } from "../lab.js";

type AnyLab = Record<string, (...a: unknown[]) => unknown>;
const strip = (o: Record<string, unknown>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

export function createLab(catalog: { locationIds: string[]; custodianIds: string[]; containers: Array<Record<string, unknown>> }) {
  const inner = createNew({ ...catalog, containers: catalog.containers.map((c) => ({ ...c, supportedGrades: ["AMBIENT"] })) } as never) as unknown as AnyLab;
  const pass = (name: string) => (...a: unknown[]) => inner[name]!(...a);
  return {
    receive: (eventId: string, input: Record<string, unknown>) => inner.receive!(eventId, { ...input, storageGrade: "AMBIENT" }),
    reserve: (eventId: string, input: Record<string, unknown>) => inner.reserve!(eventId, { ...input, expiresAt: null }),
    split: pass("split"), cancel: pass("cancel"), consume: pass("consume"), discard: pass("discard"), move: pass("move"), transferCustody: pass("transferCustody"),
    snapshot() {
      const s = inner.snapshot!() as { samples: Record<string, unknown>[]; reservations: Record<string, unknown>[]; events: Array<{ op: string; args: Record<string, unknown> }> };
      return {
        samples: s.samples.map((x) => strip(x, ["storageGrade", "quarantined"])),
        reservations: s.reservations.map((x) => strip(x, ["expiresAt"])),
        events: s.events.map((ev) => ({ ...ev, args: ev.op === "receive" ? strip(ev.args, ["storageGrade"]) : ev.op === "reserve" ? strip(ev.args, ["expiresAt"]) : ev.args })),
      };
    },
  };
}
