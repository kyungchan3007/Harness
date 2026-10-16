# 0040 — 연구실 시료 보관 엔진 — PRD

## 이슈
- **이슈:** #1

## 문제 및 목표
- **문제:** 시료(액체) 보관의 복잡한 계보·수량·상태·예약 규칙을 메모리 안에서 안전하게 처리해야 한다.
- **목표:** 8개의 명령(receive·split·reserve·cancel·consume·discard·move·transferCustody)과 8개의 규칙(R1~R8)을 구현하는 lab 엔진을 만든다. 규칙은 [ontology.md](../../context/ontology.md)가 단일 소스다.
- **비목표:** 저장소, 동시 실행, 실제 시각, HTTP API.

## Acceptance
- [x] 장소·용기·책임자는 Catalog에서 온 것만 쓸 수 있다 (R1-1)
- [x] 시료와 예약의 ID는 중복될 수 없다 (R1-4, I10)
- [x] 시료 상태 전환은 ACTIVE → {DEPLETED, DISCARDED} (R4-1~4)
- [x] 예약 상태 전환은 ACTIVE → {CANCELED, CONSUMED} (R3-3, R3-4)
- [x] receive·split·reserve·cancel·consume·discard·move·transferCustody 모두 동작한다
- [x] 계보 수량 보존: 시작 시료 수량 = 모든 시료 남은 양 합 + 소비 누적 + 폐기 누적 (I1)
- [x] 예약은 남은 양을 줄이지 않고, 이용 가능량만 줄인다 (R3-1~2)
- [x] consume·discard·move·transferCustody는 ACTIVE 시료에만 작동한다 (R4-4, R5-3, R6-3)
- [x] 같은 eventId 재전송: 성공한 명령은 처음 Receipt 반환, 상태 불변. 다른 op/args면 EVENT_CONFLICT (R7)
- [x] 실패한 명령은 상태 변화 없음. 분취는 모두 성공 또는 모두 실패 (R8-2)
- [x] 이벤트 seq는 1부터 빈틈없이 1씩 (I7)
- [x] `pnpm check` ALL PASS

## 애매한 곳·가정
- **Catalog 내 요소들의 유효성:** Catalog의 locationIds·custodianIds·containers가 주어진 것은 모두 유효하다 (가정)
- **ID 종류 간 충돌:** sampleId와 containerId가 같은 문자열이어도 다른 것으로 취급. idRegistry는 모든 종류를 함께 관리 (가정)
- **지정 오류 코드 순서:** 규칙 다중 위반 시 어느 코드든 반환 가능 (가정)
- **Catalog 변경:** createLab 이후 Catalog는 불변 (가정)

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
