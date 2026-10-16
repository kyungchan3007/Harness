# 0040 — 연구실 시료 보관 엔진 — PRD

## PRD
- **문제:** 도메인 엔진은 장바구니(0002, 2개 집계 함수)에서 끝났다. 더 복잡한 상태 기계가 필요하고, 부모-자식 계보·다중 불변식·예약 시스템을 테스트해야 한다.
- **목표:** 액체 시료를 받아들이고, 나눠 담고, 예약하고, 쓰고, 버리고, 옮기는 행동을 기록하는 in-memory 엔진을 만든다. 규칙은 요청의 "규칙 R1~R8"이 단일 소스다.
- **비목표:** 영속화, 병렬·실시간, 실제 연구실 관행.
- **이슈:** #1

## 애매한 곳·가정
- 시료 상태는 요청이 명확히 ACTIVE·DEPLETED·DISCARDED 3개 — 그대로 (가정)
- 예약 상태는 ACTIVE·CANCELED·CONSUMED 3개 — 그대로 (가정)
- 수량 범위는 1~1,000,000 μL — 그대로 (가정)
- "같은 인자"는 objects의 키 순서 무시, arrays의 순서는 구별 — 요청 명시 (가정)
- 실패한 eventId는 재사용 가능(기록 안 됨) — 요청의 R7 규칙대로 (가정)

## Acceptance
- [x] `createLab(catalog): Lab`이 8개 명령(receive, split, reserve, cancel, consume, discard, move, transferCustody)을 제공한다
- [x] 각 명령은 성공 시 Receipt, 실패 시 ErrorCode를 돌려준다
- [x] 규칙 R1~R8(참조·수용·계보·수량·예약·상태·용기·책임·이벤트·원자성)을 모두 구현한다
- [x] 공개 예시 5개를 전부 통과한다
- [x] 규칙을 어기는 호출은 상태를 바꾸지 않는다 (원자성)
- [x] `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
