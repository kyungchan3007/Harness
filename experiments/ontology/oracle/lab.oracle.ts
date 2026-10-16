// 숨겨진 채점 테스트 (0037) — 복사본에 실행 중엔 없고, 채점할 때만 src/lab/lab.oracle.test.ts로 들어간다
// 이름: "R<규칙군><b=기본|c=조합><번호> …" — 규칙군마다 같은 가중으로 집계
import { describe, expect, it } from "vitest";
import { createLab } from "./lab.js";
import type { Lab, Result, Receipt } from "./types.js";

const CAT = {
  locationIds: ["L1", "L2"],
  custodianIds: ["P1", "P2", "P3"],
  containers: [
    { containerId: "K1", locationId: "L1", capacity: 500 },
    { containerId: "K2", locationId: "L1", capacity: 500 },
    { containerId: "K3", locationId: "L1", capacity: 500 },
    { containerId: "K4", locationId: "L2", capacity: 500 },
    { containerId: "K5", locationId: "L2", capacity: 500 },
    { containerId: "K6", locationId: "L2", capacity: 500 },
    { containerId: "KS", locationId: "L2", capacity: 30 },
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
const recv = (l: Lab, sampleId: string, containerId: string, qty: number, custodianId = "P1") => ok(l.receive(e(), { sampleId, containerId, custodianId, qty }));

describe("R1 참조·수용", () => {
  it("R1b1 없는 용기·책임자", () => {
    const l = lab();
    expect(code(l.receive(e(), { sampleId: "A", containerId: "K9", custodianId: "P1", qty: 10 }))).toBe("UNKNOWN_CONTAINER");
    expect(code(l.receive(e(), { sampleId: "A", containerId: "K1", custodianId: "P9", qty: 10 }))).toBe("UNKNOWN_CUSTODIAN");
    expect(l.snapshot().samples).toHaveLength(0);
  });
  it("R1b2 차 있는 용기·용량 초과", () => {
    const l = lab();
    recv(l, "A", "K1", 10);
    expect(code(l.receive(e(), { sampleId: "B", containerId: "K1", custodianId: "P1", qty: 10 }))).toBe("CONTAINER_OCCUPIED");
    expect(code(l.receive(e(), { sampleId: "B", containerId: "KS", custodianId: "P1", qty: 31 }))).toBe("CAPACITY_EXCEEDED");
  });
  it("R1b3 잘못된 양·빈 분취", () => {
    const l = lab();
    for (const qty of [0, 2.5, 1_000_001, -3]) expect(code(l.receive(e(), { sampleId: "A", containerId: "K1", custodianId: "P1", qty }))).toBe("INVALID_INPUT");
    recv(l, "A", "K1", 100);
    expect(code(l.split(e(), "A", []))).toBe("INVALID_INPUT");
  });
  it("R1c1 끝난 시료·예약의 ID도 다시 못 씀", () => {
    const l = lab();
    recv(l, "A", "K1", 100);
    ok(l.reserve(e(), { reservationId: "Q1", sampleId: "A", qty: 5 }));
    ok(l.cancel(e(), "Q1"));
    expect(code(l.reserve(e(), { reservationId: "Q1", sampleId: "A", qty: 5 }))).toBe("ID_TAKEN");
    ok(l.discard(e(), "A"));
    expect(code(l.receive(e(), { sampleId: "A", containerId: "K2", custodianId: "P1", qty: 5 }))).toBe("ID_TAKEN");
  });
  it("R1c2 시료 ID가 용기 ID와 같은 글자여도 된다", () => {
    const l = lab();
    recv(l, "K2", "K1", 40);
    ok(l.receive(e(), { sampleId: "K1", containerId: "K2", custodianId: "P1", qty: 20 }));
    expect(s(l, "K2").containerId).toBe("K1");
    expect(s(l, "K1").containerId).toBe("K2");
    ok(l.move(e(), "K2", "K3"));
    expect(s(l, "K2").containerId).toBe("K3");
    ok(l.receive(e(), { sampleId: "Z", containerId: "K1", custodianId: "P1", qty: 1 }));
  });
});

describe("R2 계보·수량 보존", () => {
  it("R2b1 받아들인 시료가 계보의 시작", () => {
    const l = lab();
    recv(l, "A", "K1", 70);
    expect(s(l, "A")).toMatchObject({ parentId: null, rootId: "A", remaining: 70, reserved: 0, consumedQty: 0, discardedQty: 0, status: "ACTIVE" });
  });
  it("R2b2 분취: 부모·시작 시료와 남은 양", () => {
    const l = lab();
    recv(l, "A", "K1", 300);
    ok(l.split(e(), "A", [{ sampleId: "B", containerId: "K2", qty: 120 }]));
    ok(l.split(e(), "B", [{ sampleId: "C", containerId: "K3", qty: 20 }, { sampleId: "D", containerId: "K4", qty: 30 }]));
    expect(s(l, "A").remaining).toBe(180);
    expect(s(l, "B")).toMatchObject({ parentId: "A", rootId: "A", remaining: 70 });
    expect(s(l, "C")).toMatchObject({ parentId: "B", rootId: "A", remaining: 20 });
    expect(s(l, "D")).toMatchObject({ parentId: "B", rootId: "A" });
  });
  it("R2c1 분취 총량은 이용 가능량까지 (예약분 제외)", () => {
    const l = lab();
    recv(l, "A", "K1", 100);
    ok(l.reserve(e(), { reservationId: "Q1", sampleId: "A", qty: 70 }));
    expect(code(l.split(e(), "A", [{ sampleId: "B", containerId: "K2", qty: 20 }, { sampleId: "C", containerId: "K3", qty: 11 }]))).toBe("INSUFFICIENT");
    ok(l.split(e(), "A", [{ sampleId: "B", containerId: "K2", qty: 20 }, { sampleId: "C", containerId: "K3", qty: 10 }]));
    expect(s(l, "A")).toMatchObject({ remaining: 70, reserved: 70, status: "ACTIVE" });
  });
  it("R2c2 계보 전체 보존식: 받은 양 = 남은 양 + 소비 + 폐기", () => {
    const l = lab();
    recv(l, "A", "K1", 400);
    ok(l.split(e(), "A", [{ sampleId: "B", containerId: "K2", qty: 150 }]));
    ok(l.split(e(), "B", [{ sampleId: "C", containerId: "K3", qty: 50 }]));
    ok(l.reserve(e(), { reservationId: "Q1", sampleId: "B", qty: 60 }));
    ok(l.consume(e(), "Q1"));
    ok(l.discard(e(), "C"));
    ok(l.reserve(e(), { reservationId: "Q2", sampleId: "A", qty: 25 }));
    ok(l.consume(e(), "Q2"));
    const all = l.snapshot().samples.filter((x) => x.rootId === "A");
    const sum = all.reduce((a, x) => a + x.remaining + x.consumedQty + x.discardedQty, 0);
    expect(sum).toBe(400);
    expect(s(l, "B")).toMatchObject({ remaining: 40, consumedQty: 60 });
    expect(s(l, "C")).toMatchObject({ remaining: 0, discardedQty: 50, status: "DISCARDED" });
  });
  it("R2c3 분취는 소비가 아니다", () => {
    const l = lab();
    recv(l, "A", "K1", 100);
    ok(l.split(e(), "A", [{ sampleId: "B", containerId: "K2", qty: 100 }]));
    expect(s(l, "A")).toMatchObject({ consumedQty: 0, discardedQty: 0, remaining: 0, status: "DEPLETED" });
  });
});

describe("R3 예약·소비", () => {
  it("R3b1 예약은 남은 양을 줄이지 않는다", () => {
    const l = lab();
    recv(l, "A", "K1", 90);
    ok(l.reserve(e(), { reservationId: "Q1", sampleId: "A", qty: 35 }));
    expect(s(l, "A")).toMatchObject({ remaining: 90, reserved: 35 });
    expect(rv(l, "Q1")).toMatchObject({ sampleId: "A", qty: 35, status: "ACTIVE" });
  });
  it("R3b2 이용 가능량을 넘는 예약, 취소하면 풀린다", () => {
    const l = lab();
    recv(l, "A", "K1", 90);
    ok(l.reserve(e(), { reservationId: "Q1", sampleId: "A", qty: 60 }));
    expect(code(l.reserve(e(), { reservationId: "Q2", sampleId: "A", qty: 31 }))).toBe("INSUFFICIENT");
    ok(l.cancel(e(), "Q1"));
    expect(s(l, "A").reserved).toBe(0);
    ok(l.reserve(e(), { reservationId: "Q2", sampleId: "A", qty: 90 }));
  });
  it("R3c1 소비는 예약 양 전체를 함께 줄인다", () => {
    const l = lab();
    recv(l, "A", "K1", 90);
    ok(l.reserve(e(), { reservationId: "Q1", sampleId: "A", qty: 30 }));
    ok(l.reserve(e(), { reservationId: "Q2", sampleId: "A", qty: 15 }));
    ok(l.consume(e(), "Q2"));
    expect(s(l, "A")).toMatchObject({ remaining: 75, reserved: 30, consumedQty: 15, status: "ACTIVE" });
    expect(rv(l, "Q2").status).toBe("CONSUMED");
    expect(rv(l, "Q1").status).toBe("ACTIVE");
  });
  it("R3c2 끝난 예약·없는 예약", () => {
    const l = lab();
    recv(l, "A", "K1", 90);
    ok(l.reserve(e(), { reservationId: "Q1", sampleId: "A", qty: 10 }));
    ok(l.reserve(e(), { reservationId: "Q2", sampleId: "A", qty: 10 }));
    ok(l.consume(e(), "Q1"));
    ok(l.cancel(e(), "Q2"));
    expect(code(l.cancel(e(), "Q1"))).toBe("RESERVATION_CLOSED");
    expect(code(l.consume(e(), "Q1"))).toBe("RESERVATION_CLOSED");
    expect(code(l.consume(e(), "Q2"))).toBe("RESERVATION_CLOSED");
    expect(code(l.consume(e(), "Q9"))).toBe("UNKNOWN_RESERVATION");
    expect(s(l, "A")).toMatchObject({ remaining: 80, reserved: 0, consumedQty: 10 });
  });
  it("R3c3 끝난 시료는 예약 불가, 없는 시료", () => {
    const l = lab();
    recv(l, "A", "K1", 40);
    ok(l.split(e(), "A", [{ sampleId: "B", containerId: "K2", qty: 40 }]));
    expect(code(l.reserve(e(), { reservationId: "Q1", sampleId: "A", qty: 1 }))).toBe("NOT_ACTIVE");
    expect(code(l.reserve(e(), { reservationId: "Q1", sampleId: "X", qty: 1 }))).toBe("UNKNOWN_SAMPLE");
  });
});

describe("R4 상태·폐기", () => {
  it("R4b1 소비로 0이 되면 DEPLETED, 용기를 비운다", () => {
    const l = lab();
    recv(l, "A", "K1", 25);
    ok(l.reserve(e(), { reservationId: "Q1", sampleId: "A", qty: 25 }));
    ok(l.consume(e(), "Q1"));
    expect(s(l, "A")).toMatchObject({ remaining: 0, status: "DEPLETED", containerId: null });
    recv(l, "B", "K1", 5);
  });
  it("R4b2 폐기: 남은 양 전부를 discardedQty로", () => {
    const l = lab();
    recv(l, "A", "K1", 66);
    ok(l.discard(e(), "A"));
    expect(s(l, "A")).toMatchObject({ remaining: 0, discardedQty: 66, consumedQty: 0, status: "DISCARDED", containerId: null });
  });
  it("R4c1 예약이 있으면 폐기 불가, 취소 뒤엔 가능", () => {
    const l = lab();
    recv(l, "A", "K1", 66);
    ok(l.reserve(e(), { reservationId: "Q1", sampleId: "A", qty: 6 }));
    expect(code(l.discard(e(), "A"))).toBe("HAS_RESERVATION");
    expect(s(l, "A").status).toBe("ACTIVE");
    ok(l.cancel(e(), "Q1"));
    ok(l.discard(e(), "A"));
  });
  it("R4c2 부모가 바닥나도 자식은 그대로 쓴다", () => {
    const l = lab();
    recv(l, "A", "K1", 80);
    ok(l.split(e(), "A", [{ sampleId: "B", containerId: "K2", qty: 50 }, { sampleId: "C", containerId: "K3", qty: 30 }]));
    expect(s(l, "A").status).toBe("DEPLETED");
    ok(l.reserve(e(), { reservationId: "Q1", sampleId: "B", qty: 50 }));
    ok(l.move(e(), "C", "K1"));
    ok(l.consume(e(), "Q1"));
    expect(s(l, "B").status).toBe("DEPLETED");
    expect(s(l, "C")).toMatchObject({ status: "ACTIVE", containerId: "K1" });
  });
  it("R4c3 끝난 시료에는 모든 변경이 NOT_ACTIVE", () => {
    const l = lab();
    recv(l, "A", "K1", 50);
    ok(l.discard(e(), "A"));
    expect(code(l.split(e(), "A", [{ sampleId: "B", containerId: "K2", qty: 1 }]))).toBe("NOT_ACTIVE");
    expect(code(l.reserve(e(), { reservationId: "Q1", sampleId: "A", qty: 1 }))).toBe("NOT_ACTIVE");
    expect(code(l.move(e(), "A", "K2"))).toBe("NOT_ACTIVE");
    expect(code(l.transferCustody(e(), "A", "P2"))).toBe("NOT_ACTIVE");
    expect(code(l.discard(e(), "A"))).toBe("NOT_ACTIVE");
    expect(s(l, "A")).toMatchObject({ status: "DISCARDED", custodianId: "P1" });
  });
});

describe("R5 용기·장소", () => {
  it("R5b1 이동하면 이전 용기가 빈다", () => {
    const l = lab();
    recv(l, "A", "K1", 200);
    ok(l.move(e(), "A", "K4"));
    expect(s(l, "A").containerId).toBe("K4");
    recv(l, "B", "K1", 10);
  });
  it("R5b2 지금 용기·차 있는 용기·작은 용기로는 이동 불가", () => {
    const l = lab();
    recv(l, "A", "K1", 200);
    recv(l, "B", "K2", 10);
    expect(code(l.move(e(), "A", "K1"))).toBe("CONTAINER_OCCUPIED");
    expect(code(l.move(e(), "A", "K2"))).toBe("CONTAINER_OCCUPIED");
    expect(code(l.move(e(), "A", "KS"))).toBe("CAPACITY_EXCEEDED");
    expect(code(l.move(e(), "A", "K8"))).toBe("UNKNOWN_CONTAINER");
    expect(s(l, "A").containerId).toBe("K1");
  });
  it("R5c1 예약 중에도 이동, 양·예약·책임자는 그대로", () => {
    const l = lab();
    recv(l, "A", "K1", 200, "P2");
    ok(l.reserve(e(), { reservationId: "Q1", sampleId: "A", qty: 120 }));
    ok(l.move(e(), "A", "K5"));
    expect(s(l, "A")).toMatchObject({ remaining: 200, reserved: 120, custodianId: "P2", containerId: "K5", rootId: "A" });
    ok(l.consume(e(), "Q1"));
    expect(s(l, "A")).toMatchObject({ remaining: 80, containerId: "K5" });
  });
  it("R5c2 분취: 자식끼리 같은 용기·부모 용기·작은 용기 불가", () => {
    const l = lab();
    recv(l, "A", "K1", 200);
    expect(code(l.split(e(), "A", [{ sampleId: "B", containerId: "K2", qty: 10 }, { sampleId: "C", containerId: "K2", qty: 10 }]))).toBe("CONTAINER_OCCUPIED");
    expect(code(l.split(e(), "A", [{ sampleId: "B", containerId: "K1", qty: 10 }]))).toBe("CONTAINER_OCCUPIED");
    expect(code(l.split(e(), "A", [{ sampleId: "B", containerId: "KS", qty: 31 }]))).toBe("CAPACITY_EXCEEDED");
    expect(l.snapshot().samples).toHaveLength(1);
  });
});

describe("R6 보관 책임", () => {
  it("R6b1 자식은 그 순간 부모의 책임자를 이어받는다", () => {
    const l = lab();
    recv(l, "A", "K1", 100, "P1");
    ok(l.transferCustody(e(), "A", "P3"));
    ok(l.split(e(), "A", [{ sampleId: "B", containerId: "K2", qty: 10 }]));
    expect(s(l, "B").custodianId).toBe("P3");
  });
  it("R6c1 책임자 변경은 그 시료 하나만", () => {
    const l = lab();
    recv(l, "A", "K1", 100, "P1");
    ok(l.split(e(), "A", [{ sampleId: "B", containerId: "K2", qty: 10 }]));
    ok(l.transferCustody(e(), "A", "P2"));
    expect(s(l, "B").custodianId).toBe("P1");
    ok(l.transferCustody(e(), "B", "P3"));
    expect(s(l, "A").custodianId).toBe("P2");
  });
  it("R6c2 예약 중 변경 가능, 끝난 시료·없는 책임자 불가", () => {
    const l = lab();
    recv(l, "A", "K1", 100);
    ok(l.reserve(e(), { reservationId: "Q1", sampleId: "A", qty: 40 }));
    ok(l.transferCustody(e(), "A", "P2"));
    expect(code(l.transferCustody(e(), "A", "P7"))).toBe("UNKNOWN_CUSTODIAN");
    expect(s(l, "A").custodianId).toBe("P2");
    recv(l, "B", "K2", 5);
    ok(l.reserve(e(), { reservationId: "Q2", sampleId: "B", qty: 5 }));
    ok(l.consume(e(), "Q2"));
    expect(code(l.transferCustody(e(), "B", "P2"))).toBe("NOT_ACTIVE");
  });
});

describe("R7 같은 명령 다시 보내기", () => {
  it("R7b1 같은 명령을 다시 보내면 처음 Receipt, 이력 그대로", () => {
    const l = lab();
    const first = ok(l.receive("x1", { sampleId: "A", containerId: "K1", custodianId: "P1", qty: 10 }));
    const again = ok(l.receive("x1", { sampleId: "A", containerId: "K1", custodianId: "P1", qty: 10 }));
    expect(again).toEqual(first);
    expect(l.snapshot().events).toHaveLength(1);
  });
  it("R7c1 지금은 실패할 명령이어도 처음 결과를 돌려준다 (두 번 쓰지 않음)", () => {
    const l = lab();
    recv(l, "A", "K1", 50);
    ok(l.reserve(e(), { reservationId: "Q1", sampleId: "A", qty: 20 }));
    const first = ok(l.consume("y1", "Q1"));
    const again = ok(l.consume("y1", "Q1"));
    expect(again).toEqual(first);
    expect(s(l, "A")).toMatchObject({ remaining: 30, consumedQty: 20 });
    ok(l.discard("y2", "A"));
    expect(ok(l.discard("y2", "A")).eventId).toBe("y2");
  });
  it("R7c2 같은 eventId에 다른 인자·다른 명령은 EVENT_CONFLICT", () => {
    const l = lab();
    ok(l.receive("z1", { sampleId: "A", containerId: "K1", custodianId: "P1", qty: 10 }));
    expect(code(l.receive("z1", { sampleId: "A", containerId: "K1", custodianId: "P1", qty: 11 }))).toBe("EVENT_CONFLICT");
    expect(code(l.discard("z1", "A"))).toBe("EVENT_CONFLICT");
    expect(s(l, "A").status).toBe("ACTIVE");
  });
  it("R7c3 키 순서는 무시, 배열 순서는 구별", () => {
    const l = lab();
    const first = ok(l.receive("k1", { sampleId: "A", containerId: "K1", custodianId: "P1", qty: 100 }));
    expect(ok(l.receive("k1", { qty: 100, custodianId: "P1", containerId: "K1", sampleId: "A" }))).toEqual(first);
    ok(l.split("k2", "A", [{ sampleId: "B", containerId: "K2", qty: 5 }, { sampleId: "C", containerId: "K3", qty: 6 }]));
    expect(code(l.split("k2", "A", [{ sampleId: "C", containerId: "K3", qty: 6 }, { sampleId: "B", containerId: "K2", qty: 5 }]))).toBe("EVENT_CONFLICT");
    expect(ok(l.split("k2", "A", [{ qty: 5, containerId: "K2", sampleId: "B" }, { sampleId: "C", qty: 6, containerId: "K3" }])).seq).toBe(2);
  });
  it("R7c4 실패한 eventId는 다시 쓸 수 있다", () => {
    const l = lab();
    recv(l, "A", "K1", 10);
    expect(code(l.receive("w1", { sampleId: "B", containerId: "K1", custodianId: "P1", qty: 5 }))).toBe("CONTAINER_OCCUPIED");
    const r = ok(l.receive("w1", { sampleId: "B", containerId: "K2", custodianId: "P1", qty: 5 }));
    expect(r).toEqual({ eventId: "w1", seq: 2 });
  });
});

describe("R8 원자성·이력", () => {
  it("R8b1 seq는 1부터, 이력에 op와 이름 붙인 인자", () => {
    const l = lab();
    expect(ok(l.receive("a1", { sampleId: "A", containerId: "K1", custodianId: "P1", qty: 10 }))).toEqual({ eventId: "a1", seq: 1 });
    expect(ok(l.move("a2", "A", "K2"))).toEqual({ eventId: "a2", seq: 2 });
    ok(l.transferCustody("a3", "A", "P2"));
    ok(l.split("a4", "A", [{ sampleId: "B", containerId: "K3", qty: 4 }]));
    const evs = l.snapshot().events;
    expect(evs.map((x) => [x.seq, x.eventId, x.op])).toEqual([[1, "a1", "receive"], [2, "a2", "move"], [3, "a3", "transferCustody"], [4, "a4", "split"]]);
    expect(evs[1]!.args).toEqual({ sampleId: "A", targetContainerId: "K2" });
    expect(evs[2]!.args).toEqual({ sampleId: "A", custodianId: "P2" });
    expect(evs[3]!.args).toEqual({ parentId: "A", children: [{ sampleId: "B", containerId: "K3", qty: 4 }] });
  });
  it("R8c1 여러 자식 분취는 모두 성공하거나 모두 실패", () => {
    const l = lab();
    recv(l, "A", "K1", 100);
    const before = l.snapshot();
    expect(code(l.split(e(), "A", [{ sampleId: "B", containerId: "K2", qty: 10 }, { sampleId: "C", containerId: "KS", qty: 40 }]))).toBe("CAPACITY_EXCEEDED");
    expect(l.snapshot()).toEqual(before);
    ok(l.receive(e(), { sampleId: "B", containerId: "K2", custodianId: "P1", qty: 3 }));
  });
  it("R8c2 실패는 아무것도 바꾸지 않는다 (예약·폐기·이동)", () => {
    const l = lab();
    recv(l, "A", "K1", 100);
    ok(l.reserve(e(), { reservationId: "Q1", sampleId: "A", qty: 50 }));
    const before = l.snapshot();
    expect(code(l.reserve(e(), { reservationId: "Q2", sampleId: "A", qty: 51 }))).toBe("INSUFFICIENT");
    expect(code(l.discard(e(), "A"))).toBe("HAS_RESERVATION");
    expect(code(l.move(e(), "A", "KS"))).toBe("CAPACITY_EXCEEDED");
    expect(l.snapshot()).toEqual(before);
    ok(l.reserve(e(), { reservationId: "Q2", sampleId: "A", qty: 50 }));
  });
  it("R8c3 이력은 나중에 바뀌지 않는다 (넘긴 객체를 고쳐도)", () => {
    const l = lab();
    const input = { sampleId: "A", containerId: "K1", custodianId: "P1", qty: 10 };
    ok(l.receive(e(), input));
    input.qty = 99;
    ok(l.move(e(), "A", "K2"));
    ok(l.discard(e(), "A"));
    expect(l.snapshot().events[0]!.args).toEqual({ sampleId: "A", containerId: "K1", custodianId: "P1", qty: 10 });
    expect(s(l, "A").discardedQty).toBe(10);
  });
});

describe("R1 참조·수용 (조합 추가)", () => {
  it("R1c3 시료 ID가 예약 ID·eventId와 같은 글자여도 된다", () => {
    const l = lab();
    ok(l.receive("Q5", { sampleId: "Q5", containerId: "K1", custodianId: "P1", qty: 50 }));
    ok(l.reserve(e(), { reservationId: "Q5", sampleId: "Q5", qty: 10 }));
    ok(l.split(e(), "Q5", [{ sampleId: "K4", containerId: "K2", qty: 5 }]));
    expect(s(l, "K4")).toMatchObject({ parentId: "Q5", containerId: "K2" });
    expect(code(l.reserve(e(), { reservationId: "Q5", sampleId: "K4", qty: 1 }))).toBe("ID_TAKEN");
  });
});

describe("R2 계보·수량 보존 (조합 추가)", () => {
  it("R2c4 3대 계보에서 이동·책임자 변경·폐기를 섞어도 보존식", () => {
    const l = lab();
    recv(l, "A", "K1", 480, "P2");
    ok(l.split(e(), "A", [{ sampleId: "B", containerId: "K2", qty: 200 }, { sampleId: "C", containerId: "K3", qty: 100 }]));
    ok(l.move(e(), "B", "K4"));
    ok(l.split(e(), "B", [{ sampleId: "D", containerId: "K2", qty: 70 }]));
    ok(l.transferCustody(e(), "D", "P3"));
    ok(l.reserve(e(), { reservationId: "Q1", sampleId: "D", qty: 70 }));
    ok(l.consume(e(), "Q1"));
    ok(l.discard(e(), "C"));
    ok(l.split(e(), "A", [{ sampleId: "E", containerId: "K3", qty: 180 }]));
    const all = l.snapshot().samples;
    expect(all.reduce((a, x) => a + x.remaining + x.consumedQty + x.discardedQty, 0)).toBe(480);
    expect(s(l, "D")).toMatchObject({ rootId: "A", parentId: "B", status: "DEPLETED", containerId: null, custodianId: "P3" });
    expect(s(l, "E")).toMatchObject({ containerId: "K3", rootId: "A", custodianId: "P2" });
    expect(s(l, "A")).toMatchObject({ remaining: 0, status: "DEPLETED" });
  });
  it("R2c5 예약이 있으면 이용 가능량 전부를 나눠도 부모는 남는다", () => {
    const l = lab();
    recv(l, "A", "K1", 100);
    ok(l.reserve(e(), { reservationId: "Q1", sampleId: "A", qty: 30 }));
    ok(l.split(e(), "A", [{ sampleId: "B", containerId: "K2", qty: 70 }]));
    expect(s(l, "A")).toMatchObject({ remaining: 30, reserved: 30, status: "ACTIVE", containerId: "K1" });
    ok(l.consume(e(), "Q1"));
    expect(s(l, "A")).toMatchObject({ remaining: 0, status: "DEPLETED", consumedQty: 30 });
  });
});

describe("R3 예약·소비 (조합 추가)", () => {
  it("R3c4 이용 가능량과 같은 양은 예약할 수 있고, 하나 더는 안 된다", () => {
    const l = lab();
    recv(l, "A", "K1", 60);
    ok(l.reserve(e(), { reservationId: "Q1", sampleId: "A", qty: 25 }));
    ok(l.reserve(e(), { reservationId: "Q2", sampleId: "A", qty: 35 }));
    expect(code(l.reserve(e(), { reservationId: "Q3", sampleId: "A", qty: 1 }))).toBe("INSUFFICIENT");
    ok(l.cancel(e(), "Q1"));
    ok(l.consume(e(), "Q2"));
    expect(s(l, "A")).toMatchObject({ remaining: 25, reserved: 0, consumedQty: 35, status: "ACTIVE" });
  });
});

describe("R4 상태·폐기 (조합 추가)", () => {
  it("R4c4 끝난 시료가 비운 용기를 같은 흐름에서 바로 다른 시료가 쓴다", () => {
    const l = lab();
    recv(l, "A", "K1", 40);
    recv(l, "B", "K2", 40);
    ok(l.discard(e(), "A"));
    ok(l.move(e(), "B", "K1"));
    ok(l.split(e(), "B", [{ sampleId: "C", containerId: "K2", qty: 40 }]));
    expect(s(l, "B")).toMatchObject({ status: "DEPLETED", containerId: null });
    expect(s(l, "C").containerId).toBe("K2");
    recv(l, "D", "K1", 1);
  });
});

describe("R5 용기·장소 (조합 추가)", () => {
  it("R5c3 이동 용량은 지금 남은 양으로 판단한다", () => {
    const l = lab();
    recv(l, "A", "K1", 100);
    expect(code(l.move(e(), "A", "KS"))).toBe("CAPACITY_EXCEEDED");
    ok(l.reserve(e(), { reservationId: "Q1", sampleId: "A", qty: 80 }));
    ok(l.consume(e(), "Q1"));
    ok(l.move(e(), "A", "KS"));
    expect(s(l, "A")).toMatchObject({ remaining: 20, containerId: "KS" });
  });
});

describe("R6 보관 책임 (조합 추가)", () => {
  it("R6c3 손자는 분취하는 순간의 바로 위 부모 책임자를 받는다", () => {
    const l = lab();
    recv(l, "A", "K1", 300, "P1");
    ok(l.split(e(), "A", [{ sampleId: "B", containerId: "K2", qty: 100 }]));
    ok(l.transferCustody(e(), "B", "P2"));
    ok(l.transferCustody(e(), "A", "P3"));
    ok(l.split(e(), "B", [{ sampleId: "C", containerId: "K3", qty: 10 }]));
    expect(s(l, "C").custodianId).toBe("P2");
    ok(l.move(e(), "C", "K4"));
    expect(s(l, "C").custodianId).toBe("P2");
  });
});

describe("R7 같은 명령 다시 보내기 (조합 추가)", () => {
  it("R7c5 분취 재전송: 부모가 이미 바닥났어도 처음 결과, 자식은 두 번 안 생김", () => {
    const l = lab();
    recv(l, "A", "K1", 50);
    const first = ok(l.split("s1", "A", [{ sampleId: "B", containerId: "K2", qty: 50 }]));
    expect(ok(l.split("s1", "A", [{ sampleId: "B", containerId: "K2", qty: 50 }]))).toEqual(first);
    expect(l.snapshot().samples).toHaveLength(2);
    expect(l.snapshot().events).toHaveLength(2);
  });
  it("R7c6 같은 eventId에 다른 인자면 지금 상태 검사보다 EVENT_CONFLICT가 먼저", () => {
    const l = lab();
    recv(l, "A", "K1", 50);
    ok(l.reserve("r1", { reservationId: "Q1", sampleId: "A", qty: 10 }));
    expect(code(l.reserve("r1", { reservationId: "Q1", sampleId: "A", qty: 999 }))).toBe("EVENT_CONFLICT");
    expect(code(l.consume("r1", "Q1"))).toBe("EVENT_CONFLICT");
  });
});
