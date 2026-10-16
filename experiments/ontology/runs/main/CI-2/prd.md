# 0040 — 연구실 시료 보관 엔진 — PRD

- **이슈:** #1

## 개요

가상의 실험실 환경에서 액체 시료(sample)의 전체 생명 주기를 기록하고 관리하는 메모리 기반 엔진입니다.

**핵심 특성:**
- 메모리 내 단일 스레드 처리
- 모든 연산은 원자적(atomic) 또는 완전히 롤백
- 실패는 예외(exception)가 아닌 `{ ok: false, code }` 반환
- 이벤트 기반 이력 추적으로 같은 명령 재전송 시 멱등성 보장

## 관리 대상

### 1. 정적 카탈로그 (초기화 시)
- **Location** (장소): 용기가 놓인 위치. ID와 설명만 보유
- **Container** (용기): 시료를 담는 그릇. 용량(capacity), 위치(location) 고정
- **Custodian** (책임자): 시료의 보관 담당자. ID와 이름

### 2. 동적 상태 (연산으로 변함)
- **Sample** (시료): 용기에 담긴 액체. 상태(`ACTIVE`/`DEPLETED`/`DISCARDED`), 양, 계보, 책임자
- **Reservation** (예약): 특정 시료의 일정량을 사용하겠다고 선점. 상태(`ACTIVE`/`CANCELED`/`CONSUMED`)
- **Event** (이벤트): 성공한 명령의 불변 기록

## 연산 (Commands)

| 연산 | 기능 |
|------|------|
| `receive` | 초기 시료 받아들임 (계보의 시작) |
| `split` | 시료를 여러 자식으로 나눔 (같은 계보) |
| `reserve` | 시료의 일정량을 사용하겠다고 선점 |
| `cancel` | 예약 취소, 이용 가능량 복구 |
| `consume` | 예약된 양을 실제로 소비 |
| `discard` | ACTIVE 시료 전부 폐기 |
| `move` | 시료를 다른 용기로 이동 |
| `transferCustody` | 시료의 책임자 변경 |

## 핵심 불변식 (Invariants)

1. **수량 보존**: 계보 내 `초기량 = Σ(remaining + consumedQty + discardedQty)`
2. **용기 배정**: ACTIVE 시료는 정확히 하나의 용기, 용기 하나에 ACTIVE 시료 최대 하나
3. **이용 가능량**: `available = remaining - reserved` (저장되지 않음, 계산됨)
4. **비가역성**: 끝난 시료(`DEPLETED`/`DISCARDED`)는 다시 ACTIVE 불가, ID 재사용 불가
5. **멱등성**: 성공한 eventId + 동일 인자 → 처음 결과 반환, 상태 변화 없음

## Acceptance

- [x] `createLab(catalog: Catalog): Lab` 함수 구현 완료
- [x] 규칙 R1~R8 모두 만족하는 8개 연산 구현
- [x] 불변식 I1~I11 보존하는 핵심 로직 설계
- [x] 모든 공개 예시 5가지 시나리오 통과
- [x] `pnpm check` 통과 (타입, 테스트, 린트)

## 애매한 곳·가정

- 스냅샷의 샘플·예약·이벤트 순서: 정의된 순서 없음 — 배열 순서 임의 가능 (가정)
- 용기 이동 중 기존 containerId를 재사용하는 부모 추적: 없음 — 이동 후 이전 용기 정보 보존 불필요 (가정)
- 멀티스레드: 다루지 않음 — 메모리 기반 단일 스레드 보장 (가정)
- 지속성(persistence): 없음 — 메모리에만 저장, 저장소 기능 없음 (가정)
