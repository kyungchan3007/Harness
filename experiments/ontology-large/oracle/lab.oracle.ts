// 숨겨진 채점 테스트 R9~R12 (0038) — 채점할 때만 src/lab/lab.oracle.test.ts로 들어간다
// 이름: "R<군>.<규칙><a|b|c> …" · 분류(명시/누락/결합)는 rules.json
import { describe, expect, it } from "vitest";
import { createLab } from "./lab.js";
import type { Lab, Receipt, Result, StorageGrade } from "./types.js";

const CAT = {
  locationIds: ["L1", "L2"],
  custodianIds: ["P1", "P2"],
  containers: [
    { containerId: "A1", locationId: "L1", capacity: 500, supportedGrades: ["AMBIENT"] as StorageGrade[] },
    { containerId: "A2", locationId: "L1", capacity: 500, supportedGrades: ["AMBIENT"] as StorageGrade[] },
    { containerId: "A3", locationId: "L2", capacity: 500, supportedGrades: ["AMBIENT"] as StorageGrade[] },
    { containerId: "C1", locationId: "L1", capacity: 500, supportedGrades: ["CHILLED"] as StorageGrade[] },
    { containerId: "C2", locationId: "L2", capacity: 500, supportedGrades: ["CHILLED"] as StorageGrade[] },
    { containerId: "F1", locationId: "L2", capacity: 500, supportedGrades: ["FROZEN"] as StorageGrade[] },
    { containerId: "M1", locationId: "L2", capacity: 500, supportedGrades: ["AMBIENT", "CHILLED"] as StorageGrade[] },
  ],
};
let ev = 0;
const e = () => `e${++ev}`;
const lab = (): Lab => createLab(JSON.parse(JSON.stringify(CAT)));
function ok(r: Result<Receipt>): Receipt {
  if (!r.ok) throw new Error(`실패: ${r.code}`);
  return r.value;
}
const code = (r: Result<Receipt>) => (r.ok ? "OK" : r.code);
const s = (l: Lab, id: string) => l.snapshot().samples.find((x) => x.sampleId === id)!;
const rv = (l: Lab, id: string) => l.snapshot().reservations.find((x) => x.reservationId === id)!;
const tr = (l: Lab, id: string) => l.snapshot().transits.find((x) => x.transitId === id)!;
const recv = (l: Lab, sampleId: string, containerId: string, qty: number, storageGrade: StorageGrade = "AMBIENT") =>
  ok(l.receive(e(), { sampleId, containerId, custodianId: "P1", qty, storageGrade }));
const resv = (l: Lab, reservationId: string, sampleId: string, qty: number, expiresAt: number | null = null) =>
  ok(l.reserve(e(), { reservationId, sampleId, qty, expiresAt }));

