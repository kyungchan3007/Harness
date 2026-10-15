// 시료 보관 엔진 — 공개 계약 (세 조건 공통 제공, src/lab/types.ts로 복사됨)
export type ID = string;
/** 정수 μL */
export type Qty = number;

export type ErrorCode =
  | "INVALID_INPUT"
  | "UNKNOWN_SAMPLE"
  | "UNKNOWN_RESERVATION"
  | "UNKNOWN_CONTAINER"
  | "UNKNOWN_CUSTODIAN"
  | "ID_TAKEN"
  | "CONTAINER_OCCUPIED"
  | "CAPACITY_EXCEEDED"
  | "INSUFFICIENT"
  | "NOT_ACTIVE"
  | "RESERVATION_CLOSED"
  | "HAS_RESERVATION"
  | "EVENT_CONFLICT";

export type Result<T> = { ok: true; value: T } | { ok: false; code: ErrorCode };

export interface Receipt {
  eventId: ID;
  /** 성공한 새 명령마다 1부터 하나씩 */
  seq: number;
}

export type SampleStatus = "ACTIVE" | "DEPLETED" | "DISCARDED";
export type ReservationStatus = "ACTIVE" | "CANCELED" | "CONSUMED";

export interface SampleView {
  sampleId: ID;
  /** 분취로 만들어졌으면 바로 위 시료, 받아들인 시료면 null */
  parentId: ID | null;
  /** 계보의 시작(받아들인 시료). 받아들인 시료는 자기 자신 */
  rootId: ID;
  /** 용기에 실제로 남은 양 */
  remaining: Qty;
  /** ACTIVE 예약의 합 */
  reserved: Qty;
  /** 이 시료에서 소비된 누적량 */
  consumedQty: Qty;
  /** 이 시료에서 폐기된 누적량 */
  discardedQty: Qty;
  status: SampleStatus;
  /** 지금 담긴 용기. ACTIVE가 아니면 null */
  containerId: ID | null;
  custodianId: ID;
}

export interface ReservationView {
  reservationId: ID;
  sampleId: ID;
  qty: Qty;
  status: ReservationStatus;
}

export interface EventView {
  seq: number;
  eventId: ID;
  op: "receive" | "split" | "reserve" | "cancel" | "consume" | "discard" | "move" | "transferCustody";
  /**
   * 호출 인자를 이름 붙인 객체로 (eventId 제외).
   * receive·reserve: input 그대로 / split: { parentId, children } / cancel·consume: { reservationId }
   * discard: { sampleId } / move: { sampleId, targetContainerId } / transferCustody: { sampleId, custodianId }
   */
  args: unknown;
}

export interface Snapshot {
  samples: SampleView[];
  reservations: ReservationView[];
  events: EventView[];
}

export interface Catalog {
  locationIds: ID[];
  custodianIds: ID[];
  containers: Array<{ containerId: ID; locationId: ID; capacity: Qty }>;
}

export interface Lab {
  receive(eventId: ID, input: { sampleId: ID; containerId: ID; custodianId: ID; qty: Qty }): Result<Receipt>;
  split(eventId: ID, parentId: ID, children: Array<{ sampleId: ID; containerId: ID; qty: Qty }>): Result<Receipt>;
  reserve(eventId: ID, input: { reservationId: ID; sampleId: ID; qty: Qty }): Result<Receipt>;
  cancel(eventId: ID, reservationId: ID): Result<Receipt>;
  consume(eventId: ID, reservationId: ID): Result<Receipt>;
  discard(eventId: ID, sampleId: ID): Result<Receipt>;
  move(eventId: ID, sampleId: ID, targetContainerId: ID): Result<Receipt>;
  transferCustody(eventId: ID, sampleId: ID, custodianId: ID): Result<Receipt>;
  snapshot(): Snapshot;
}
