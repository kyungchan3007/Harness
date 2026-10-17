# 0040 — 시료 보관 엔진 확장(격리·보관 등급·예약 만료·운송) — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 `quarantine`·`release`·`advanceTime`·`startTransit`·`confirmArrival`·`cancelTransit`이 미구현이고, 보관 등급·만료 시각이 기존 명령에 연결되지 않았다(분취 자식 등급은 임시값 AMBIENT).
- **목표:** `docs/`의 정책 문서 5개·`types.ts`·구현 주석의 계약대로 새 기능을 구현하고, 기존 기능·재전송·원자성·이력 규칙을 유지한다.
- **비목표:** `types.ts` 수정, 문서에 없는 실제 연구실 관행, 실제 시계·외부 저장소·동시 호출.

## 애매한 곳·가정
- `receive`에 잘못된 `storageGrade` 값 — `INVALID_INPUT` (가정: 온톨로지 receive 요구 "등급 값(INVALID_INPUT)").
- `expiresAt`/`to`가 정수 아님·음수·MAX_SAFE_INTEGER 초과 — `INVALID_INPUT` (가정: types.ts의 Tick 정의).
- 만료가 일어나는 시점 — `advanceTime` 이벤트 안에서만 (가정). 새 예약의 `expiresAt`은 now보다 커야 하므로 즉시 만료되는 예약은 생기지 않는다.
- 운송 중·격리 중 새 예약 — 운송 중 허용, 격리 중 `QUARANTINED` (가정: transit.md·quality.md에서 읽음).
- 운송의 용량 검사 — 시료 남은 양 vs 목적 용기 용량, `CAPACITY_EXCEEDED` (가정: move와 같은 규칙).
- 목적 용기가 출발 용기와 같을 때 — `CONTAINER_OCCUPIED` (가정: 시료가 점유 중이므로).
- 규칙을 여럿 어기는 호출의 오류 코드 — 문서상 임의 (가정: engine.md E6.4), 구현은 문서 순서대로 검사.

## Acceptance
- [x] 격리: quarantine·release 멱등 성공, 격리 시 분취·새 예약·소비는 QUARANTINED, 취소·이동·폐기·책임자 변경·운송은 허용, 예약 불변
- [x] 보관 등급: receive·split(자식 등급 = 부모 등급 상속)·move·startTransit이 정확 일치로 검사, 실패 시 STORAGE_INCOMPATIBLE
- [x] 예약 만료: advanceTime(절대 시각, 과거·비정수 INVALID_INPUT), expiresAt ≤ now 모두 EXPIRED(경계 포함), 이벤트 하나, 양만 풀림, reserve의 expiresAt 검증
- [x] 운송: start/confirm/cancel, 목적 용기 배타 확보, 운송 중 분취·소비·폐기·move·추가 운송 IN_TRANSIT, 끝난 운송 ID 재사용 ID_TAKEN·TRANSIT_CLOSED·UNKNOWN_TRANSIT
- [x] 재전송·원자성·이력 규칙이 새 명령에도 적용됨
- [x] `pnpm check` PASS (`pnpm onto:check` 포함)

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
