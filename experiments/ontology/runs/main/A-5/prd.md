# 0040 — 연구실 시료 보관 엔진 — PRD

- **이슈:** #1
- **문제:** 연구실에서 액체 시료(sample)를 관리하는 과정(받기, 분취, 예약, 소비, 폐기, 이동)을 기록하는 엔진이 필요하다.
- **목표:** 메모리 안에서 시료의 계보·수량·상태·예약·용기 배정·보관 책임을 추적하는 엔진을 만든다.
- **비목표:** 저장소, 동시 실행, 실제 시각, 데이터 영속화.

## 애매한 곳·가정

- 없음 — 요청에 규칙 R1~R8로 모든 동작이 명시됨

## Acceptance

- [x] `createLab` 함수가 Catalog를 받아 Lab을 돌려준다
- [x] receive·split·reserve·cancel·consume·discard·move·transferCustody가 요청의 규칙 R1~R8을 모두 지킨다
- [x] 예외 대신 Result로 오류를 돌려준다
- [x] 완료한 명령의 eventId를 기록하고 중복 호출 시 첫 Receipt를 그대로 돌려준다 (R7)
- [x] 실패한 명령은 상태를 바꾸지 않는다 (R8)
- [x] snapshot()이 현재 상태(samples, reservations, events)를 모두 돌려준다
- [x] `pnpm check` ALL PASS (타입스크립트, 린트, 테스트)

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
