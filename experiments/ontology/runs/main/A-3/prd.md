# 0040 — 연구실 시료 보관 엔진 — PRD

- **이슈:** #1

## 목표

시료(액체)의 생명주기를 기록·추적하는 인메모리 엔진을 구현한다:
- 시료 수신 → 분취 → 예약 → 소비 또는 폐기 → 이동·책임 이전

## 요구사항

### 핵심 도메인
- **시료(Sample)**: 용기에 담긴 액체 (양은 정수 μL)
- **예약(Reservation)**: 시료 일부의 사용 권리를 미리 확보
- **용기(Container)**: 시료를 담는 저장소 (용량 제한, 위치 고정, 최대 1개 시료만 담을 수 있음)
- **장소(Location)**: 용기가 배치된 물리적 위치
- **보관자(Custodian)**: 시료 책임자

### 공개 인터페이스 (`types.ts` 기준)
```typescript
function createLab(catalog: Catalog): Lab
```

#### Lab 메서드
- `receive(eventId, {sampleId, containerId, custodianId, qty}): Result<Receipt>`
- `split(eventId, parentId, [{sampleId, containerId, qty}]): Result<Receipt>`
- `reserve(eventId, {reservationId, sampleId, qty}): Result<Receipt>`
- `cancel(eventId, reservationId): Result<Receipt>`
- `consume(eventId, reservationId): Result<Receipt>`
- `discard(eventId, sampleId): Result<Receipt>`
- `move(eventId, sampleId, targetContainerId): Result<Receipt>`
- `transferCustody(eventId, sampleId, custodianId): Result<Receipt>`
- `snapshot(): Snapshot`

### 주요 제약
1. **원자성**: 성공하거나 완전히 실패한다 (부분 성공 불가)
2. **수량 보존**: 시작 양 = 모든 시료의 남은 양 + 소비량 + 폐기량
3. **예약 규칙**: 이용 가능량(remaining - reserved) 이상 예약 불가
4. **멱등성**: 같은 eventId·인자로 재호출 시 같은 Receipt 반환, 상태 변화 없음
5. **상태 기계**: ACTIVE→DEPLETED(분취·소비) 또는 ACTIVE→DISCARDED(폐기)

## Acceptance

- [x] `src/lab/lab.ts` → `createLab(catalog): Lab` 구현
- [x] `types.ts` 수정 금지 (시그니처·타입은 기존대로)
- [x] 8개 메서드 + `snapshot()` 모두 구현, 공개 예시 5가지 모두 통과
- [x] `pnpm check` PASS (타입 검사, 테스트)

## 규칙 맵 (AGENTS.md 참조)

| 규칙 | 주요 내용 | 코드 영향 |
|------|---------|---------|
| R1 참조·수용 | 카탈로그의 것만 사용 가능, 미등록은 에러 | 상태 검증 |
| R2 계보·수량 | 분취 시 자식 관계 생성, 수량 보존 | 트리 구조 + 불변식 |
| R3 예약·소비 | reserved는 remaining을 깎지 않음 (이용 가능량만) | 2개 변수 추적 |
| R4 상태·폐기 | DEPLETED/DISCARDED는 끝나고 되살릴 수 없음 | 상태 전이 제어 |
| R5 용기·장소 | 시료는 용기의 장소를 상속, 1개 용기 = 최대 1개 시료 | 컨테이너 할당 |
| R6 보관 책임 | receive 시 결정, split 시 자식은 부모 책임자 상속 | custodian 추적 |
| R7 멱등성 | 같은 eventId 재호출 시 원래 Receipt 반환, 상태 불변 | 이벤트 캐시 |
| R8 원자성·이력 | 성공 시 seq 증가, 실패 시 전체 롤백 | 트랜잭션 패턴 |

## 애매한 곳·가정

- 인메모리 저장소만 지원 — 실제 시각/외부 저장소 필요 없음 (가정)
- 메서드 호출은 순서대로 한 번씩만 처리 — 동시 실행 미지원 (가정)
- eventId 캐시는 성공한 명령만 기록 (가정)
- 예약은 "사용 권리만 미리 확보", 실제 소비는 consume 명령이 처리 (가정)
- 각 시료는 최대 1개 예약 가능하지 않음 — 여러 예약 합산 가능 (가정)

## 테스트 케이스 (문서의 공개 예시)

1. **예약 후 일부 분취**: S1(100) → 예약 40 → S2(50) 분취 → S1 remaining=50, reserved=40
2. **전량 분취 시 부모 DEPLETED**: S1(100) → S2(60), S3(40) 분취 → S1 DEPLETED
3. **이동 후 책임 이전**: receive → reserve → move → transferCustody → consume 모두 성공
4. **분취 원자성**: 자식 하나가 빈 용기, 다른 하나가 차 있는 용기 → 전체 실패
5. **멱등성**: consume 성공 후 같은 eventId·인자로 다시 호출 → 같은 Receipt, 중복 소비 없음
