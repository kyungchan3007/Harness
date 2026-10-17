# 0040 — 시료 보관 엔진 확장 — PRD

## 목표

기존 시료 보관 엔진(`src/lab/`)의 기능을 그대로 유지하면서, 격리·보관 등급·예약 만료·운송 기능을 추가합니다.

- **이슈:** #1

## 범위

### 1. 격리 (Quarantine) — `docs/quality.md`
- **명령:** `quarantine`, `release`
- **규칙:**
  - ACTIVE 시료의 격리 여부만 설정 (이미 그 상태여도 성공)
  - 격리된 시료는 분취·새 예약·예약 소비 불가 → `QUARANTINED` 반환
  - 기존 예약(상태·양·만료)은 격리·해제로 변경되지 않음
  - 격리는 예약 취소·이동·폐기·책임자 변경·운송 시작·도착·취소를 막지 않음

### 2. 보관 등급 (Storage Grade) — `docs/storage.md`
- **필드:** 시료의 `storageGrade`, 용기의 `supportedGrades`
- **규칙:**
  - 시료를 용기에 넣을 때마다 등급 확인 (받기·분취·이동·운송)
  - 등급은 지원 목록에 정확히 들어 있어야 함 (상하 관계 없음)
  - 맞지 않으면 `STORAGE_INCOMPATIBLE` 반환
  - 분취 자식은 부모의 등급을 상속 (현재는 `"AMBIENT"`로 고정, `src/lab/samples.ts` 52줄)
  - 등급은 만들어진 뒤 절대 변경 불가

### 3. 예약 만료 (Reservation Expiry) — `docs/reservations.md`
- **명령:** `advanceTime`
- **규칙:**
  - 논리 시각(`now`)은 0에서 시작, 절대 시각으로만 진행
  - 과거 시각 거절 → `INVALID_INPUT`
  - 새 예약의 `expiresAt`은 `null` 또는 현재보다 미래여야 함 (아니면 `INVALID_INPUT`)
  - 시각 진행 시 `expiresAt <= now`인 ACTIVE 예약은 모두 `EXPIRED`로 상태 변경
  - 만료는 예약 양만 풀고, 실제 남은 양·소비량·폐기량은 변경 없음
  - 격리·운송 중인 시료의 예약도 같이 만료됨

### 4. 운송 (Transit) — `docs/transit.md`
- **명령:** `startTransit`, `confirmArrival`, `cancelTransit`
- **규칙:**
  - 운송: 시료를 출발 용기에서 목적 용기로 2단계 절차로 이동
  - 시작 시 출발 용기는 점유 지속, 목적 용기는 배타적 확보 (다른 시료 받기·분취·이동, 다른 운송의 목적지 불가)
  - 도착 확정: 시료를 목적 용기로 옮김, 운송 `ARRIVED`
  - 취소: 시료를 출발 용기에 둔 채 운송 `CANCELED`, 목적 확보 해제
  - 운송 중 명령 제한: 분취·소비·폐기·직접 이동·추가 운송 시작 불가 → `IN_TRANSIT` 반환
  - 허용: 새 예약·예약 취소·책임자 변경·격리·시각 진행

## 기존 계약 적용

- **재전송 (E5):** 성공한 eventId 재전송 시 처음 Receipt 그대로 반환
- **원자성 (E6):** 실패 시 상태·이력 무변경, 여러 자식 분취도 모두 성공하거나 모두 실패
- **이력:** args는 받을 때의 값 고정

## Acceptance

- [ ] `pnpm check` 통과
- [ ] 격리 명령 구현: `quarantine`, `release`
- [ ] 예약 만료 명령 구현: `advanceTime`
- [ ] 운송 명령 구현: `startTransit`, `confirmArrival`, `cancelTransit`
- [ ] 보관 등급 검사 적용: `receive`, `split`, `move`, `startTransit`
- [ ] 기존 명령 무손상: `receive`, `split`, `reserve`, `cancel`, `consume`, `discard`, `move`, `transferCustody`
- [ ] 모든 불변식(I1-I14) 검증 통과
- [ ] 정책 문서(docs/engine.md, quality.md, storage.md, reservations.md, transit.md) 준수 확인

## 애매한 곳·가정

- 없음 — 모든 정책이 `docs/` 및 `agents/context/ontology.md`에 명시됨

## 문서

- 정책: `docs/engine.md`, `docs/quality.md`, `docs/storage.md`, `docs/reservations.md`, `docs/transit.md`
- 도메인: `agents/context/ontology.md` (개념·관계·상태·불변식)
- 구현: `src/lab/types.ts`, `src/lab/lab.ts`, `src/lab/samples.ts`, `src/lab/reservations.ts`, `src/lab/quality.ts`, `src/lab/storage.ts`, `src/lab/transit.ts`, `src/lab/state.ts`, `src/lab/events.ts`
