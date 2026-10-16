# 도메인 온톨로지 — 연구실 시료 보관 (확장판)

요청·`docs/` 정책 문서·코드 주석·`types.ts`에 흩어진 규칙을 **개념·관계·상태·명령·불변식**으로 한곳에 다시 정리한 것입니다. 새 규칙은 없습니다. 원출처와 다르면 원출처가 기준입니다. 괄호 안은 원출처입니다.

## 1. 개념

| 개념 | 정의 | 출처 |
| --- | --- | --- |
| 장소·용기·책임자 | 처음 목록에만 존재. 용기는 장소 하나에 고정, 용량과 지원 보관 등급 목록(`supportedGrades`) | engine.md 대상, types |
| 시료 | 용기에 담긴 액체(정수 μL). 요구 보관 등급(`storageGrade`)·격리 여부(`quarantined`)가 있음 | engine.md, storage.md, quality.md |
| 시작 시료 / 자식 시료 | `receive`로 만든 계보의 시작 / `split`으로 부모에서 나눈 시료 | engine.md E2 |
| 예약 | 시료의 일정량을 쓰겠다고 잡아 둔 것. 만료 시각(`expiresAt`, null=기한 없음) | reservations.md |
| 논리 시각 `now` | 0에서 시작, `advanceTime`으로만 진행 | 요청, reservations.md |
| 운송 | 시료를 다른 용기로 옮기는 2단계 절차 | 요청, transit.md |
| 이벤트 / 영수증 | 성공한 명령 하나의 기록 / { eventId, seq } | engine.md E5·E6 |

## 2. 수량

| 이름 | 정의 | 출처 |
| --- | --- | --- |
| remaining | 용기에 실제로 남은 양 | engine.md |
| reserved | ACTIVE 예약 양의 합 | reservations.md |
| available | remaining − reserved | reservations.md |
| consumedQty / discardedQty | 소비 누적 / 폐기 누적 | reservations.md, engine.md E3 |

## 3. 관계

| 관계 | 다중성 | 바뀌는가 | 출처 |
| --- | --- | --- | --- |
| 용기 → 장소 | 1:1 | 안 바뀜 | engine.md |
| ACTIVE 시료 → 용기 | 시료 1 : 용기 1, 용기 1 : 시료 0..1 | move·도착 확정으로 | engine.md E1, transit.md |
| 끝난 시료 → 용기 | 없음(containerId null) | — | engine.md E3 |
| ACTIVE 운송 → 목적 용기 | 운송 1 : 용기 1, 용기 1 : ACTIVE 운송 0..1 (배타적 확보) | 운송이 끝나면 풀림 | transit.md, storage.ts 주석 |
| 자식 → 부모, 시료 → 시작 시료 | 1:1 | 안 바뀜 | engine.md E2 |
| 자식의 책임자·보관 등급 | 분취 순간 부모의 것을 이어받음 | 등급은 이후 안 바뀜 | engine.md E4, samples.ts 주석, storage.md |
| 예약 → 시료, 운송 → 시료 | n:1 | 안 바뀜 | reservations.md, transit.md |

## 4. 상태

| 대상 | 상태 | 전이 | 출처 |
| --- | --- | --- | --- |
| 시료 생애 | ACTIVE → DEPLETED(분취·소비로 0) / DISCARDED(discard) | 끝난 상태는 되살릴 수 없음 | engine.md E3 |
| 시료 격리 | quarantined true/false (생애와 따로) | quarantine·release, 같은 값이어도 성공 | 요청, quality.md |
| 예약 | ACTIVE → CANCELED / CONSUMED / EXPIRED | 끝난 예약에 cancel·consume → RESERVATION_CLOSED | reservations.md |
| 운송 | ACTIVE → ARRIVED / CANCELED | 끝난 운송에 새 도착·취소 → TRANSIT_CLOSED | transit.md |

## 5. 명령별 전제·효과

