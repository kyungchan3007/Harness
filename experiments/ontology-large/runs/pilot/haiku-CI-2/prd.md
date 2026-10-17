# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **배경:** 시료 보관 엔진(`src/lab/`)의 기존 기능(receive·split·reserve·cancel·consume·discard·move·transferCustody)을 그대로 유지하면서 품질관리·보관 정책·시각 진행·운송 기능 네 개 영역을 확장한다.
- **목표:**
  1. **격리·해제** — `quarantine`·`release`로 ACTIVE 시료의 격리 여부 관리. 격리된 시료는 분취·새 예약·소비 거절.
  2. **보관 등급** — 시료마다 요구 등급(`storageGrade`), 용기마다 지원 등급 목록(`supportedGrades`). 모든 용기 배정(`receive`·`split`·`move`·`startTransit`)에서 적합성 검사.
  3. **예약 만료** — 논리 시각 0에서 시작, `advanceTime`으로 진행. 만료 시각(`expiresAt`)이 지나면 ACTIVE 예약은 `EXPIRED`.
  4. **운송** — `startTransit`로 시작, `confirmArrival` 또는 `cancelTransit`으로 종료. 운송 중엔 분취·소비·폐기·이동·추가 운송 거절.

## 제약과 기존 계약
- 공개 계약(`src/lab/types.ts`)은 고치지 않는다. 필요한 구현은 `src/lab/` 내에서만 변경한다.
- 기존 명령의 재전송·원자성·이력 규칙([engine.md](docs/engine.md) E5·E6)은 새 명령에도 적용된다.
- 메모리 상에서만 처리. 실제 시계·외부 저장소·동시 호출은 다루지 않는다.

## 애매한 곳·가정
- 분취할 자식의 보관 등급 — 부모의 등급을 상속 (가정: docs/storage.md, samples.ts 주석 따름)
- 시료의 격리와 운송의 상호작용 — 격리 중에도 운송 시작/도착/취소 허용 (가정: docs/quality.md, docs/transit.md 정책 따름)
- 예약 만료의 경계 (expiresAt ≤ now) — 포함 (가정: 예약 당 정확히 now일 때도 만료, docs/reservations.md)
- 유효한 Tick 범위 — 0 이상 Number.MAX_SAFE_INTEGER 이하의 정수 (가정: types.ts 정의 따름)

## Acceptance
- [x] 격리(`quarantine`·`release`) 기능 + 관련 제약 검사 + 단위 테스트
- [x] 보관 등급 검사 (`receive`·`split`·`move`·`startTransit`) + 단위 테스트
- [x] 예약 만료 (`advanceTime`로 시각 진행, `EXPIRED` 전환) + 단위 테스트
- [x] 운송 (`startTransit`·`confirmArrival`·`cancelTransit`, 운송 중 제약) + 단위 테스트
- [x] 기존 명령 회귀 테스트 (기존 기능 작동 확인)
- [x] `pnpm check` ALL PASS

설계: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