describe("R9 격리", () => {
  it("R9.1a 격리·해제는 여부만 설정하고, 같은 값이어도 성공", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    ok(l.quarantine(e(), "S"));
    expect(s(l, "S").quarantined).toBe(true);
    ok(l.quarantine(e(), "S"));
    ok(l.release(e(), "S"));
    expect(s(l, "S")).toMatchObject({ quarantined: false, status: "ACTIVE", remaining: 100 });
    ok(l.release(e(), "S"));
    expect(l.snapshot().events).toHaveLength(5);
  });
  it("R9.1b 끝난 시료·없는 시료는 격리할 수 없다", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    ok(l.discard(e(), "S"));
    expect(code(l.quarantine(e(), "S"))).toBe("NOT_ACTIVE");
    expect(code(l.release(e(), "S"))).toBe("NOT_ACTIVE");
    expect(code(l.quarantine(e(), "X"))).toBe("UNKNOWN_SAMPLE");
  });
  it("R9.2a 격리된 시료는 분취·새 예약 불가", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    ok(l.quarantine(e(), "S"));
    expect(code(l.split(e(), "S", [{ sampleId: "K", containerId: "A2", qty: 10 }]))).toBe("QUARANTINED");
    expect(code(l.reserve(e(), { reservationId: "R1", sampleId: "S", qty: 10, expiresAt: null }))).toBe("QUARANTINED");
    ok(l.release(e(), "S"));
    ok(l.split(e(), "S", [{ sampleId: "K", containerId: "A2", qty: 10 }]));
  });
  it("R9.2b 격리 중 예약 소비 불가, 해제하면 가능", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    resv(l, "R1", "S", 30);
    ok(l.quarantine(e(), "S"));
    expect(code(l.consume(e(), "R1"))).toBe("QUARANTINED");
    ok(l.release(e(), "S"));
    ok(l.consume(e(), "R1"));
    expect(s(l, "S")).toMatchObject({ remaining: 70, consumedQty: 30 });
  });
  it("R9.3a 격리해도 기존 예약은 그대로 (상태·양·만료 시각)", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    resv(l, "R1", "S", 40, 50);
    ok(l.quarantine(e(), "S"));
    expect(rv(l, "R1")).toEqual({ reservationId: "R1", sampleId: "S", qty: 40, status: "ACTIVE", expiresAt: 50 });
    expect(s(l, "S")).toMatchObject({ reserved: 40, remaining: 100, quarantined: true });
  });
  it("R9.3b 예약이 있어도 격리되고, 해제도 예약을 건드리지 않는다", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    resv(l, "R1", "S", 100);
    expect(code(l.quarantine(e(), "S"))).toBe("OK");
    ok(l.release(e(), "S"));
    expect(rv(l, "R1")).toMatchObject({ status: "ACTIVE", qty: 100, expiresAt: null });
    expect(s(l, "S").reserved).toBe(100);
  });
  it("R9.4a 격리는 예약 취소·이동·책임자 변경을 막지 않는다", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    resv(l, "R1", "S", 10);
    ok(l.quarantine(e(), "S"));
    ok(l.cancel(e(), "R1"));
    ok(l.move(e(), "S", "A2"));
    ok(l.transferCustody(e(), "S", "P2"));
    expect(s(l, "S")).toMatchObject({ containerId: "A2", custodianId: "P2", quarantined: true, reserved: 0 });
  });
  it("R9.4b 격리는 폐기·운송을 막지 않지만, 다른 제한은 그대로", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    recv(l, "T", "A2", 50);
    resv(l, "R1", "T", 5);
    ok(l.quarantine(e(), "S"));
    ok(l.quarantine(e(), "T"));
    ok(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "A3" }));
    ok(l.confirmArrival(e(), "X1"));
    expect(s(l, "S").containerId).toBe("A3");
    ok(l.discard(e(), "S"));
    expect(code(l.discard(e(), "T"))).toBe("HAS_RESERVATION");
  });
  it("R9.5a 격리 중 예약 취소: 예약 양만 풀리고 격리·남은 양은 그대로", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    resv(l, "R1", "S", 60);
    ok(l.quarantine(e(), "S"));
    ok(l.cancel(e(), "R1"));
    expect(s(l, "S")).toMatchObject({ reserved: 0, remaining: 100, quarantined: true });
    expect(rv(l, "R1").status).toBe("CANCELED");
  });
  it("R9.5b 취소로 양이 풀려도 격리 중엔 여전히 예약·분취 불가", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    resv(l, "R1", "S", 60);
    ok(l.quarantine(e(), "S"));
    ok(l.cancel(e(), "R1"));
    expect(code(l.reserve(e(), { reservationId: "R2", sampleId: "S", qty: 10, expiresAt: null }))).toBe("QUARANTINED");
    expect(code(l.split(e(), "S", [{ sampleId: "K", containerId: "A2", qty: 10 }]))).toBe("QUARANTINED");
  });
});

