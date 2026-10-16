# 0040 — 연구실 시료 보관 엔진 — PRD

- **이슈:** #1

## 목표
메모리 기반의 연구실 시료(액체) 보관 관리 엔진을 구현한다. 시료의 수수, 분취, 예약, 소비, 폐기, 이동, 책임자 변경을 추적하며, 원자성과 계보 보존을 보장한다.

## 범위
- **대상:** 장소(location), 용기(container), 보관 책임자(custodian), 시료(sample), 예약(reservation)을 관리
- **연산:** receive, split, reserve, cancel, consume, discard, move, transferCustody
- **저장소:** 메모리 내에서만 동작; 동시 실행/실제 시각 미지원
- **오류 처리:** 예외가 아닌 Result<T> 타입으로 반환

## Acceptance
- [x] receive: 시료 수수, 첫 시료 생성(rootId=자신, parentId=null)
- [x] split: 분취, 계보 연결(parentId=부모, rootId=부모의 rootId), 수량 보존
- [x] reserve/cancel: 예약 예약/취소, 이용 가능량 = remaining - reserved
- [x] consume: 예약 소비, remaining과 reserved 동시 감소
- [x] discard: 폐기, ACTIVE 예약이 없어야 함
- [x] move: 용기 이동, 양·예약·계보·책임자 불변
- [x] transferCustody: 책임자 변경, 한 시료만
- [x] 원자성: 모두 성공 또는 모두 실패
- [x] 이력: eventId 중복 시 처음 Receipt 반환, seq 1부터

## 애매한 곳·가정
- 실제 연구실 관행 무시, 규칙만 따름 (가정)
- 동시 실행/동기화 미지원 (가정)
- 예외 vs Result 코드 (확인됨: 규칙에 명시)
