# 0040 — 연구실 시료 보관 엔진 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, 요청의 규칙 R1~R8
- **접근:**
  - 입력된 규칙 R1~R8을 그대로 구현한다
  - 상태 = 샘플·예약·용기 3개 맵 + 이벤트 목록
  - 검증과 변경을 분리해서 원자성 보장
  - 모든 명령은 "검증 → 변경 → 기록" 순서
  - 중복 eventId 감지는 eventLog 맵으로

### 자료구조
Lab은 다음 상태를 메모리에 저장한다:
- `samples: Map<ID, SampleState>` — 각 시료의 생명주기 추적
  - `parentId, rootId, status` (계보)
  - `containerId, custodianId` (위치·책임)
  - `remaining, reserved, consumedQty, discardedQty` (수량)
- `reservations: Map<ID, ReservationState>` — 예약 추적
  - `sampleId, qty, status` (어느 시료에서 얼마나, 상태)
- `containers: Map<ID, ContainerState>` — 용기 사용 추적
  - `occupied: ID | null` (지금 담긴 시료 ID, 비었으면 null)
- `events: EventView[]` — 성공한 명령 기록
- `eventLog: Map<ID, EventRecord>` — 중복 명령 감지 (R7)

### 검증·원자성
1. 모든 명령은 "검증 → 상태 변경 → 이벤트 기록"의 순서를 따른다
2. 검증이 실패하면 상태 변경 전에 오류를 반환한다 (R8)
3. 다중 자식 split는 모든 자식을 검증한 후 일괄 생성한다 (R8)

### 알고리즘 핵심

#### 1. 계보·수량 보존 (R2)
- `split`할 때 모든 자식의 qty 합이 부모의 **이용 가능량** 이하인지 확인
- 자식 생성 시 `parentId = 부모`, `rootId = 부모.rootId`
- 부모 `remaining`에서 자식 qty 합 만큼 차감

#### 2. 예약·소비 (R3, R4)
- `reserve`: ACTIVE 예약이 `reserved`에 누적되고, 이용 가능량만 감소
  - 이용 가능량 = remaining - reserved
  - 이용 가능량보다 많이 예약하면 INSUFFICIENT
- `cancel`: 예약을 CANCELED로, `reserved`에서 차감
- `consume`: 예약 전체를 소비
  - remaining과 reserved를 함께 차감
  - consumedQty 증가
  - 예약을 CONSUMED로

#### 3. 상태 전환 (R4)
- remaining == 0 → DEPLETED (분취·소비)
- DEPLETED·DISCARDED는 끝난 상태 → 용기 비움, 더 이상 변경 불가
- `discard`: ACTIVE 예약 없을 때만 (HAS_RESERVATION)
  - discardedQty += remaining, remaining = 0 → DISCARDED

#### 4. 용기·이동 (R5)
- `move` 전에 대상 용기가 빈 상태 + 용량 체크
- containerId를 변경하고, 장소는 container.locationId로 조회
- 이동은 remaining·reserved·parentId·custodianId를 바꾸지 않음
- ACTIVE 예약이 있어도 이동 가능

#### 5. 중복 명령 (R7)
- `eventLog[eventId]` = `{ op, args, receipt }`로 저장
- 같은 eventId와 같은 op·args → 처음 receipt 돌려줌 (상태 변경 없음)
- 같은 eventId, 다른 op 또는 args → EVENT_CONFLICT
- 실패한 명령은 eventLog에 기록하지 않음

- **대안·트레이드오프:**
  - Map vs Array 상태 저장: Map 선택. 조회·검증이 O(1)이고, 재귀 순회 불필요.
  - 검증 시기: 변경 직전. 부분 실패를 원천 차단(multi-child split도 모두 성공 또는 모두 실패).
  - eventId 중복 감지: eventLog 맵. 다른 op·args를 EVENT_CONFLICT로 즉시 거부.
- **검증 계획:**
  - 단위 테스트: 각 메서드별로 정상·오류 경로 커버
  - 규칙별 테스트: R1(참조)·R2(계보)·R3(예약)·R4(상태)·R5(용기)·R6(책임)·R7(이벤트)·R8(원자성)
  - 시나리오 테스트: 요청의 공개 예시 5개 + 엣지 케이스
  - 불변식 확인: 시료 총량 보존, 용기 중복 점유 없음, containerId-status 일치