describe("R10 보관 등급", () => {
  it("R10.1a 받을 때 정한 요구 등급이 시료에 남는다", () => {
    const l = lab();
    recv(l, "S", "C1", 100, "CHILLED");
    recv(l, "T", "F1", 100, "FROZEN");
    expect(s(l, "S").storageGrade).toBe("CHILLED");
    expect(s(l, "T").storageGrade).toBe("FROZEN");
  });
  it("R10.1b 없는 등급은 INVALID_INPUT", () => {
    const l = lab();
    expect(code(l.receive(e(), { sampleId: "S", containerId: "A1", custodianId: "P1", qty: 10, storageGrade: "WARM" as StorageGrade }))).toBe("INVALID_INPUT");
  });
  it("R10.2a 받기: 맞지 않는 용기는 STORAGE_INCOMPATIBLE, 맞으면 성공", () => {
    const l = lab();
    expect(code(l.receive(e(), { sampleId: "S", containerId: "A1", custodianId: "P1", qty: 10, storageGrade: "CHILLED" }))).toBe("STORAGE_INCOMPATIBLE");
    expect(l.snapshot().samples).toHaveLength(0);
    recv(l, "S", "C1", 10, "CHILLED");
  });
  it("R10.2b 이동: 맞지 않는 목적 용기 거절, 맞으면 성공", () => {
    const l = lab();
    recv(l, "S", "C1", 10, "CHILLED");
    expect(code(l.move(e(), "S", "A1"))).toBe("STORAGE_INCOMPATIBLE");
    expect(s(l, "S").containerId).toBe("C1");
    ok(l.move(e(), "S", "C2"));
  });
  it("R10.2c 분취: 자식 용기가 맞지 않으면 거절", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    expect(code(l.split(e(), "S", [{ sampleId: "K", containerId: "C1", qty: 10 }]))).toBe("STORAGE_INCOMPATIBLE");
    ok(l.split(e(), "S", [{ sampleId: "K", containerId: "A2", qty: 10 }]));
  });
  it("R10.3a 등급은 정확히 일치해야 한다 — FROZEN 용기에 CHILLED 불가", () => {
    const l = lab();
    expect(code(l.receive(e(), { sampleId: "S", containerId: "F1", custodianId: "P1", qty: 10, storageGrade: "CHILLED" }))).toBe("STORAGE_INCOMPATIBLE");
    recv(l, "T", "F1", 10, "FROZEN");
  });
  it("R10.3b 여러 등급을 지원하는 용기는 목록에 있는 것만", () => {
    const l = lab();
    recv(l, "S", "M1", 10, "CHILLED");
    ok(l.move(e(), "S", "C1"));
    recv(l, "T", "M1", 10, "AMBIENT");
    ok(l.move(e(), "T", "A1"));
    expect(code(l.receive(e(), { sampleId: "U", containerId: "M1", custodianId: "P1", qty: 10, storageGrade: "FROZEN" }))).toBe("STORAGE_INCOMPATIBLE");
  });
  it("R10.4a 분취 자식은 부모의 등급을 이어받는다", () => {
    const l = lab();
    recv(l, "S", "C1", 100, "CHILLED");
    ok(l.split(e(), "S", [{ sampleId: "K", containerId: "C2", qty: 20 }]));
    expect(s(l, "K").storageGrade).toBe("CHILLED");
  });
  it("R10.4b 손자까지 이어받고, 기본값으로 바뀌지 않는다", () => {
    const l = lab();
    recv(l, "S", "M1", 100, "CHILLED");
    ok(l.split(e(), "S", [{ sampleId: "K", containerId: "C1", qty: 40 }]));
    ok(l.split(e(), "K", [{ sampleId: "G", containerId: "C2", qty: 10 }]));
    expect([s(l, "K").storageGrade, s(l, "G").storageGrade]).toEqual(["CHILLED", "CHILLED"]);
    const m = lab();
    recv(m, "F", "F1", 100, "FROZEN");
    expect(code(m.split(e(), "F", [{ sampleId: "K", containerId: "A1", qty: 10 }]))).toBe("STORAGE_INCOMPATIBLE");
  });
  it("R10.5a 요구 등급은 이동·책임자 변경·격리 뒤에도 그대로", () => {
    const l = lab();
    recv(l, "S", "M1", 100, "CHILLED");
    ok(l.move(e(), "S", "C1"));
    ok(l.transferCustody(e(), "S", "P2"));
    ok(l.quarantine(e(), "S"));
    ok(l.release(e(), "S"));
    expect(s(l, "S").storageGrade).toBe("CHILLED");
  });
  it("R10.5b 요구 등급은 운송 도착·분취 뒤에도 그대로", () => {
    const l = lab();
    recv(l, "S", "C1", 100, "CHILLED");
    ok(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "M1" }));
    ok(l.confirmArrival(e(), "X1"));
    ok(l.split(e(), "S", [{ sampleId: "K", containerId: "C2", qty: 10 }]));
    expect(s(l, "S")).toMatchObject({ storageGrade: "CHILLED", containerId: "M1" });
  });
  it("R10.6a 맞지 않는 목적지로 운송 시작: 실패하고 아무것도 생기지 않음", () => {
    const l = lab();
    recv(l, "S", "C1", 100, "CHILLED");
    const before = l.snapshot();
    expect(code(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "A1" }))).toBe("STORAGE_INCOMPATIBLE");
    expect(l.snapshot()).toEqual(before);
    recv(l, "T", "A1", 10);
  });
  it("R10.6b 실패한 운송의 ID·eventId는 다시 쓸 수 있다", () => {
    const l = lab();
    recv(l, "S", "C1", 100, "CHILLED");
    expect(code(l.startTransit("t1", { transitId: "X1", sampleId: "S", targetContainerId: "F1" }))).toBe("STORAGE_INCOMPATIBLE");
    expect(ok(l.startTransit("t1", { transitId: "X1", sampleId: "S", targetContainerId: "C2" }))).toEqual({ eventId: "t1", seq: 2 });
    expect(tr(l, "X1")).toMatchObject({ status: "ACTIVE", targetContainerId: "C2", sourceContainerId: "C1" });
  });
});

