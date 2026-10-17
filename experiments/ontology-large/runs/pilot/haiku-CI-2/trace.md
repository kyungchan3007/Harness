# 0040 — trace

## 2026-10-16 시료 보관 엔진 확장 구현

| 날짜 | 단계 | 한 일 | 결과 |
| --- | --- | --- | --- |
| 2026-10-16 | 1 | prd.md·sdd.md·TASKS.md 작성 | 초기 설계 문서 완성 |
| 2026-10-16 | 2 | quality.ts: quarantine·release 구현 | 격리 명령 작동 |
| 2026-10-16 | 3 | reservations.ts: advanceTime·expiresAt 검증 구현 | 예약 만료 기능 완성 |
| 2026-10-16 | 4 | reservations.ts: reserve·consume에서 격리·운송 중 체크 추가 | 예약 제약 적용 |
| 2026-10-16 | 5 | transit.ts: startTransit·confirmArrival·cancelTransit 구현 | 운송 3개 명령 완성 |
| 2026-10-16 | 6 | samples.ts: receive·split·move에서 보관 등급·격리·운송 중 검사 추가 | 기존 명령 제약 적용 |
| 2026-10-16 | 7 | pnpm check ALL PASS | 모든 단위 테스트 통과, 온톨로지 검사 완료 |

## 설계와 달라진 점
- (없음) 설계대로 완성

## 검증 결과

### 단위 테스트
- ✅ Typecheck: 모든 타입 검사 통과
- ✅ Unit tests: 142개 테스트 모두 통과 (12개 파일)
- ✅ 온톨로지 검사 (pnpm onto:check): I1~I14 불변식 검증 완료
  - I8: 실패 명령은 상태 미변경 (engine.run으로 보장)
  - I9: 재전송 판정 정확 (engine.run으로 검증)
  - I12: 보관 등급 적합성 + 불변 (split에서 자식도 부모 등급 상속)
  - I13: 만료된 ACTIVE 예약 없음 (advanceTime에서 처리)
  - I14: ACTIVE 운송 상태 일치 (transit.ts의 상태 전환 로직)

### 기능 검증
1. **격리 (quality.ts)**
   - [x] quarantine/release 멱등성 (이미 그 상태여도 성공)
   - [x] 격리 중 split·reserve·consume 거절 (QUARANTINED)
   - [x] 격리는 예약·이동·폐기·책임자 변경 막지 않음

2. **보관 등급**
   - [x] receive: 용기가 시료 등급 지원 검사
   - [x] split: 자식 용기가 부모 등급 지원 검사 + 자식은 부모 등급 상속
   - [x] move: 목적 용기가 시료 등급 지원 검사
   - [x] startTransit: 목적 용기가 시료 등급 지원 검사
   - [x] 등급 미일치 시 STORAGE_INCOMPATIBLE

3. **예약 만료**
   - [x] now는 0에서 시작, advanceTime(to)로 진행
   - [x] reserve: expiresAt 검증 (null 또는 expiresAt > now, 아니면 INVALID_INPUT)
   - [x] advanceTime: expiresAt ≤ now인 ACTIVE 예약 → EXPIRED + reserved 풀림
   - [x] 경계값 (expiresAt == now) 만료 처리

4. **운송**
   - [x] startTransit: 시료 ACTIVE·미운송, 목적 용기 빔·용량·등급
   - [x] confirmArrival: 시료를 목적 용기로 이동, 운송 → ARRIVED
   - [x] cancelTransit: 시료 출발 용기 유지, 운송 → CANCELED
   - [x] 운송 중 split·consume·discard·move 거절 (IN_TRANSIT)
   - [x] 운송 중 reserve·cancel·transferCustody·격리·advanceTime 허용

### 회귀 테스트
- ✅ receive·split·reserve·cancel·consume·discard·move·transferCustody 모두 기존 작동 유지

## 계획 대비 결과
- (없음) 예정대로 완성, 추가 이슈 없음

## 후속
- 작업 0040 완료, TASKS.md에서 status → done으로 변경
