# 0040 — 시료 보관 엔진 확장 — SDD

- **접근:** 모든 구현은 기존 `Engine` 프레임워크를 따릅니다. 명령은 `engine.run(eventId, op, args, body)` 호출로 실행되고, body는 작업 복사본(State)을 받아 검증, 부작용, ErrorCode | null을 반환합니다. body가 null을 반환하면 자동으로 이벤트 기록, eventId 등록, seq가 증가됩니다. 같은 eventId 재전송 시 E5 규칙이 적용됩니다 (기록 없음).

  모듈별 변경:
  1. **quality.ts — 격리:** quarantine/release는 `x.quarantined = true/false` 상태 변경만 수행
  2. **state.ts:** 이미 `now: Tick`, `transits: Map` 있음 ✓
  3. **storage.ts:** `isFree()`는 이미 운송 확보 고려 함 (`occupied` 맵 사용), 변경 없음
  4. **reservations.ts:** advanceTime은 `to <= now`면 INVALID_INPUT, `expiresAt <= to`인 모든 ACTIVE 예약을 EXPIRED로 변경, reserved만 감소 (남은 양은 그대로)
  5. **samples.ts:** receive/split/move에서 등급 적합성 확인, split/discard/move에서 운송 중/격리 여부 확인
  6. **transit.ts:** startTransit/confirmArrival/cancelTransit 구현, 운송 확보는 `occupied` 맵으로 추적
  7. **운송 중 명령 제한:** split, consume, discard, move, startTransit에서 IN_TRANSIT 확인

- **대안·트레이드오프:** 
  1. **Transit 확보 추적:** `occupied` 맵에 시료 추가로 운송 중 임시 표시 (대안: Transit 객체 플래그) — 이유: 기존 구조 재사용, 일관성
  2. **만료 예약 양 해제:** `advanceTime`에서만 일괄 처리 (대안: 매 명령 전 확인) — 이유: 이벤트 하나 = 상태 변경 하나 (E6 규칙)

- **검증 계획:**
  1. **단위:** 각 명령 성공/실패 케이스 (기존 테스트 스타일)
  2. **회귀:** 기존 테스트 모두 통과 (격리/등급 미적용)
  3. **흐름:** 격리→split/reserve/consume 거절, 등급 미스매치→receive/split/move/startTransit 거절, 운송 중→split/consume/discard/move/startTransit 거절, 예약 만료→advanceTime 후 EXPIRED·reserved 풀림·남은 양 유지
  4. **일관성:** snapshot 불변식 I1~I14 확인
