# 0040 — 연구실 시료 보관 엔진 — PRD

- **이슈:** #1

## PRD
- **목표:** 연구실에서 시료(액체)를 받아들이고, 나눠 담고, 예약하고, 쓰고, 버리고, 옮기는 일을 기록하는 인메모리 엔진을 만든다.
- **비목표:** 실제 연구실 운영, 저장소·동시 실행·실제 시각, HTTP API.

## 핵심 개념

### 대상(Catalogs)
- **장소(Location)**: 용기가 놓인 곳. 초기 목록에만 존재
- **용기(Container)**: 시료를 담는 그릇. 장소 1개에 고정, 용량 있음
- **보관 책임자(Custodian)**: 시료를 관리하는 주체. 초기 목록에만 존재

### 데이터(Snapshots)
- **시료(Sample)**: 용기에 담긴 액체. 양은 정수 μL
- **예약(Reservation)**: 시료의 일정량을 쓰겠다고 잡아 둔 것
- **이벤트(Event)**: 성공한 명령 하나의 기록

### 시료 상태
- `ACTIVE`: 사용 가능
- `DEPLETED`: 분취/소비로 남은 양 0
- `DISCARDED`: 폐기됨

### 예약 상태
- `ACTIVE`: 유효
- `CANCELED`: 취소됨
- `CONSUMED`: 소비됨

## 공개 명령 (8개)

1. **receive(eventId, input)**: 새 시료 받아들임
   - 입력: `{ sampleId, containerId, custodianId, qty }`
   - 효과: RootSample 생성, 용기 점유

2. **split(eventId, parentId, children)**: 부모 시료를 자식들로 분취
   - 입력: `{ parentId, children: [{ sampleId, containerId, qty }, ...] }`
   - 효과: ChildSample 생성, 부모 remaining 감소

3. **reserve(eventId, input)**: 시료의 일정량을 예약
   - 입력: `{ reservationId, sampleId, qty }`
   - 효과: reserved 증가 (remaining은 변화 없음)

4. **cancel(eventId, reservationId)**: 예약 취소
   - 효과: reserved 감소

5. **consume(eventId, reservationId)**: 예약한 양 전부 소비
   - 효과: remaining, reserved, consumedQty 업데이트

6. **discard(eventId, sampleId)**: 시료 폐기
   - 효과: discardedQty 증가, remaining 0, 상태 DISCARDED

7. **move(eventId, sampleId, targetContainerId)**: 시료를 다른 용기로 이동
   - 효과: containerId만 변경 (양, 예약, 계보, 책임자 불변)

8. **transferCustody(eventId, sampleId, custodianId)**: 책임자 변경
   - 효과: 그 시료의 custodianId만 변경

## 애매한 곳·가정
- args 비교 형식 — 객체는 키 순서 무시, 배열은 순서 구별 (가정)
- 에러 코드 우선순위 — 여러 규칙을 위반하면 어느 코드를 반환해도 됨 (가정)
- 용기-시료 "지금 차 있음" 검사 시점 — 명령 시작 시점 기준 (가정)

## Acceptance
- [x] `createLab(catalog: Catalog): Lab`을 `src/lab/lab.ts`에서 내보냄
- [x] 8개 명령 모두 구현 (receive, split, reserve, cancel, consume, discard, move, transferCustody)
- [x] 19개 오류 코드 처리 (예외 던지지 않음, `{ ok: false, code }` 반환)
- [x] 11개 불변식 검증 (I1~I11)
- [x] R7 같은 eventId 재전송 감지 및 재전송 정책 구현
- [x] R8 원자성 (실패 시 상태 불변, split 원자성)
- [x] snapshot() 함수 구현
- [x] `pnpm check` ALL PASS (타입 검사, 린트, 테스트)

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
