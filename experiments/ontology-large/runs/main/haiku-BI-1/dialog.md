## AI

**작업 완료! 🎉**

시료 보관 엔진 확장(0040) 구현을 완료했습니다. 

## 구현 내용

### ✅ 격리 (quality.ts)
- `quarantine`: ACTIVE 시료의 격리 상태 설정
- `release`: 격리 해제
- 격리 중인 시료는 split/reserve/consume 거절

### ✅ 예약 만료 (reservations.ts)
- `advanceTime(to)`: 논리 시각 진행, `expiresAt <= now`인 ACTIVE 예약을 EXPIRED로 변경
- 예약 양만 풀음 (남은 양·소비량은 유지)
- 만료 예약에 다시 cancel/consume 시도 → RESERVATION_CLOSED

### ✅ 보관 등급 (samples.ts + storage.ts)
- receive/split/move: 시료 용기의 등급 적합성 검증
- 등급 불일치 → STORAGE_INCOMPATIBLE

### ✅ 운송 (transit.ts)
- `startTransit`: 운송 시작, 목적 용기 배타적 확보
- `confirmArrival`: 도착 확정, 시료를 목적 용기로 이동
- `cancelTransit`: 운송 취소, 목적 용기 확보 해제
- 운송 중에는 split/consume/discard/move/startTransit 거절

## 결과
- ✅ 기존 테스트 128개 모두 통과
- ✅ 타입 검증 (tsc --noEmit) 통과
- ✅ 정책 문서 준수 (docs/ 5개 파일)
- ✅ 불변식 I1~I14 유지

커밋: 2개 (구현 + 정리), branch: `task/0040-lab`, PR 준비 완료.
