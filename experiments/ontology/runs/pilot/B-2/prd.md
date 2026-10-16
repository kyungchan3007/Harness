# 0040 — 연구실 시료 보관 엔진 — PRD

## 개요

**한 줄 요약:** 가상의 연구실에서 액체 시료를 받아들이고, 나눠 담고, 예약하고, 사용하고, 버리고, 옮기는 작업을 기록하는 인메모리 엔진.

- **이슈:** #1

**범위:**
- 메모리 내 상태 관리 (저장소/동시 실행 제외)
- 단일 호출 단위 처리 (각 명령은 원자적)
- 계보·수량 보존 규칙 준수
- 실패 시 상태 변화 없음 (트랜잭션 의미)

**입출력:**
- 입력: `Catalog` (위치·책임자·용기 초기 목록)
- 출력: `Lab` 인터페이스 (8개 명령 + snapshot)
- 반환: `Result<Receipt>` (성공/실패 분리)

---

## 요구사항

### R1: 기본 개체 & 유효성

| 개체 | 특징 |
|------|------|
| **장소** | Catalog에 선언된 것만 |
| **용기** | 장소 하나에 고정, 용량 있음, 최대 시료 1개 |
| **시료** | 용기에 담긴 액체(양: 정수 μL), 상태: ACTIVE/DEPLETED/DISCARDED |
| **예약** | 시료의 일정량을 잡아두기, 상태: ACTIVE/CANCELED/CONSUMED |
| **이벤트** | 성공한 명령 기록, eventId로 중복 방지 |

**오류 코드:**
- 참조 오류: `UNKNOWN_CONTAINER`, `UNKNOWN_CUSTODIAN`, `UNKNOWN_SAMPLE`, `UNKNOWN_RESERVATION`
- 용량/수량: `CAPACITY_EXCEEDED`, `INSUFFICIENT`
- 상태: `CONTAINER_OCCUPIED`, `NOT_ACTIVE`, `RESERVATION_CLOSED`, `HAS_RESERVATION`
- 입력: `INVALID_INPUT`, `ID_TAKEN`
- 충돌: `EVENT_CONFLICT`

### R2: 계보·수량 보존

1. `receive`: 계보 시작점만 생성
2. `split`: 부모→자식 분취, 합계 보존
3. **불변식**: 시작 시료 수량 = ∑(활성 시료 남은 양) + ∑(소비량) + ∑(폐기량)

### R3: 예약·소비

**이용 가능량 = 남은 양 − ACTIVE 예약 합**

- `reserve`: 이용 가능량 검사
- `cancel`: ACTIVE→CANCELED, 예약 양 풀기
- `consume`: 예약 전량 소비 (부분 소비 불가)

### R4: 상태 전이

- ACTIVE → DEPLETED (남은 양 0)
- ACTIVE → DISCARDED (명시적 폐기, ACTIVE 예약 없을 때만)
- DEPLETED/DISCARDED: 불가역, 용기 비움

### R5: 용기·장소 규칙

- 시료의 장소 = 담긴 용기의 장소 (계산 필드)
- `move`: 빈 용기로만 이동, 용량 확인, 양/예약/책임자 변화 없음

### R6: 보관 책임

- `receive`: 책임자 설정
- `split`: 자식 ← 부모 책임자
- `transferCustody`: 한 시료만, ACTIVE 시료만

### R7: 이벤트 멱등성

**이미 성공한 eventId + 같은 명령·인자 → 첫 Receipt 재반환, 상태 변화 없음**

- 객체 키 순서 무시, 배열 순서 구별
- 실패한 eventId는 기록 안 됨

### R8: 원자성·이력

- 성공 시: seq +1, 이벤트 기록
- 실패 시: 모든 상태 불변
- 다자 분취도 all-or-nothing

---

## 인터페이스

```typescript
interface Lab {
  receive(eventId, input): Result<Receipt>
  split(eventId, parentId, children): Result<Receipt>
  reserve(eventId, input): Result<Receipt>
  cancel(eventId, reservationId): Result<Receipt>
  consume(eventId, reservationId): Result<Receipt>
  discard(eventId, sampleId): Result<Receipt>
  move(eventId, sampleId, targetContainerId): Result<Receipt>
  transferCustody(eventId, sampleId, custodianId): Result<Receipt>
  snapshot(): Snapshot
}
```

**구현 위치:** `src/lab/lab.ts`  
**타입 계약:** `src/lab/types.ts` (고정, 수정 불가)

---

## Acceptance

- [ ] 8가지 명령 모두 구현 (receive, split, reserve, cancel, consume, discard, move, transferCustody)
- [ ] 모든 규칙 R1~R8 준수 확인
- [ ] 8개 공개 예시 모두 통과
- [ ] `pnpm check` PASS

## 애매한 곳·가정

- 없음 — 요구사항이 충분히 명확함
