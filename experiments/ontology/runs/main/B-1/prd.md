# 0040 — 연구실 시료 보관 엔진 — PRD

- **이슈:** #1

## 개요

가상의 연구실에서 액체 시료를 받아들이고, 나눠 담고, 예약하고, 소비하고, 폐기하고, 옮기는 작업을 기록·추적하는 엔진.

**스코프**: 메모리 안 단일 호출 처리. 저장소, 동시 실행, 실제 시각 다루지 않음.

## 요구사항

### 대상 (Entities)

| 대상 | 설명 | 생성 방식 | 카탈로그 |
|------|------|---------|--------|
| **Location** | 보관 장소 | 초기 목록 (createLab) | 있음 |
| **Container** | 용기 (장소 고정) | 초기 목록 | 있음 (capacity 포함) |
| **Custodian** | 보관 책임자 | 초기 목록 | 있음 |
| **Sample** | 액체 시료 (Qty: 정수 μL) | receive / split | 없음 |
| **Reservation** | 시료 일정량 예약 | reserve | 없음 |
| **Event** | 성공한 명령 기록 | 자동 생성 | 없음 |

### 핵심 규칙

1. **참조 무결성**: 목록에 없는 용기/책임자/시료/예약는 오류 코드 반환 (예외 아님)
2. **용기 배정**: 활성 시료는 정확히 하나의 용기에, 용기당 최대 시료 1개 (CONTAINER_OCCUPIED)
3. **용량 보존**: 시료 remaining ≤ 용기 capacity (CAPACITY_EXCEEDED)
4. **ID 유일성**: 같은 ID 재사용 금지 (ID_TAKEN), 실패한 명령의 eventId는 기록 안 함
5. **계보 보존**: parent·root·계보 관계 변경 불가, 첫 시작은 receive만
6. **수량 보존**: 계보 전체에서 받은 양 = 남은 양의 합 + 소비량 + 폐기량
7. **예약 시스템**: 
   - 이용 가능량 = 남은 양 − ACTIVE 예약 양의 합
   - 예약은 남은 양 변경 안 함, 이용 가능량만 변경
8. **상태 전이**: ACTIVE → DEPLETED (남은 양 0) / ACTIVE → DISCARDED (discard 호출)
9. **원자성**: 성공 or 전부 실패. 부분 실패 없음
10. **Idempotency (R7)**: 같은 eventId + 같은 인자 → 처음 Receipt 반환, 상태 변경 없음

### 명령 (Operations)

| 명령 | 입력 | 사이드 이펙트 | 제약 |
|-----|------|-------------|-----|
| `receive` | sampleId, containerId, custodianId, qty | 새 ACTIVE 시료, root 설정 | qty > 0 & ≤ 1M, container 비어있음 |
| `split` | parentId, children[{sampleId, containerId, qty}] | 자식 시료 N개 생성 | 부모 이용 가능량 ≥ 자식 양의 합 |
| `reserve` | reservationId, sampleId, qty | ACTIVE 예약 생성 | 시료 ACTIVE, 이용 가능량 ≥ qty |
| `cancel` | reservationId | ACTIVE → CANCELED | ACTIVE 예약만 |
| `consume` | reservationId | ACTIVE → CONSUMED, 양 차감 | ACTIVE 예약만, 전량 소비 |
| `discard` | sampleId | ACTIVE → DISCARDED, 양 폐기 | ACTIVE 시료, ACTIVE 예약 없음 |
| `move` | sampleId, targetContainerId | 다른 용기로 이동 | ACTIVE 시료, target 비어있음 & 용량 충분 |
| `transferCustody` | sampleId, custodianId | 책임자 변경 | ACTIVE 시료만 |

## Acceptance

- [x] src/lab/lab.ts 구현 (createLab 함수, Lab 인터페이스 구현)
- [x] 모든 규칙 (R1~R8) 구현 및 오류 코드 반환
- [x] pnpm check 통과 (타입스크립트 컴파일 + 테스트)
- [x] 공개 예시 4개 모두 재현 가능

## 애매한 곳·가정

- eventId 캐시의 인자 비교: 객체는 키 순서 무시, 배열은 순서 구별 (R7) — (가정)
- 실패한 명령의 eventId는 캐시 미기록 → 재시도 가능 — (가정)
- containerId가 같은 locationId에 속하는지 검사하지 않음 (위치는 container → location으로만 파악) — (가정)
- 량(qty)의 상한 1,000,000은 명시된 값 사용 — (가정)

## 외부 의존성

- TypeScript 4.5+
- `src/lab/types.ts` (수정 금지)
