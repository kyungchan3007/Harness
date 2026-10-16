# 0040-lab PRD — 연구실 시료 보관 엔진

## 0. 메타데이터
- **이슈:** #1

## 1. 목표
메모리 기반 이벤트 소싱 시스템으로 연구실 시료(액체)의 생명주기를 기록하는 엔진을 구현한다.

## 2. 요구사항 범위

### 입력
- **Catalog**: 장소(location), 용기(container, 용량·장소), 보관 책임자(custodian) 목록
- **명령**: 8가지 작업 (receive, split, reserve, cancel, consume, discard, move, transferCustody)
- **EventId 기반 멱등성**: 같은 eventId·같은 인자로 재전송 시 처음 결과 반환

### 출력
- **Receipt**: eventId + seq (순차 번호)
- **Snapshot**: 현재 상태 (samples, reservations, events)
- **Result<T>**: { ok: true, value: T } 또는 { ok: false, code: ErrorCode }

### 비요구사항
- 저장소, 동시성, 실제 시간, 네트워크

## 3. 상태 모델

### Sample 상태
- **ACTIVE**: 사용 가능 상태
- **DEPLETED**: 남은 양이 0 (분취·소비로 소진)
- **DISCARDED**: 명시적으로 폐기됨

상태 전이:
- ACTIVE → DEPLETED (자동)
- ACTIVE → DISCARDED (`discard` 명령)
- DEPLETED, DISCARDED → 끝난 상태 (되살릴 수 없음)

### Reservation 상태
- **ACTIVE**: 아직 사용하지 않음 (양 예약됨)
- **CANCELED**: 사용자가 취소
- **CONSUMED**: 전체 양 사용됨

## 4. 핵심 불변식 (Invariants)

1. **계보**: 부모-자식 관계는 한 번 정해지면 바뀌지 않음
2. **양 보존**: 받은 양 = 현존 시료 남은 양 합 + 소비 누적 + 폐기 누적
3. **용기**: 
   - 시료 하나 최대 한 개
   - 용량 제약 (남은 양 ≤ 용량)
   - ACTIVE 상태일 때만 용기 참조
4. **이용 가능량**: remaining - ACTIVE 예약 양의 합 ≥ 0
5. **예약**: ACTIVE 시료만 가능, ACTIVE 예약만 소비/취소 가능
6. **원자성**: 성공 또는 전혀 안 함 (부분 성공 없음)

## 5. 명령 목록

| 명령 | 입력 | 결과 | 핵심 검증 |
|------|------|------|---------|
| receive | sampleId, containerId, custodianId, qty | Receipt | 용기 비어있음, 용량, ID 중복 |
| split | parentId, children[] | Receipt | 부모 ACTIVE, 이용 가능량, 자식 용기 비어있음 |
| reserve | reservationId, sampleId, qty | Receipt | 시료 ACTIVE, 이용 가능량 충분 |
| cancel | reservationId | Receipt | 예약 ACTIVE |
| consume | reservationId | Receipt | 예약 ACTIVE, 시료 ACTIVE |
| discard | sampleId | Receipt | 시료 ACTIVE, ACTIVE 예약 없음 |
| move | sampleId, targetContainerId | Receipt | 시료 ACTIVE, 목표 용기 비어있음·용량 충분 |
| transferCustody | sampleId, custodianId | Receipt | 시료 ACTIVE, 책임자 존재 |

## 6. 우선순위

1. **정확성**: 불변식 위반 금지
2. **멱등성**: R7 구현 (eventId 중복 검사)
3. **원자성**: R8 구현 (부분 성공 금지)

## Acceptance

- [x] `pnpm check` 통과
- [x] 제공된 공개 예시 5개 통과
- [x] 모든 ErrorCode 시나리오 검증
- [x] 멱등성 (R7) 검증
- [x] 원자성 (R8) 검증

## 애매한 곳·가정

- 없음 — 사용자가 규칙(R1~R8)을 완전히 명시함
