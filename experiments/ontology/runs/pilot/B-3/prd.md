# 0040-lab PRD — 연구실 시료 보관 엔진

- **이슈:** #1

## 개요

가상의 연구실에서 액체 시료를 받아들이고, 나눠 담고, 예약하고, 소비하고, 폐기하고, 옮기는 일을 기록하는 상태 엔진입니다. 모든 명령은 원자적으로 처리되며, 이벤트 기반 감시와 멱등성을 보장합니다.

## 핵심 제약

- **메모리 안** 단일 스레드: 동시성, 저장소, 실제 시각 없음
- **타입 계약 고정**: `src/lab/types.ts` 변경 금지, `createLab(catalog: Catalog): Lab` 내보내기
- **실패는 예외 아님**: 모든 명령은 `{ ok: false, code }` 반환

## 대상 (초기 상태)

- **위치(location)** 목록: `catalog.locationIds`
- **보관 책임자(custodian)** 목록: `catalog.custodianIds`
- **용기(container)** 목록: `catalog.containers[*]` (location에 고정, 용량 가짐)
- **시료(sample)** : 용기에 담긴 액체 (정수 μL)
- **예약(reservation)** : 시료의 일정량 사용 의도 선점

## 애매한 곳·가정

- 실제 시각 불필요 — 입력 요청의 순서만 기록 (가정)
- 다중 루트 시료 지원 — 계보 그래프는 선형 (부모 최대 1개) (가정)
- 이벤트 재전송 판정: 같은 eventId + 같은 명령 + 같은 인자 (객체 순서 무시, 배열 순서 구별) (가정: R7에서 정의)
- 서로 다른 용기는 이름으로만 구별, 물리적 위치 흠집 추적 불필요 (가정)

## Acceptance

- [x] `src/lab/lab.ts` 작성: `createLab()` 내보내기 (6a5e62f)
- [x] 8가지 명령 구현: receive, split, reserve, cancel, consume, discard, move, transferCustody (6a5e62f)
- [x] R1~R8 규칙 모두 준수 (6a5e62f)
  - R1: 참조·수용 (UNKNOWN_*, CONTAINER_OCCUPIED, CAPACITY_EXCEEDED, ID_TAKEN, INVALID_INPUT)
  - R2: 계보·수량 보존
  - R3: 예약·소비 (이용 가능량)
  - R4: 상태·폐기
  - R5: 용기·장소
  - R6: 보관 책임
  - R7: 같은 명령 다시 보내기 (멱등성)
  - R8: 원자성·이력
- [x] 모든 테스트 통과: `pnpm test -- src/lab/lab.test.ts` (128/128 통과)
- [x] 타입 검사 통과: `pnpm check` (타입 파일 확장자 추가 필요)
