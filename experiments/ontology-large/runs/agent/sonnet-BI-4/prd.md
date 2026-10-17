# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 격리·시각 진행·운송 명령이 미구현이고, 보관 등급이 받기·분취·이동에 연결되지 않았으며, 예약 만료 검증이 없다. 원문: [request.md](request.md)
- **목표:**
  1. `quarantine`·`release`와 격리 중 분취·새 예약·소비 거절(`QUARANTINED`)
  2. 받기·분취·이동·운송 목적지의 보관 등급 적합성(`STORAGE_INCOMPATIBLE`), 분취 자식은 부모 등급 상속
  3. `advanceTime`과 `expiresAt` 검증, 만료 예약 `EXPIRED`(경계 포함, 예약 양만 해제)
  4. `startTransit`·`confirmArrival`·`cancelTransit`과 운송 중 `IN_TRANSIT` 거절
  5. 기존 재전송·원자성·이력 규칙을 새 명령에도 적용
- **비목표:** `types.ts` 수정, 문서에 없는 연구실 관행 추가

## 애매한 곳·가정
- 등급 적합성 기준 — 지원 목록에 정확히 포함 여부만 (확인됨: storage.md)
- 분취 자식 등급 — 부모 상속 (확인됨: samples.ts 주석)
- 잘못된 `storageGrade`, 안전 정수가 아닌 `expiresAt`·`to` — `INVALID_INPUT` (가정)
- 여러 규칙을 어길 때 코드 — 예약 상태 검사를 격리 검사보다 먼저 (가정, engine.md E6-4로 허용)

## Acceptance
- [x] 격리 동작과 예약 불변 확인 테스트
- [x] 등급 적합성(받기·분취·이동·운송)과 분취 상속 테스트
- [x] 만료 경계·검증·이벤트 1개 테스트
- [x] 운송 점유·금지·허용·재전송·ID 재사용 테스트
- [x] `pnpm check` ALL PASS

설계: [sdd.md](sdd.md) · 과정: [trace.md](trace.md)
