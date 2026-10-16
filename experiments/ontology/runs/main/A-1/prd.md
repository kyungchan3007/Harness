# 0040 — 연구실 시료 보관 엔진 — PRD

- **이슈:** #1
- **문제:** 연구실에서 액체 시료를 받아들이고, 나눠 담고, 예약·소비·폐기·이동·책임자 변경을 추적하는 엔진이 필요하다.
- **목표:** 메모리 상태 머신으로 시료 생명주기(receive·split·reserve·cancel·consume·discard·move·transferCustody)를 8개 규칙 집합(R1~R8)으로 구현한다.
- **비목표:** 영속화, 동시 실행, 실제 시각, 저장소.

## 애매한 곳·가정
- 없음 — 요청이 규칙을 명확히 정의함

## Acceptance
- [x] `src/lab/lab.ts`에 `createLab(catalog: Catalog): Lab` 구현
- [x] Lab 인터페이스의 8개 메서드 모두 동작 (receive, split, reserve, cancel, consume, discard, move, transferCustody)
- [x] R1~R8 규칙을 모두 준수 (참조·수용·계보·수량 보존·예약·상태·용기·책임·재전송·원자성)
- [x] 오류는 예외 아닌 `{ ok: false, code }` 반환
- [x] `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
