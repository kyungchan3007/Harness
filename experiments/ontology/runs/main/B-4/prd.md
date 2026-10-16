# 0040 — Lab Sample Storage Engine — PRD

- **이슈:** #1

## 문제 정의

연구실에서 시료를 관리하는 작업을 모델링하는 엔진이 필요합니다.
- 시료 수령, 분취, 예약, 소비, 폐기, 이동, 책임자 변경 등의 작업을 원자적으로 기록
- 메모리 기반, 동시성 없음, 실시간 타임스탬프 없음

## 범위

### ✅ 포함
- 시료 생명주기: ACTIVE → DEPLETED/DISCARDED
- 계보 추적: 부모-자식 관계, rootId
- 예약 관리: ACTIVE → CANCELED/CONSUMED 상태 전환
- 용기·장소·책임자 관계 추적
- 이벤트 로깅(eventId 기반, 멱등성 지원)
- 규칙 기반 검증(R1~R8)

### ❌ 제외
- 데이터베이스, 저장소, 재시작 후 복구
- 동시 요청 처리
- 실제 시각, 타임스탬프
- 단위 변환(항상 μL)
- 사용자 인증·권한

## 요구사항

### Q1: Lab 인터페이스 구현
- `createLab(catalog: Catalog): Lab` 함수로 엔진 초기화
- Catalog: locationIds, custodianIds, containers 명세
- 8개 메서드 구현: receive, split, reserve, cancel, consume, discard, move, transferCustody
- snapshot() 메서드로 현재 상태 반환

### Q2: 규칙 준수 (R1~R8)
- **R1 참조·수용**: 알려진 엔티티만, ID 중복 방지, CONTAINER_OCCUPIED 등 검증
- **R2 계보·수량 보존**: receive가 root 생성, split은 계보 관계 유지, 수량 보존 법칙 준수
- **R3 예약·소비**: 이용 가능량 = 남은 양 - reserved, consume은 reserve와 함께만
- **R4 상태·폐기**: ACTIVE/DEPLETED/DISCARDED 전환, 끝난 상태는 불가역
- **R5 용기·장소**: 용기 이동, 용기 용량 검증
- **R6 보관 책임**: 분취 시 부모의 책임자 상속, transferCustody로 변경 가능
- **R7 멱등성**: 성공한 eventId 재전송 시 첫 Receipt 반환, 상태 불변
- **R8 원자성·이력**: 성공/실패 모두 원자적, 이력은 args 복사본 저장

### Q3: 오류 처리
- 실패는 `{ ok: false, code }` 반환 (예외 아님)
- ErrorCode: INVALID_INPUT, ID_TAKEN, CONTAINER_OCCUPIED, INSUFFICIENT 등

## 인수 기준

- **함수형**: receive·split·reserve·cancel·consume·discard·move·transferCustody 모두 구현
- **상태 정합성**: 규칙 위반 시도 시 상태 변화 없음 (원자성)
- **멱등성**: 성공한 eventId 재시도 시 동일 결과
- **테스트 커버리지**: 7개 공개 예시 모두 패스

## 애매한 곳·가정

- ID 형태(숫자/문자열 등) — 문자열 (타입에서 ID = string으로 정의됨) (가정)
- 용기별 위치는 Catalog에서 정해짐 — 시료의 "위치"는 담긴 용기의 위치 (R5) (가정)
- 끝난 시료(DEPLETED/DISCARDED)는 용기를 반드시 비움 — containerId = null (R4) (가정)

## Acceptance

- [x] receive·split·reserve·cancel·consume·discard·move·transferCustody 모두 구현
- [x] 규칙 R1~R8 모두 준수
- [x] 7개 공개 예시 테스트 통과
- [x] `pnpm check` PASS (타입·린트·테스트)

## 성공 판정

- `pnpm check` (타입·린트·테스트) 모두 PASS
- 7개 예시 + 추가 엣지 케이스 테스트 커버
