// 시료 보관 엔진 — 공개 계약 (세 조건 공통 제공, src/lab/types.ts로 복사됨. 고치지 않는다)
export type ID = string;
/** 정수 μL */
export type Qty = number;
/** 보관 등급 — 이름이 다르면 다른 등급이다 (대체·상하 관계 없음, docs/storage.md) */
export type StorageGrade = "AMBIENT" | "CHILLED" | "FROZEN";
/** 논리 시각 — 0 이상 Number.MAX_SAFE_INTEGER 이하의 정수 */
export type Tick = number;

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
  | "EVENT_CONFLICT"
  | "QUARANTINED"
  | "STORAGE_INCOMPATIBLE"
  | "IN_TRANSIT"
  | "UNKNOWN_TRANSIT"
  | "TRANSIT_CLOSED";

export type Result<T> = { ok: true; value: T } | { ok: false; code: ErrorCode };

export interface Receipt {
  eventId: ID;
  /** 성공한 새 명령마다 1부터 하나씩 */
  seq: number;
}

export type SampleStatus = "ACTIVE" | "DEPLETED" | "DISCARDED";
export type ReservationStatus = "ACTIVE" | "CANCELED" | "CONSUMED" | "EXPIRED";
export type TransitStatus = "ACTIVE" | "ARRIVED" | "CANCELED";

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
  /** 요구 보관 등급 */
  storageGrade: StorageGrade;
  /** 격리 여부 — 생애 상태(status)와 따로 */
  quarantined: boolean;
}

export interface ReservationView {
  reservationId: ID;
  sampleId: ID;
  qty: Qty;
  status: ReservationStatus;
  /** 만료 시각. null이면 기한 없음 */
  expiresAt: Tick | null;
}

export interface TransitView {
  transitId: ID;
  sampleId: ID;
  sourceContainerId: ID;
  targetContainerId: ID;
  status: TransitStatus;
}

export type EventOp =
  | "receive" | "split" | "reserve" | "cancel" | "consume" | "discard" | "move" | "transferCustody"
  | "quarantine" | "release" | "advanceTime" | "startTransit" | "confirmArrival" | "cancelTransit";

export interface EventView {
  seq: number;
  eventId: ID;
  op: EventOp;
  /**
   * 호출 인자를 이름 붙인 객체로 (eventId 제외).
   * receive·reserve·startTransit: input 그대로 / split: { parentId, children } / cancel·consume: { reservationId }
   * discard·quarantine·release: { sampleId } / move: { sampleId, targetContainerId } / transferCustody: { sampleId, custodianId }
   * advanceTime: { to } / confirmArrival·cancelTransit: { transitId }
   */
  args: unknown;
}

export interface Snapshot {
  /** 현재 논리 시각 */
  now: Tick;
  samples: SampleView[];
  reservations: ReservationView[];
  /** 끝난 운송까지 모두 */
  transits: TransitView[];
  events: EventView[];
}

export interface Catalog {
  locationIds: ID[];
  custodianIds: ID[];
  containers: Array<{ containerId: ID; locationId: ID; capacity: Qty; supportedGrades: StorageGrade[] }>;
}

export interface Lab {
  receive(eventId: ID, input: { sampleId: ID; containerId: ID; custodianId: ID; qty: Qty; storageGrade: StorageGrade }): Result<Receipt>;
  split(eventId: ID, parentId: ID, children: Array<{ sampleId: ID; containerId: ID; qty: Qty }>): Result<Receipt>;
  reserve(eventId: ID, input: { reservationId: ID; sampleId: ID; qty: Qty; expiresAt: Tick | null }): Result<Receipt>;
  cancel(eventId: ID, reservationId: ID): Result<Receipt>;
  consume(eventId: ID, reservationId: ID): Result<Receipt>;
  discard(eventId: ID, sampleId: ID): Result<Receipt>;
  move(eventId: ID, sampleId: ID, targetContainerId: ID): Result<Receipt>;
  transferCustody(eventId: ID, sampleId: ID, custodianId: ID): Result<Receipt>;
  quarantine(eventId: ID, sampleId: ID): Result<Receipt>;
  release(eventId: ID, sampleId: ID): Result<Receipt>;
  /** 절대 시각으로 진행 (증가량 아님) */
  advanceTime(eventId: ID, to: Tick): Result<Receipt>;
  startTransit(eventId: ID, input: { transitId: ID; sampleId: ID; targetContainerId: ID }): Result<Receipt>;
  confirmArrival(eventId: ID, transitId: ID): Result<Receipt>;
  cancelTransit(eventId: ID, transitId: ID): Result<Receipt>;
  snapshot(): Snapshot;
}