| 명령 | 전제 (어기면) | 효과 | 출처 |
| --- | --- | --- | --- |
| receive | 양 범위·등급 값(INVALID_INPUT) · 새 sampleId(ID_TAKEN) · 있는 용기·책임자 · 빈 용기(시료도 운송 확보도 없음, CONTAINER_OCCUPIED) · 용량 · 등급 적합(STORAGE_INCOMPATIBLE) | 시작 시료(등급 지정, 격리 false) | engine.md, 요청, storage.md |
| split | 자식 1개 이상 · 부모 ACTIVE · **격리 아님(QUARANTINED)** · **운송 중 아님(IN_TRANSIT)** · 자식 용기 비어 있고 서로 다름·확보 안 됨 · 용량 · **자식 용기가 부모 등급 지원** · 합 ≤ 부모 available | 자식(부모의 rootId·책임자·**등급** 이어받음) | engine.md, 요청, samples.ts 주석, storage.md |
| reserve | 양 범위 · expiresAt는 null 또는 now보다 큰 유효 정수(INVALID_INPUT) · 새 reservationId · 시료 ACTIVE · **격리 아님** · 양 ≤ available | reserved += 양. 운송 중에도 가능 | 요청, reservations.md, transit.md |
| cancel | 예약 있음 · ACTIVE | CANCELED, reserved −= 양. **격리·운송 중에도 가능, 격리는 그대로** | reservations.md, quality.md |
| consume | 예약 있음 · ACTIVE · **격리 아님** · **운송 중 아님** | 양 전체: remaining·reserved 감소, consumedQty 증가, 0이면 DEPLETED | reservations.md, 요청 |
| discard | 시료 ACTIVE · **운송 중 아님** · ACTIVE 예약 없음(HAS_RESERVATION) | 남은 양 전부 폐기, DISCARDED, 용기 비움. **격리는 막지 않음** | engine.md E3, 요청, quality.md |
| move | 시료 ACTIVE · **운송 중 아님** · 빈 용기(지금 용기·운송 확보 포함 CONTAINER_OCCUPIED) · 용량 · **등급 적합** | 용기만 바뀜. **격리는 막지 않음** | engine.md E4, 요청, quality.md |
| transferCustody | 시료 ACTIVE · 있는 책임자 | 그 시료 하나만. 격리·운송 중에도 가능 | engine.md E4, quality.md, transit.md |
| quarantine / release | 시료 ACTIVE | quarantined만 바꿈. **기존 예약(상태·양·만료) 그대로**, 예약 있어도 가능 | 요청, quality.md |
| advanceTime(to) | to는 now 이상의 유효 정수(INVALID_INPUT) | now = to, **expiresAt ≤ now인 ACTIVE 예약은 모두 EXPIRED**(경계 포함), 예약 양만 풀림. 이벤트 하나 | 요청, reservations.md |
| startTransit | **운송 ID 새것(끝난 운송 포함, ID_TAKEN)** · 시료 ACTIVE · 운송 중 아님(IN_TRANSIT) · 목적 용기 있음·비어 있음·확보 안 됨 · 용량 · **등급 적합** | ACTIVE 운송, 출발 용기 점유 유지 + 목적 용기 확보. 격리는 막지 않음 | 요청, transit.md, storage.md |
| confirmArrival | 운송 있음(UNKNOWN_TRANSIT) · ACTIVE(TRANSIT_CLOSED) | 시료를 목적 용기로(출발 용기 빔), ARRIVED | 요청, transit.md |
| cancelTransit | 운송 있음 · ACTIVE | 출발 용기에 그대로, CANCELED, 목적 확보 풀림 | 요청, transit.md |

## 6. 불변식

| ID | 불변식 | 출처 |
| --- | --- | --- |
| I1 | 계보마다: 받은 양 = Σ(remaining + consumedQty + discardedQty) | engine.md E2 |
| I2 | ACTIVE 시료는 용기 하나, 용기 하나엔 ACTIVE 시료 최대 하나, 끝난 시료는 containerId null | engine.md E1·E3 |
| I3 | remaining ≤ 용기 용량, 0 ≤ reserved ≤ remaining | engine.md E1, reservations.md |
| I4 | reserved = 그 시료의 ACTIVE 예약 양 합 | reservations.md |
| I5 | 끝난 시료·예약·운송은 다시 ACTIVE가 되지 않는다 | engine.md E3, reservations.md, transit.md |
| I6 | parentId·rootId 불변, 자식 rootId = 부모 rootId | engine.md E2 |
| I7 | events[i].seq = i+1, 이벤트 수 = 성공한 새 명령 수 | engine.md E6 |
| I8 | 실패한 명령 뒤 스냅숏 = 명령 전 스냅숏 (분취는 전부 아니면 전무) | engine.md E6 |
| I9 | 성공한 eventId 재전송: 같은 op·args → 처음 Receipt·상태 그대로 / 다르면 EVENT_CONFLICT / 실패한 eventId는 기록 안 됨 | engine.md E5 |
| I10 | 시료·예약·운송 ID는 끝난 뒤에도 다시 못 씀 | engine.md E1, transit.md |
| I11 | 이력 args는 받을 때의 값(호출한 쪽이 고쳐도 그대로) | engine.md E6 |
| I12 | ACTIVE 시료의 요구 등급은 담긴 용기의 지원 목록에 정확히 들어 있다. 시료 등급은 만들어진 뒤 바뀌지 않는다 | storage.md |
| I13 | expiresAt ≤ now인 ACTIVE 예약은 없다 | reservations.md |
| I14 | ACTIVE 운송의 시료는 ACTIVE이고 출발 용기에 있다. ACTIVE 운송의 목적 용기는 비어 있고 다른 ACTIVE 운송의 목적지가 아니다 | transit.md, storage.ts 주석 |

## 7. 헷갈리기 쉬운 짝

| 짝 | 구별 | 출처 |
| --- | --- | --- |
| 격리 quarantined / 생애 status | 쓰지 못하게 묶음(되돌릴 수 있음) / ACTIVE·끝남 | quality.md |
| 예약 취소 / 예약 만료 | 명령으로 끝냄 CANCELED / 시각 진행으로 끝남 EXPIRED (둘 다 기록 남음) | reservations.md |
| 출발 용기 점유 / 목적 용기 확보 | 운송 중 시료가 실제로 있는 곳 / 도착할 자리를 잡아 둠 — 둘 다 다른 시료가 못 씀 | transit.md |
| 직접 이동 move / 운송 | 한 번에 옮김(운송 중엔 금지) / 시작→도착·취소 2단계 | 요청, transit.md |
| 등급 정확 일치 / 상하 관계 | 목록에 그 이름이 있어야 함 / 없음(FROZEN 용기도 CHILLED는 못 받음) | storage.md |
