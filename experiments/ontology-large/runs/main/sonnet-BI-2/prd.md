# 0040 — 시료 보관 엔진 확장(격리·보관 등급·예약 만료·운송) — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 `quarantine`·`release`·`advanceTime`·`startTransit`·`confirmArrival`·`cancelTransit`이 미구현이고, 보관 등급·예약 만료·격리·운송 중 제한이 기존 명령에 연결돼 있지 않다.
- **목표:** `docs/`의 정책 문서 5개·`types.ts`·구현 모듈 정책 주석(`storage.ts`, `samples.ts`)대로 새 기능을 구현하고, 기존 기능·재전송·원자성·이력 규칙을 유지한다.
- **비목표:** `types.ts` 수정, 문서에 없는 연구실 관행 추가, 동시성·실제 시계·외부 저장소.

## 애매한 곳·가정
- 분취 자식의 보관 등급 — `samples.ts` 주석대로 부모 등급 상속 (문서에 명시, 가정 아님).
- 운송 목적 용기 확보의 구현 방식 — 점유 맵에 올려 `Storage.isFree` 하나로 받기·분취·이동·다른 운송이 `CONTAINER_OCCUPIED`를 받게 함 (가정).
- `receive`의 `storageGrade`가 세 값이 아니면 무엇을 돌려주나 — `INVALID_INPUT` (가정, ontology 5절 근거).
- `advanceTime`의 `to`·`expiresAt`이 정수 아님·MAX_SAFE_INTEGER 초과면 — `INVALID_INPUT` (가정, types.ts Tick 정의 근거).
- 여러 규칙을 동시에 어기는 호출은 어떤 코드인가 — 무엇이든 허용 (가정, engine.md E6.4 근거).

## Acceptance
- [x] quarantine·release: ACTIVE만, 같은 값도 성공, 예약 불변; 격리 시 split·reserve·consume은 QUARANTINED
- [x] 보관 등급: receive·split(부모 등급 상속)·move·startTransit에서 정확 일치가 아니면 STORAGE_INCOMPATIBLE
- [x] advanceTime: 과거·비정수 INVALID_INPUT, expiresAt ≤ now 예약 EXPIRED(이벤트 하나), reserve의 expiresAt 검증
- [x] 운송: 시작·도착·취소, 목적 용기 배타 확보, 운송 중 split·consume·discard·move·재시작 IN_TRANSIT, ID_TAKEN/UNKNOWN_TRANSIT/TRANSIT_CLOSED
- [x] 새 명령의 재전송·EVENT_CONFLICT·실패 원자성·이력 args
- [x] `pnpm check` PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