describe("R11 논리 시각·예약 만료", () => {
  it("R11.1a 시각은 0에서 시작, 같은 시각은 허용, 과거는 거절", () => {
    const l = lab();
    expect(l.snapshot().now).toBe(0);
    ok(l.advanceTime(e(), 5));
    expect(l.snapshot().now).toBe(5);
    ok(l.advanceTime(e(), 5));
    expect(code(l.advanceTime(e(), 4))).toBe("INVALID_INPUT");
    expect(l.snapshot()).toMatchObject({ now: 5 });
    expect(l.snapshot().events).toHaveLength(2);
  });
  it("R11.1b 정수가 아니거나 음수인 시각은 거절", () => {
    const l = lab();
    for (const t of [-1, 2.5, Number.MAX_SAFE_INTEGER + 2]) expect(code(l.advanceTime(e(), t))).toBe("INVALID_INPUT");
    ok(l.advanceTime(e(), 0));
  });
  it("R11.2a 만료 시각은 null이거나 지금보다 미래", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    resv(l, "R1", "S", 10, null);
    expect(code(l.reserve(e(), { reservationId: "R2", sampleId: "S", qty: 10, expiresAt: 0 }))).toBe("INVALID_INPUT");
    resv(l, "R2", "S", 10, 1);
  });
  it("R11.2b 시각이 진행된 뒤 지금·과거 만료 시각은 거절", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    ok(l.advanceTime(e(), 10));
    for (const t of [10, 9, -1, 1.5]) expect(code(l.reserve(e(), { reservationId: "R1", sampleId: "S", qty: 10, expiresAt: t }))).toBe("INVALID_INPUT");
    resv(l, "R1", "S", 10, 11);
  });
  it("R11.3a 만료되면 예약 양만 풀리고 남은 양·소비량은 그대로", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    resv(l, "R1", "S", 30, 5);
    ok(l.advanceTime(e(), 6));
    expect(rv(l, "R1").status).toBe("EXPIRED");
    expect(s(l, "S")).toMatchObject({ reserved: 0, remaining: 100, consumedQty: 0, discardedQty: 0 });
  });
  it("R11.3b 만료로 풀린 양은 다시 예약할 수 있다", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    resv(l, "R1", "S", 100, 5);
    expect(code(l.reserve(e(), { reservationId: "R2", sampleId: "S", qty: 1, expiresAt: null }))).toBe("INSUFFICIENT");
    ok(l.advanceTime(e(), 8));
    resv(l, "R2", "S", 100);
  });
  it("R11.4a 만료 시각과 정확히 같아지는 순간 만료", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    resv(l, "R1", "S", 30, 5);
    ok(l.advanceTime(e(), 4));
    expect(rv(l, "R1").status).toBe("ACTIVE");
    ok(l.advanceTime(e(), 5));
    expect(rv(l, "R1").status).toBe("EXPIRED");
    expect(s(l, "S").reserved).toBe(0);
  });
  it("R11.4b 한 번 진행에 여러 예약이 만료돼도 이벤트는 하나", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    resv(l, "R1", "S", 10, 3);
    resv(l, "R2", "S", 10, 7);
    resv(l, "R3", "S", 10, 8);
    const n = l.snapshot().events.length;
    ok(l.advanceTime(e(), 7));
    expect(l.snapshot().events).toHaveLength(n + 1);
    expect([rv(l, "R1").status, rv(l, "R2").status, rv(l, "R3").status]).toEqual(["EXPIRED", "EXPIRED", "ACTIVE"]);
    expect(s(l, "S").reserved).toBe(10);
  });
  it("R11.5a 만료 예약에 취소·소비는 RESERVATION_CLOSED, 기록은 남는다", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    resv(l, "R1", "S", 30, 5);
    ok(l.advanceTime(e(), 9));
    expect(code(l.cancel(e(), "R1"))).toBe("RESERVATION_CLOSED");
    expect(code(l.consume(e(), "R1"))).toBe("RESERVATION_CLOSED");
    expect(rv(l, "R1")).toMatchObject({ status: "EXPIRED", qty: 30, expiresAt: 5 });
  });
  it("R11.5b 만료 예약의 ID는 다시 못 쓴다", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    resv(l, "R1", "S", 30, 5);
    ok(l.advanceTime(e(), 9));
    expect(code(l.reserve(e(), { reservationId: "R1", sampleId: "S", qty: 5, expiresAt: null }))).toBe("ID_TAKEN");
    expect(l.snapshot().reservations).toHaveLength(1);
  });
  it("R11.6a 격리 중인 시료의 예약도 만료되고, 격리는 그대로", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    resv(l, "R1", "S", 30, 5);
    ok(l.quarantine(e(), "S"));
    ok(l.advanceTime(e(), 5));
    expect(rv(l, "R1").status).toBe("EXPIRED");
    expect(s(l, "S")).toMatchObject({ quarantined: true, reserved: 0, remaining: 100 });
  });
  it("R11.6b 운송 중인 시료의 예약도 만료되고, 용기·목적 확보는 그대로", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    resv(l, "R1", "S", 30, 5);
    ok(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "A2" }));
    ok(l.advanceTime(e(), 6));
    expect(rv(l, "R1").status).toBe("EXPIRED");
    expect(s(l, "S")).toMatchObject({ containerId: "A1", reserved: 0 });
    expect(tr(l, "X1").status).toBe("ACTIVE");
    expect(code(l.receive(e(), { sampleId: "T", containerId: "A2", custodianId: "P1", qty: 1, storageGrade: "AMBIENT" }))).toBe("CONTAINER_OCCUPIED");
  });
});

