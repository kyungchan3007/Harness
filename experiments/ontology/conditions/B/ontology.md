# 도메인 온톨로지 — 연구실 시료 보관

이 문서는 요청 원문의 규칙(R1~R8)을 **개념·관계·상태·불변식**으로 다시 정리한 것입니다. 새 규칙은 없습니다. 원문과 다르면 원문이 기준입니다. 괄호 안은 출처 규칙 번호입니다.

## 1. 개념

| 개념 | 정의 | 식별자 | 출처 |
| --- | --- | --- | --- |
| 장소 Location | 용기가 놓인 곳. 처음 목록에만 존재 | locationId | R1-1 |
| 용기 Container | 시료를 담는 그릇. 장소 하나에 고정, 용량(capacity) 있음 | containerId | R1-1, R5-1 |
| 보관 책임자 Custodian | 시료를 관리하는 주체. 처음 목록에만 존재 | custodianId | R1-1, R6 |
| 시료 Sample | 용기에 담긴 액체. 양은 정수 μL | sampleId | 대상, R1-5 |
| 시작 시료 Root sample | `receive`로 만든 시료. 계보의 시작 | rootId = 자기 sampleId | R2-1 |
| 자식 시료 Child sample | `split`으로 부모에서 나눠 담은 시료 | parentId = 부모 | R2-2 |
| 예약 Reservation | 시료의 일정량을 쓰겠다고 잡아 둔 것 | reservationId | R3 |
| 이벤트 Event | 성공한 명령 하나의 기록 | eventId, seq | R7, R8 |
| 영수증 Receipt | 성공한 명령이 돌려주는 { eventId, seq } | — | R8-1 |

## 2. 수량 개념

| 이름 | 정의 | 출처 |
| --- | --- | --- |
| 남은 양 remaining | 용기에 실제로 남은 양 | R2-2, R3-4 |
| 예약 양 reserved | 그 시료의 ACTIVE 예약 양의 합 | R3-1 |
| 이용 가능량 available | remaining − reserved (따로 저장하지 않음) | R3-1 |
| 소비 누적 consumedQty | consume으로 쓴 양의 누적 | R3-4 |
| 폐기 누적 discardedQty | discard로 버린 양의 누적 | R4-3 |

## 3. 관계

| 관계 | 다중성 | 바뀌는가 | 출처 |
| --- | --- | --- | --- |
| 용기 → 장소 | 용기 1 : 장소 1 | 안 바뀜 | 대상, R5-1 |
| ACTIVE 시료 → 용기 | 시료 1 : 용기 1, 용기 1 : 시료 0..1 | move로 바뀜 | R1-2, R5-2 |
| 끝난 시료 → 용기 | 없음 (containerId null) | — | R4-5 |
| 시료 → 장소 | 용기를 거쳐 도출 | 용기가 바뀌면 따라 바뀜 | R5-1 |
| 시료 → 책임자 | 시료 1 : 책임자 1 | transferCustody로 그 시료만 | R6 |
| 자식 → 부모 | 자식 1 : 부모 1 | 안 바뀜 | R2-2 |
| 시료 → 시작 시료 | 시료 1 : 시작 시료 1 (자식은 부모의 rootId) | 안 바뀜 | R2-1, R2-2 |
| 예약 → 시료 | 예약 1 : 시료 1, 시료 1 : 예약 0..n | 안 바뀜 | R3 |

## 4. 상태

**시료:** `ACTIVE` → `DEPLETED` (분취·소비로 remaining 0) / `ACTIVE` → `DISCARDED` (discard). DEPLETED·DISCARDED는 끝난 상태로 돌아오지 않습니다. (R4-1, R4-2, R4-3, R4-4)

**예약:** `ACTIVE` → `CANCELED` (cancel) / `ACTIVE` → `CONSUMED` (consume). 끝난 예약에 다시 cancel·consume하면 `RESERVATION_CLOSED`. (R3-3, R3-4, R3-5)

## 5. 명령별 효과·전제

