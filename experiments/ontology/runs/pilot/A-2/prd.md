# 0040 — 연구실 시료 보관 엔진 — PRD

- **이슈:** #1

## 개요
가상 연구실 환경에서 액체 시료를 받아들이고, 분취하고, 예약하고, 소비하고, 폐기하고, 이동하는 일련의 작업을 기록하는 메모리 기반 엔진.

## 대상
- **장소(location)**: 용기가 위치한 물리적 장소
- **용기(container)**: 하나의 장소에 고정된, 용량이 있는 보관 단위
- **시료(sample)**: 용기에 담긴 액체, 정수 μL 단위의 양
- **예약(reservation)**: 시료의 일정량을 사용하겠다고 잡아두는 것
- **보관 책임자(custodian)**: 시료의 관리 책임을 가지는 사람/조직
- **이벤트(event)**: 성공한 명령 하나의 기록

## 공개 계약 (types.ts)
모든 타입·인터페이스·에러 코드는 `src/lab/types.ts`에 정의되어 있으며, 수정하지 않음.

### Lab 인터페이스 (8개 메소드)
```typescript
createLab(catalog: Catalog): Lab
```

Lab은 다음 8개 메소드를 제공:
1. `receive(eventId, input)`: 새 시료 받아들이기
2. `split(eventId, parentId, children)`: 시료를 분취하여 자식 시료 생성
3. `reserve(eventId, input)`: 시료의 일정량 예약
4. `cancel(eventId, reservationId)`: 예약 취소
5. `consume(eventId, reservationId)`: 예약된 양 전체 소비
6. `discard(eventId, sampleId)`: 시료 폐기
7. `move(eventId, sampleId, targetContainerId)`: 시료를 다른 용기로 이동
8. `transferCustody(eventId, sampleId, custodianId)`: 보관 책임자 변경

모든 메소드는 `Result<Receipt>` 반환 (성공/실패).

## 기술 요구사항
- 구현: `src/lab/lab.ts`
- Export: `createLab` 함수
- 상태 관리: 메모리 기반, 한 번에 한 호출씩 처리
- 실패 처리: 예외 없음, `{ ok: false, code }` 반환
- 저장소·동시 실행·실제 시각: 다루지 않음

## Acceptance

- [ ] `pnpm check` 통과 (타입 체크, 테스트)
- [ ] R1~R8 모든 규칙 구현 및 테스트
- [ ] 공개 예시 5가지 재현 가능

## 애매한 곳·가정

- 없음 — 요청에서 모든 규칙이 명확하게 정의됨