describe("R12 운송", () => {
  it("R12.1a 운송 시작은 기록을 남기고, 도착으로 끝난다", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    ok(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "A3" }));
    expect(tr(l, "X1")).toEqual({ transitId: "X1", sampleId: "S", sourceContainerId: "A1", targetContainerId: "A3", status: "ACTIVE" });
    ok(l.confirmArrival(e(), "X1"));
    expect(tr(l, "X1").status).toBe("ARRIVED");
  });
  it("R12.1b 끝난 시료·없는 시료는 운송할 수 없다", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    ok(l.discard(e(), "S"));
    expect(code(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "A3" }))).toBe("NOT_ACTIVE");
    expect(code(l.startTransit(e(), { transitId: "X1", sampleId: "Z", targetContainerId: "A3" }))).toBe("UNKNOWN_SAMPLE");
    expect(l.snapshot().transits).toHaveLength(0);
  });
  it("R12.2a 도착하면 목적 용기로, 출발 용기는 빈다", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    ok(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "A3" }));
    ok(l.confirmArrival(e(), "X1"));
    expect(s(l, "S")).toMatchObject({ containerId: "A3", remaining: 100, custodianId: "P1" });
    recv(l, "T", "A1", 10);
  });
  it("R12.2b 취소하면 출발 용기에 남고 목적 확보가 풀린다", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    ok(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "A3" }));
    ok(l.cancelTransit(e(), "X1"));
    expect(s(l, "S").containerId).toBe("A1");
    expect(tr(l, "X1").status).toBe("CANCELED");
    recv(l, "T", "A3", 10);
  });
  it("R12.3a 운송 중 분취·폐기·이동·추가 운송은 IN_TRANSIT", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    ok(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "A3" }));
    expect(code(l.split(e(), "S", [{ sampleId: "K", containerId: "A2", qty: 10 }]))).toBe("IN_TRANSIT");
    expect(code(l.discard(e(), "S"))).toBe("IN_TRANSIT");
    expect(code(l.move(e(), "S", "A2"))).toBe("IN_TRANSIT");
    expect(code(l.startTransit(e(), { transitId: "X2", sampleId: "S", targetContainerId: "A2" }))).toBe("IN_TRANSIT");
    ok(l.cancelTransit(e(), "X1"));
    ok(l.move(e(), "S", "A2"));
  });
  it("R12.3b 운송 중 소비는 IN_TRANSIT, 도착 뒤엔 가능", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    resv(l, "R1", "S", 40);
    ok(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "A3" }));
    expect(code(l.consume(e(), "R1"))).toBe("IN_TRANSIT");
    ok(l.confirmArrival(e(), "X1"));
    ok(l.consume(e(), "R1"));
    expect(s(l, "S")).toMatchObject({ remaining: 60, containerId: "A3" });
  });
  it("R12.4a 운송 목적 용기는 확보돼 다른 받기·이동·운송 목적지로 못 쓴다", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    recv(l, "T", "A2", 50);
    ok(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "A3" }));
    expect(code(l.receive(e(), { sampleId: "U", containerId: "A3", custodianId: "P1", qty: 1, storageGrade: "AMBIENT" }))).toBe("CONTAINER_OCCUPIED");
    expect(code(l.move(e(), "T", "A3"))).toBe("CONTAINER_OCCUPIED");
    expect(code(l.startTransit(e(), { transitId: "X2", sampleId: "T", targetContainerId: "A3" }))).toBe("CONTAINER_OCCUPIED");
    ok(l.startTransit(e(), { transitId: "X2", sampleId: "T", targetContainerId: "M1" }));
  });
  it("R12.4b 운송 중에도 출발 용기는 점유되고, 목적 용기엔 분취 불가", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    recv(l, "T", "A2", 50);
    ok(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "A3" }));
    expect(code(l.receive(e(), { sampleId: "U", containerId: "A1", custodianId: "P1", qty: 1, storageGrade: "AMBIENT" }))).toBe("CONTAINER_OCCUPIED");
    expect(code(l.split(e(), "T", [{ sampleId: "K", containerId: "A3", qty: 5 }]))).toBe("CONTAINER_OCCUPIED");
    ok(l.split(e(), "T", [{ sampleId: "K", containerId: "M1", qty: 5 }]));
  });
  it("R12.5a 끝난 운송의 ID는 다시 못 쓰고, 없는 운송은 UNKNOWN_TRANSIT", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    ok(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "A3" }));
    ok(l.cancelTransit(e(), "X1"));
    expect(code(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "A2" }))).toBe("ID_TAKEN");
    expect(code(l.confirmArrival(e(), "X9"))).toBe("UNKNOWN_TRANSIT");
    expect(code(l.cancelTransit(e(), "X9"))).toBe("UNKNOWN_TRANSIT");
  });
  it("R12.5b 끝난 운송에 새 이벤트로 도착·취소는 TRANSIT_CLOSED, 기록은 남는다", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    ok(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "A3" }));
    ok(l.confirmArrival(e(), "X1"));
    expect(code(l.cancelTransit(e(), "X1"))).toBe("TRANSIT_CLOSED");
    expect(code(l.confirmArrival(e(), "X1"))).toBe("TRANSIT_CLOSED");
    expect(tr(l, "X1").status).toBe("ARRIVED");
    expect(s(l, "S").containerId).toBe("A3");
  });
  it("R12.6a 도착 재전송은 처음 Receipt, 이동·이력 추가 없음", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    ok(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "A3" }));
    const first = ok(l.confirmArrival("c1", "X1"));
    const n = l.snapshot().events.length;
    expect(ok(l.confirmArrival("c1", "X1"))).toEqual(first);
    expect(l.snapshot().events).toHaveLength(n);
    expect(s(l, "S").containerId).toBe("A3");
  });
  it("R12.6b 취소 재전송도 처음 Receipt", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    ok(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "A3" }));
    const first = ok(l.cancelTransit("x1", "X1"));
    expect(ok(l.cancelTransit("x1", "X1"))).toEqual(first);
    expect(code(l.confirmArrival("x1", "X1"))).toBe("EVENT_CONFLICT");
  });
  it("R12.7a 운송 중 폐기 실패는 아무것도 바꾸지 않고 eventId도 남지 않는다", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    resv(l, "R1", "S", 10);
    ok(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "A3" }));
    const before = l.snapshot();
    expect(code(l.discard("d1", "S"))).toBe("IN_TRANSIT");
    expect(l.snapshot()).toEqual(before);
    ok(l.transferCustody("d1", "S", "P2"));
  });
  it("R12.7b 운송 중 소비 실패도 아무것도 바꾸지 않는다", () => {
    const l = lab();
    recv(l, "S", "A1", 100);
    resv(l, "R1", "S", 10);
    ok(l.startTransit(e(), { transitId: "X1", sampleId: "S", targetContainerId: "A3" }));
    const before = l.snapshot();
    expect(code(l.consume("k1", "R1"))).toBe("IN_TRANSIT");
    expect(l.snapshot()).toEqual(before);
    expect(rv(l, "R1").status).toBe("ACTIVE");
  });
});
