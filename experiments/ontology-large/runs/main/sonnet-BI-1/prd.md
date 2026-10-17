# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 시작 코드에는 기존 기능(받기·분취·예약·소비·폐기·이동·책임자 변경)만 있다. 확장된 공개 계약(`types.ts`)의 `quarantine`·`release`·`advanceTime`·`startTransit`·`confirmArrival`·`cancelTransit`은 예외를 던지고, 보관 등급은 분취 자식에 임시값(`AMBIENT`)이 들어 있으며, 격리·운송 중 제한도 걸려 있지 않다.
- **목표:** 기존 동작을 그대로 두고 `docs/`의 다섯 정책 문서·`types.ts`·구현 모듈 정책 주석대로 격리, 보관 등급 적합성, 예약 만료(논리 시각), 운송을 구현한다. 재전송(E5)·원자성(E6)·이력 규칙은 새 명령에도 적용한다.
- **비목표:** `types.ts` 수정, 실제 시계·외부 저장소·동시 호출, 문서에 없는 연구실 관행 추가.

## 애매한 곳·가정
- `receive`의 `storageGrade`가 세 등급 밖의 값이면 — `INVALID_INPUT` (가정: ontology §5 receive 행이 "등급 값(INVALID_INPUT)"으로 적음)
- 유효한 시각의 범위 — 0 이상 `Number.MAX_SAFE_INTEGER` 이하 정수 (가정: `types.ts`의 `Tick` 정의). `advanceTime`은 `to`가 `now`와 같아도 성공하고 이벤트를 남김, 새 예약의 `expiresAt`은 `now`와 같으면 `INVALID_INPUT`
- 운송 시작에서 목적 용기가 출발 용기 자신이면 — `CONTAINER_OCCUPIED` (가정: 시료가 출발 용기를 계속 점유하므로 빈 용기가 아님)
- ACTIVE가 아닌 시료의 `startTransit` — `NOT_ACTIVE` (가정: engine.md E3.3)
- 규칙을 여러 개 어기는 호출의 오류 코드 — 검사 순서에서 먼저 걸린 것 (가정: engine.md E6.4가 어느 코드든 허용)
- 운송 중 시료의 예약 만료·예약 취소·격리 — 허용, 목적 용기 확보는 그대로 (가정: transit.md·reservations.md 문장의 해석)

## Acceptance
- [x] `quarantine`·`release`: ACTIVE 시료만, 같은 값이어도 성공, 예약 불변. 격리 시 분취·새 예약·소비는 `QUARANTINED`, 취소·이동·폐기·책임자 변경·운송은 허용
- [x] 보관 등급: 받기·분취 자식·이동·운송 목적지가 지원 목록에 없으면 `STORAGE_INCOMPATIBLE`(정확 일치만), 자식은 부모 등급 상속
- [x] `advanceTime`: 과거·비정수는 `INVALID_INPUT`, `expiresAt <= now`인 ACTIVE 예약은 `EXPIRED`로 예약 양만 풀림(이벤트 하나), 새 예약의 `expiresAt` 검증
- [x] 운송: 시작·도착·취소, 목적 용기 배타 확보, 운송 중 분취·소비·폐기·이동·추가 운송은 `IN_TRANSIT`, 운송 ID 재사용 `ID_TAKEN`·`TRANSIT_CLOSED`·`UNKNOWN_TRANSIT`
- [x] 재전송·원자성: 실패한 새 명령은 스냅숏을 바꾸지 않고, 성공한 eventId 재전송은 처음 Receipt를 돌려줌
- [x] `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
