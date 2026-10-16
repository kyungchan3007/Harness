# 0040 — 연구실 시료 보관 엔진 — PRD

- **이슈:** #1

## 목표
실험실 환경에서 시료(액체)의 전체 생명주기를 추적하고 관리하는 인메모리 엔진을 구현합니다.
규칙 기반의 엄격한 상태 관리를 통해 시료 추적의 정확성과 불변식 보존을 보장합니다.

## 핵심 기능

### 시료 수명주기
- **receive**: 새 시료를 특정 용기와 책임자와 함께 받아들임 (계보 시작점)
- **split**: 시료를 여러 자식 시료로 분취 (계보 추적)
- **move**: 시료를 다른 용기로 이동 (장소 변경)
- **discard**: ACTIVE 예약이 없는 시료를 버림 (최종 상태: DISCARDED)

### 예약 및 소비
- **reserve**: 시료의 일정 양을 미리 예약 (이용 가능량 차감)
- **cancel**: ACTIVE 예약을 취소 (이용 가능량 복구)
- **consume**: ACTIVE 예약을 실제로 소비 (remaining과 reserved 동시 차감)

### 관리
- **transferCustody**: 개별 시료의 책임자 변경

## 기술 스펙

### 입출력
- 입력: `Catalog` (locations, containers, custodians 배열)
- 출력: `Lab` 인스턴스 (메서드 제공)
- 함수: `createLab(catalog: Catalog): Lab`

### 오류 처리
모든 실패는 예외를 던지지 않고 `{ ok: false, code }` 형태로 반환합니다.
예약 상태나 용기 부족 등 미리 검증 가능한 오류는 `INVALID_INPUT`, `INSUFFICIENT` 등의 코드로 구분합니다.

### 원자성
분취 명령(split)은 여러 자식을 동시에 생성하므로, 모두 성공하거나 모두 실패해야 합니다(롤백).

### 이벤트 식별자 재전송
동일한 `eventId`로 동일한 명령을 재전송하면, 이전 Receipt를 반환하고 상태를 변경하지 않습니다 (멱등성).

## 불변식

1. **계보 보존**: 시작 시료 수량 = Σ(remaining + consumedQty + discardedQty)
2. **용기 배정**: ACTIVE 시료는 반드시 하나의 용기에 속함, 용기당 최대 1개 ACTIVE 시료
3. **용량 제한**: remaining ≤ 용기 용량
4. **예약 정합**: reserved = ACTIVE 예약 qty 합
5. **비가역성**: 끝난 시료/예약은 다시 ACTIVE가 될 수 없음
6. **ID 고유성**: 사용된 sampleId/reservationId는 재사용 불가

## Acceptance

- [x] `createLab` 함수 구현 및 내보내기
- [x] R1~R8 모든 규칙 준수
- [x] 불변식 I1~I11 보존 확인
- [x] 공개 예시 5개 시나리오 동작
- [x] `pnpm check` 통과 (타입, 테스트, lint)

## 애매한 곳·가정

- **여러 규칙 위반 시 오류 코드**: 규칙을 여러 개 어기는 호출은 어긴 규칙의 오류 코드 중 무엇을 돌려줘도 됨 (가정)
- **시간·저장소**: 메모리 안에서 한 번에 한 호출씩 처리, 저장소·동시 실행·실제 시각 다루지 않음 (가정)
- **부모 끝남 시 자식 영향**: 부모가 DEPLETED·DISCARDED가 되어도 자식은 영향을 받지 않음 (자식의 rootId·parentId는 변하지 않음) (가정)
