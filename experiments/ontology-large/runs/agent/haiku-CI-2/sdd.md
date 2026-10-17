# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** `src/lab/types.ts`(공개 계약, 수정 안 함), `docs/engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`, `agents/ontology/ontology.json`(명령 requires·불변식 I1–I14·혼동 쌍), 기존 `src/lab/*.ts`의 TODO·스텁.
- **접근:**
  - 운송 점유는 `State.targets`(containerId → transitId)로 기록한다. `Storage.isFree`는 시료 점유와 목적 확보를 모두 본다. 받기·분취·이동·운송 목적지가 같은 검사를 쓴다.
  - "운송 중" 판정은 `inTransit(s, sampleId)`로 한다(ACTIVE 운송 스캔). 운송 중 금지 명령에서만 쓴다.
  - 보관 등급 검사는 `Storage.supports`(정확 일치)만 쓴다. 등급 목록 검사는 `isGrade`.
  - 시각은 `isTick`으로 검증하고 `advanceTime`은 `engine.run`에 넣어 한 이벤트로 기록한다. 만료는 `expiresAt <= to`인 ACTIVE 예약만 `EXPIRED`로 바꾸고 `reserved`에서 뺀다.
  - 격리는 `quarantined`만 바꾼다. 예약·운송 상태는 건드리지 않는다.
  - 모든 명령은 기존 `Engine.run`을 거친다. 재전송·원자성·이력 규칙은 그대로 따른다.
- **대안·트레이드오프:**
  - 운송 목적 확보를 `occupied`에 같이 넣으면 `move`의 출발 용기 판정이 섞인다. 별도 `targets` 맵으로 분리했다(도착 시 삭제, 취소 시 삭제).
  - 운송 중 판정을 시료 필드(`inTransitId`)로 두면 상태가 두 곳에 생긴다. 운송 목록 스캔으로 한 곳(`transits`)만 보게 했다. 규모가 작아 비용은 무시한다.
- **파일 계획:**
  - `src/lab/state.ts`: `targets` 추가, `isTick`·`inTransit` 추가, `copyState` 갱신
  - `src/lab/storage.ts`: `isFree`에 목적 확보 반영, `GRADES`·`isGrade` 추가
  - `src/lab/samples.ts`: 등급 검사(받기·분취·이동), 분취 자식 등급 상속(TODO 제거), 격리·운송 중 검사
  - `src/lab/reservations.ts`: 만료 시각 검증, 격리 검사, `advanceTime` 구현, 소비 시 운송 중 검사
  - `src/lab/quality.ts`: `quarantine`·`release` 구현
  - `src/lab/transit.ts`: `startTransit`·`confirmArrival`·`cancelTransit` 구현
  - `src/lab/lab.test.ts`: 새 테스트 12개
- **위험:**
  - 검사 순서에 따라 같은 잘못에 다른 코드가 나올 수 있다. docs가 이를 허용하지만(E6.4), 테스트는 순서가 드러나는 경우만 고정했다.
  - `advanceTime`의 `to`가 `Number.MAX_SAFE_INTEGER`를 넘으면 거절한다. 범위 밖 시각은 `INVALID_INPUT`.
- **검증 계획:** 타입체크, 단위 테스트(계약별 한 케이스 이상), `pnpm check` 게이트.

## 계획과 달라진 점
- 계획에는 없던 `Storage.isFree`의 목적 확보 반영과 `State.targets` 추가를 구현 중에 넣었다(trace 참고).
- `split`에서 자식 용기 등급 검사는 `CAPACITY_EXCEEDED` 뒤에 둔다. 검사 순서는 구현 파일에 있다.

## 검증 결과
- 타입체크: `pnpm exec tsc --noEmit` 통과
- 단위 테스트: `pnpm exec vitest run src/lab` 12개 통과
- 게이트: `pnpm check` ALL PASS — 타입체크 통과, 단위 테스트 154개 통과(13 파일), 무 lockfile 통과, 태스크 기록 검사 통과 (13개 폴더, 현재 0040)
