# 0040 — 시료 보관 엔진 — PRD

- **이슈:** #1

## 목표
가상의 연구실에서 시료(액체)의 수명주기를 관리하는 인메모리 엔진을 구현한다.
시료는 받아들이고(receive), 나눠 담고(split), 예약하고(reserve), 쓰고(consume), 버리고(discard), 옮기고(move), 책임자를 바꾸는(transferCustody) 명령을 처리한다.

## 요구사항

### R1 참조·수용
- 장소(location), 용기(container), 책임자(custodian)는 Catalog에 있는 것만 존재
- 오류: UNKNOWN_CONTAINER, UNKNOWN_CUSTODIAN, UNKNOWN_SAMPLE, UNKNOWN_RESERVATION
- ACTIVE 시료는 반드시 용기 하나에, 용기 하나에는 최대 하나
- 오류: CONTAINER_OCCUPIED
- 시료 남은 양(remaining) ≤ 용기 용량
- 오류: CAPACITY_EXCEEDED
- 시료 ID, 예약 ID는 한 번 쓰면 재사용 불가 (끝난 후에도)
- 오류: ID_TAKEN
- 양(qty)은 1~1,000,000 정수, 분취 자식 목록 비어있지 않아야 함
- 오류: INVALID_INPUT

### R2 계보·수량 보존
- receive만 root 시료 생성 (parentId=null, rootId=자신)
- split은 부모에서 1개 이상 자식 생성, 자식의 rootId=부모의 rootId
- 분취 가능 총량 ≤ 부모의 available (remaining - reserved)
- 오류: INSUFFICIENT
- 불변식: 시작시료 수량 = Σ(남은양+소비누적+폐기누적)

### R3 예약·소비
- available = remaining - ACTIVE 예약의 합(reserved)
- 예약은 남은양을 줄이지 않고 available만 줄임
- 오류: INSUFFICIENT, NOT_ACTIVE
- cancel은 ACTIVE 예약 → CANCELED, reserved 감소
- consume은 ACTIVE 예약의 양 전체를 씀: remaining·reserved 감소, consumedQty 증가, 예약 CONSUMED로
- 오류: RESERVATION_CLOSED (이미 끝난 예약 재처리)

### R4 상태·폐기
- 상태: ACTIVE → DEPLETED(분취/소비로 remaining=0) 또는 DISCARDED(discard명령)
- DEPLETED/DISCARDED는 돌이킬 수 없음 (NOT_ACTIVE)
- discard: remaining=0, status=DISCARDED, discardedQty 증가, 용기 비움
- 오류: HAS_RESERVATION (ACTIVE 예약 있으면 discard 불가)
- 끝난 시료는 containerId=null, 용기는 재사용 가능
- 부모 종료해도 자식 영향 없음

### R5 용기·장소
- 시료 location은 담긴 용기의 locationId (별도 저장 아님)
- move: 시료를 다른 용기로 (양·예약·계보·책임자 불변)
- 옮길 용기는 비어있고 용량 충분해야 함
- 오류: CONTAINER_OCCUPIED (지금 용기로 옮기거나, 차있는 용기)
- split 자식 용기도 비어있고 서로 다르고 충분한 용량
- 부모 용기는 점유된 것으로 간주
- ACTIVE 예약 중이어도 move 가능

### R6 보관 책임
- receive시 책임자 정함
- split시 자식은 부모의 책임자 이어받음
- transferCustody: 지정 시료의 책임자만 변경 (부모·자식 무관)
- 예약 중이어도 변경 가능
- ACTIVE만 변경 가능

### R7 같은 명령 다시 보내기
- 성공한 eventId로 같은 op·같은 args → 처음 Receipt 반환, 상태 무변
- 다른 op·args → EVENT_CONFLICT
- 객체 키 순서 무시, 배열 순서 구별
- 실패한 eventId는 기록 안 됨 (재시도 가능)

### R8 원자성·이력
- 성공한 새 명령 → eventId 기록, seq 1부터 1씩 증가
- 실패 → 아무것도 변화 없음 (split은 모두 성공 또는 모두 실패)
- 이력은 op와 args(eventId 제외)를 받을 때 복사해서 저장
- args는 receive·reserve는 input 그대로, split은 {parentId, children}, 나머지는 해당 필드

## Acceptance
- [ ] pnpm check PASS
- [ ] 공개 예시 5개 케이스 모두 작동
- [ ] 모든 오류 코드 적절히 반환

## 애매한 곳·가정
- 타입 정의: `src/lab/types.ts` 고정 (변경 금지) — (가정)
- 메모리 안: 저장소·동시 실행·실제 시각 다루지 않음 — (가정)
- 오류 발생 순서: 여러 규칙 위반 시 아무 오류 코드 반환 가능 — (가정)
