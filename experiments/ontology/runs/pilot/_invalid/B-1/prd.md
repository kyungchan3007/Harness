# 0040 — 연구실 시료 보관 엔진 — PRD

- **이슈:** #1

## 개요

연구실에서 시료(액체) 보관 및 추적을 기록하는 인메모리 엔진. 시료 수령, 분취, 예약, 소비, 폐기, 이동, 책임자 변경을 원자적으로 처리하고, 모든 작업을 이벤트로 기록.

## 요구사항

### 대상(Entities)
- **장소(location)**: 용기를 보관하는 위치. Catalog에 정의된 목록만 존재.
- **용기(container)**: 시료를 담는 물리적 단위. 장소 하나에 고정, 일정 용량을 가짐.
- **시료(sample)**: 용기에 담긴 액체. 양은 정수 μL.
- **예약(reservation)**: 시료의 일정량을 나중에 쓰겠다고 잡아 두는 것.
- **보관 책임자(custodian)**: 시료를 관리하는 사람/팀. Catalog에 정의된 목록만 존재.
- **이벤트(event)**: 성공한 명령 하나의 기록. 모든 명령은 eventId를 가짐.

### 기능
1. **receive**: 새 시료를 받아들임. 계보의 시작 시료를 만듦.
2. **split**: 부모 시료에서 새 자식 시료 1개 이상을 한 번에 만듦.
3. **reserve**: 시료의 일정량을 예약 (이용 가능량 차감).
4. **cancel**: 예약을 취소 (이용 가능량 복구).
5. **consume**: 예약된 양 전부를 소비 (남은 양과 예약 양 동시 차감).
6. **discard**: 시료의 남은 양 전부를 폐기.
7. **move**: 시료를 다른 용기로 이동.
8. **transferCustody**: 시료의 책임자 변경.
9. **snapshot()**: 현재 상태 조회 (시료, 예약, 이벤트 이력).

### 핵심 불변식
- **수량 보존**: 받은 시료 양 = 계보 내 모든 시료의 남은 양 합 + 누적 소비량 합 + 누적 폐기량 합.
- **이용 가능량**: 남은 양 − ACTIVE 예약 양의 합.
- **용기 독점**: ACTIVE 시료 하나가 용기 하나를 독점. 계보 완성(DEPLETED/DISCARDED)되면 용기 해제.
- **원자성**: 실패 시 모든 상태 변화 롤백 (분취의 여러 자식도 모두 성공하거나 모두 실패).
- **멱등성(R7)**: 같은 eventId로 같은 명령을 다시 받으면 처음 결과를 그대로 반환. 실패한 eventId는 기록 안 함.

## 공개 인터페이스

```typescript
interface Lab {
  receive(eventId: ID, input: { sampleId: ID; containerId: ID; custodianId: ID; qty: Qty }): Result<Receipt>;
  split(eventId: ID, parentId: ID, children: Array<{ sampleId: ID; containerId: ID; qty: Qty }>): Result<Receipt>;
  reserve(eventId: ID, input: { reservationId: ID; sampleId: ID; qty: Qty }): Result<Receipt>;
  cancel(eventId: ID, reservationId: ID): Result<Receipt>;
  consume(eventId: ID, reservationId: ID): Result<Receipt>;
  discard(eventId: ID, sampleId: ID): Result<Receipt>;
  move(eventId: ID, sampleId: ID, targetContainerId: ID): Result<Receipt>;
  transferCustody(eventId: ID, sampleId: ID, custodianId: ID): Result<Receipt>;
  snapshot(): Snapshot;
}
```

모든 작업은 Result<Receipt> 또는 Result<Receipt>로 응답. 실패는 예외가 아닌 `{ ok: false, code }`.

## 애매한 곳·가정
- **eventId 멱등성의 인자 비교:** 객체 키 순서는 무시하되, 배열의 순서는 구별 (split의 자식 순서는 의미 있음) (가정)
- **수량 보존 검증 실패:** 사용자 오류가 아닌 내부 버그이므로 예외 throw (Result로 반환하지 않음) (가정)
- **계보 완성 판정:** 시료가 DEPLETED 또는 DISCARDED 상태이면 그 용기는 즉시 해제 (이하 명령은 그 시료를 참조할 수 없음) (가정)

## Acceptance
- [ ] `src/lab/lab.ts`에 `createLab(catalog: Catalog): Lab` 함수 구현
- [ ] 모든 규칙(R1~R8) 준수
- [ ] `pnpm check` 통과 (타입 체크, 린트, 테스트)
- [ ] 공개 예시 5개 케이스 모두 동작 확인

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)

