# 0040 — 연구실 시료 보관 엔진 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** 요청 규칙 R1~R8, types.ts (Lab 인터페이스, Snapshot, ErrorCode)
- **접근:** 자료구조는 samples/reservations Map, events 배열, eventIdMap. 각 명령은 ①R7 중복 확인 ②R1~R6 검증 ③R8 원자성 적용 ④eventIdMap 기록. R1~R6은 규칙별로 구현. R7은 sortKeys로 key 순서 무시한 args 비교. R8은 모든 검증 후 일괄 적용.
- **대안·트레이드오프:** reserved는 매번 예약 목록 재계산 (단순, 버그 방지 우선). args는 sortKeys 후 JSON 직렬화 비교 (정확성). containerId는 시료 끝날 때 null (상태 추적 명확).
- **파일 계획:** src/lab/lab.ts에 createLab 함수 (Sample/Reservation/EventRecord 내부 타입, Lab 객체 반환).
- **위험:** ①split 원자성 ②remaining/reserved 계산 오류 ③계보 불변성 ④containerId 정리.
- **검증 계획:** 규칙별 단위 테스트 (R1~R8 각각 성공/실패 시나리오 1개 이상) + 통합 테스트 (요청의 예시 1~5 통과). 특히 ①split 원자성 ②reserved 계산 ③중복 호출 판단 ④containerId 정리를 검증.

## 계획과 달라진 점

(작업 진행 중 기록)

## 검증 결과

(작업 완료 후 기록)