| 명령 | 전제 (어기면) | 효과 | 출처 |
| --- | --- | --- | --- |
| receive | qty 범위(INVALID_INPUT) · 새 sampleId(ID_TAKEN) · 있는 용기·책임자(UNKNOWN_*) · 빈 용기(CONTAINER_OCCUPIED) · qty ≤ 용량(CAPACITY_EXCEEDED) | 시작 시료 생성, 용기 점유 | R1, R2-1 |
| split | 자식 1개 이상·각 qty 범위(INVALID_INPUT) · 부모 ACTIVE(NOT_ACTIVE) · 자식 ID 새것(ID_TAKEN) · 자식 용기: 시작 시점에 비어 있고 서로 다름(CONTAINER_OCCUPIED) · 각 qty ≤ 용량 · 합 ≤ 부모 available(INSUFFICIENT) | 자식 생성(부모의 rootId·책임자 이어받음), 부모 remaining −= 합, 0이면 DEPLETED | R2, R5-3, R6-1 |
| reserve | qty 범위 · 새 reservationId · 시료 ACTIVE · qty ≤ available | reserved += qty (remaining 그대로) | R3-2 |
| cancel | 예약 있음 · ACTIVE | CANCELED, reserved −= qty | R3-3 |
| consume | 예약 있음 · ACTIVE | 예약 양 **전체**: remaining·reserved −= qty, consumedQty += qty, CONSUMED, 0이면 DEPLETED | R3-4 |
| discard | 시료 ACTIVE · ACTIVE 예약 없음(HAS_RESERVATION) | discardedQty += remaining, remaining 0, DISCARDED, 용기 비움 | R4-3 |
| move | 시료 ACTIVE · 있는 용기 · 빈 용기(지금 용기 포함 CONTAINER_OCCUPIED) · remaining ≤ 용량 | 용기만 바뀜 (양·예약·계보·책임자 그대로, 예약 중 가능) | R5-2, R5-4 |
| transferCustody | 시료 ACTIVE · 있는 책임자 | 그 시료의 책임자만 바뀜 (예약 중 가능) | R6-2, R6-3 |

## 6. 불변식

| ID | 불변식 | 출처 |
| --- | --- | --- |
| I1 | 계보마다: 시작 시료가 받은 양 = Σ(remaining + consumedQty + discardedQty) | R2-4 |
| I2 | ACTIVE 시료는 용기 하나에, 용기 하나엔 ACTIVE 시료 최대 하나, 끝난 시료는 containerId null | R1-2, R4-5 |
| I3 | remaining ≤ 담긴 용기 용량, 0 ≤ reserved ≤ remaining | R1-3, R3-1 |
| I4 | reserved = 그 시료의 ACTIVE 예약 qty 합 | R3-1 |
| I5 | 끝난 시료·예약은 다시 ACTIVE가 되지 않는다 | R3-5, R4-4 |
| I6 | parentId·rootId는 만들어진 뒤 바뀌지 않고, 자식의 rootId = 부모의 rootId | R2-2 |
| I7 | 이벤트 seq는 1부터 빈틈없이 1씩, 이벤트 수 = 성공한 새 명령 수 | R8-1 |
| I8 | 실패한 명령 뒤 스냅숏은 명령 전과 같다 (분취는 전부 아니면 전무) | R8-2 |
| I9 | 성공한 eventId에 같은 op·같은 args(키 순서 무시, 배열 순서 구별) → 처음 Receipt, 상태 그대로 / 다른 op·args → EVENT_CONFLICT / 실패한 eventId는 기록 안 됨 | R7 |
| I10 | 시료 ID·예약 ID는 끝난 뒤에도 다시 못 쓴다. ID는 종류마다 따로 고유 | R1-4 |
| I11 | 이력의 args는 받을 때의 값 — 호출한 쪽이 넘긴 객체를 나중에 고쳐도, 나중 명령이 있어도 그대로 | R8-3 |

## 7. 헷갈리기 쉬운 짝

| 짝 | 구별 | 출처 |
| --- | --- | --- |
| 시료 ID / 용기 ID | 담긴 것 / 그릇. 같은 글자여도 다른 대상 | R1-4 |
| 부모 / 시작 시료 | 바로 위 분취 출처 / 계보의 시작(receive) | R2-1, R2-2 |
| 남은 양 / 이용 가능량 | 실제로 남은 양 / 예약을 뺀 양 | R3-1 |
| 예약 / 소비 | 쓸 권리를 잡음(양 그대로) / 실제로 줄어듦 | R3-2, R3-4 |
| 분취 / 소비 | 계보 안에서 옮김(I1 보존) / 계보 밖으로 나감 | R2-4 |
| 장소 / 보관 책임자 | 물리적 위치(용기에서 도출) / 관리 주체 | R5-1, R6 |
| 바닥남 DEPLETED / 폐기 DISCARDED | 분취·소비로 0이 됨 / discard로 버림 | R4-2, R4-3 |
| eventId / reservationId | 명령 재전송 식별 / 예약 식별 | R7, R3 |
