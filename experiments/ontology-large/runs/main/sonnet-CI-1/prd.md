# 0040 — 시료 보관 엔진 확장(격리·보관 등급·예약 만료·운송) — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 미완성 부분(quarantine·release·advanceTime·운송 3종 미구현, 보관 등급 미연결, 예약 만료 시각 검증 없음)이 `types.ts` 계약과 `docs/` 정책을 만족하지 못한다.
- **목표:** 기존 기능을 유지한 채 docs 다섯 개와 `types.ts`, 구현 모듈 정책 주석(`samples.ts` 등급 상속, `storage.ts` 용기 점유)대로 새 기능을 구현한다.
- **비목표:** `types.ts` 수정, 문서에 없는 연구실 관행 추가, 실제 시계·저장소·동시성.

## 애매한 곳·가정
- 받기의 `storageGrade`가 세 값이 아닐 때의 코드 — `INVALID_INPUT` (가정, ontology receive.requires가 "등급 값(INVALID_INPUT)"으로 뒷받침)
- `expiresAt`·`to`의 "유효 시각" — 0 이상 `MAX_SAFE_INTEGER` 이하 정수, `expiresAt`은 추가로 now 초과 (가정, `Tick` 정의 기준)
- 분취 자식의 등급 — 부모 등급 상속, 자식 용기가 그 등급을 지원해야 함 (가정, samples.ts 주석·storage.md 기준)
- 운송 목적 용기 확보의 구현 위치 — `Storage.isFree`가 ACTIVE 운송 목적지를 점유로 판정 (가정, storage.ts 주석·transit.md 기준)
- 운송 시작 시 목적 용기가 출발 용기와 같으면 — 시료가 점유 중이므로 `CONTAINER_OCCUPIED` (가정)
- 여러 규칙을 동시에 어기는 호출의 코드 — 어느 코드든 허용 (가정, engine.md E6.4 기준)

## Acceptance
- [x] quarantine·release: ACTIVE 시료만, 같은 값도 성공, 예약 불변
- [x] 격리 시 split·reserve·consume은 QUARANTINED, cancel·move·discard·transferCustody·운송은 허용
- [x] receive·split·move·startTransit에 등급 적합성(정확 일치) 적용, split 자식은 부모 등급 상속
- [x] advanceTime: 과거·비정수 INVALID_INPUT, `expiresAt <= now` ACTIVE 예약 EXPIRED(이벤트 하나), 남은 양·소비·폐기 불변
- [x] reserve의 expiresAt 검증(null 또는 now 초과 유효 정수)
- [x] startTransit/confirmArrival/cancelTransit: 점유·확보·ID_TAKEN·UNKNOWN_TRANSIT·TRANSIT_CLOSED
- [x] 운송 중 split·consume·discard·move·추가 startTransit은 IN_TRANSIT
- [x] 재전송·원자성·이력 규칙이 새 명령에도 적용
- [x] `pnpm check` PASS (`pnpm onto:check` 포함)

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
