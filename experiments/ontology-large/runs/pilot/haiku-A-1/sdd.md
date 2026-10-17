# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** `agents/context/architecture.md`, `docs/engine.md`, `docs/quality.md`, `docs/storage.md`, `docs/reservations.md`, `docs/transit.md`
- **접근:** 
  1. 격리 기능: `quality.ts`에 `quarantine`, `release` 구현, ACTIVE 시료의 `quarantined` 필드 토글
  2. 보관 등급: `Storage` 클래스에 `checkStorageCompatible()` 메서드 추가, receive/split/move/startTransit에서 호출
  3. 예약 만료: `reserve`에서 `expiresAt` 유효성 검사, `advanceTime` 구현으로 만료 판정 및 상태 변경
  4. 운송: `transit.ts`에 3개 명령 구현, 운송 중 금지 명령 검사, E5 재전송 처리
  5. 통합: split에서 storageGrade 부모 상속, 격리 중 split/reserve/consume 금지
- **대안·트레이드오프:**
  - 격리와 상태의 분리: `quarantined`는 `status`와 독립. 이유: 운영 상태와 생애 상태가 다르며, 격리 해제 시 다른 상태 변경 없음
  - 보관 등급 검사 시점: 실패하면 상태 변경 없음 (E6 원자성). split의 여러 자식도 모두 성공 또는 모두 실패
  - split 등급 상속: 호출자 지정 불가, 부모 그대로. 이유: samples.ts 기존 정책
  - 운송 상태 저장: 끝난 운송도 유지하여 ID 재사용 방지 및 E5 재전송 처리
  - 시각 진행: `advanceTime` 이벤트 1개당 모든 만료 예약 한 번에 처리
  - 운송 중 명령 제한: State에 active transit 맵 추가로 빠른 조회
- **파일 계획:**
  - 수정: `storage.ts` (checkStorageCompatible 추가), `quality.ts` (quarantine/release 구현), `reservations.ts` (advanceTime 구현, expiresAt 검증), `transit.ts` (3개 명령 구현), `samples.ts` (등급 검사 및 상속, 격리 검사)
  - 영향: `state.ts` (transits 맵 이미 존재), `lab.ts` (모듈 반영)
- **위험:**
  - 예약 만료 후 정합성: 만료된 예약의 양만 풀어주고 실제 남은 양은 변경 안 함. 문서 명시이므로 문제 없음
  - 운송 중 용기 점유: 목적 용기가 다른 명령에 점유되지 않도록 엄격히 체크 필요. 기존 occupied 맵 재사용으로 해결
  - E5 재전송: 운송 시작 실패 후 재송신 시 운송 기록이 없어야 함. Engine의 copyState 모델로 해결
- **검증 계획:**
  - 단위: 각 기능별 정상·에러 케이스 (격리 멱등성, 보관 등급 매칭, 예약 만료, 운송 시작·도착·취소)
  - 통합: 격리 중 예약 추가 거절, 운송 중 금지 명령, 만료 후 cancel/consume 거절, E5 재전송
  - 회귀: 기존 8개 명령의 정상 동작 유지

## 계획과 달라진 점
없음 — 설계대로 5개 모듈을 순차 구현했고, 각 단계에서 예상한 대로 진행됨

## 검증 결과
✅ `pnpm check` ALL PASS (타입 검사, 단위 테스트 128개, 레코드 검사)

**구현 검증:**
- 격리: `quarantine(sampleId)` → `quarantined: true`, `release(sampleId)` → `quarantined: false` (멱등)
- 격리 중 제약: split, reserve, consume이 `QUARANTINED` 거절하고, move/discard/transferCustody는 허용
- 보관 등급: receive, split, move에서 `checkStorageCompatible()` 호출, 불일치 시 `STORAGE_INCOMPATIBLE` 반환
- split 등급 상속: 자식이 부모의 `storageGrade` 상속, 각 자식 용기 호환성 검사
- 예약 만료: `reserve`에서 `expiresAt > now` 또는 null만 수용, `advanceTime`에서 `expiresAt <= to`인 예약 모두 `EXPIRED`로 변경 및 양 해제
- 운송: `startTransit` 시 목적 용기 점유 설정 및 activeTransits 기록, `confirmArrival`에서 시료 이동, `cancelTransit`에서 목적 용기 점유 해제
- 운송 중 제약: split, consume, discard, move가 `IN_TRANSIT` 거절, reserve/cancel/quarantine/release는 허용
- E5 재전송: 같은 eventId 재송신 시 첫 Receipt 반환, 새 기록 없음 (Engine 기존 기능)

**회귀 검증:**
- 기존 8개 명령(receive, split, reserve, cancel, consume, discard, move, transferCustody) 정상 동작
- 기존 128개 단위 테스트 모두 통과
