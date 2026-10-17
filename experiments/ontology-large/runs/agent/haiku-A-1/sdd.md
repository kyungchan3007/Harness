# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** `src/lab/types.ts`(계약, 수정 안 함), `docs/engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`, `src/lab/{events,state,storage,samples,reservations,quality,transit,lab}.ts`의 정책 주석
- **접근:**
  1. `state.ts`: 운송 목적 용기 확보를 `targets: containerId → transitId`로 추가하고 `copyState`에 포함. `inTransit(s, sampleId)`, `isTick(v)` 헬퍼 추가.
  2. `storage.ts`: `isFree`가 점유(`occupied`)와 목적 확보(`targets`) 둘 다 본다. `isGrade`로 등급 값 검사. `supports`는 지원 목록의 정확한 포함 여부.
  3. `quality.ts`: `quarantine`·`release`가 ACTIVE 시료의 `quarantined`만 설정. 같은 값이면 그대로 성공.
  4. `samples.ts`: 받기·분취·이동에 보관 등급 검사, 분취 자식 등급은 부모 상속(TODO 제거), 분취·폐기·이동에 운송 중 검사, 분취에 격리 검사.
  5. `reservations.ts`: 새 예약은 `expiresAt` 검사와 격리 검사, 소비는 격리·운송 검사, `advanceTime`은 절대 시각 진행과 만료 처리.
  6. `transit.ts`: 시작은 ID·상태·운송 중·등급·확보·용량을 검사하고 목적을 확보, 도착은 시료를 옮기고 확보를 풀고 `ARRIVED`, 취소는 확보를 풀고 `CANCELED`.
- **대안·트레이드오프:**
  - 목적 확보를 `occupied`에 같이 넣기: `occupied`는 "용기 안에 든 시료" 의미라 섞으면 `finish`·도착 로직이 헷갈림 → 별도 `targets` 맵으로 분리.
  - 운송 중 여부를 캐시 집합으로 관리: 상태 변경 지점이 늘어 어긋날 위험 → 운송 목록을 매번 훑는 단순 판정(규모가 작아 비용 무시 가능).
- **파일 계획:** 수정 `src/lab/{state,storage,samples,reservations,quality,transit}.ts`, 신규 테스트 `src/lab/lab.test.ts`, 태스크 기록 `agents/intent/specs/0040-lab/*`, `agents/orchestration/TASKS.md`, `agents/JOURNAL.md`
- **위험:**
  - 운송 목적 확보를 빠뜨리면 같은 용기에 두 시료가 들어감 → 확보 해제 경로(도착·취소)를 테스트로 확인.
  - 만료 처리가 실제 양을 건드리면 E3 보존 규칙 위반 → 만료 후 `remaining`·`consumedQty`·`discardedQty` 불변을 테스트.
- **검증 계획:** 규칙별 단위 테스트(격리·등급·만료·운송), 재전송·원자성·이력 테스트, `pnpm typecheck`, `pnpm test`, `pnpm check`

## 계획과 달라진 점
- `pnpm request 1`은 실행하지 않았다. 웹 접근 금지 조건 때문이며 prd의 "애매한 곳·가정"에 기록했다.
- 운송 중 여부 판정은 운송 목록을 훑는 단순 방식으로 했다(계획대로). 목적 확보는 별도 `targets` 맵으로 분리했다(계획대로).
- 테스트 작성 중 `advanceTime` 이벤트 seq를 잘못 계산한 실수가 있었으나 테스트 쪽 오류였고 구현은 맞았다.

## 검증 결과
- `pnpm typecheck` (tsc --noEmit): 통과
- `pnpm exec vitest run src/lab`: 27개 통과 (격리 5, 보관 등급 5, 예약 만료 5, 운송 10, 기존 계약 2 — 파일 `src/lab/lab.test.ts`)
- `bash agents/harness/evals/checks.sh`: ALL PASS (단위 테스트 전체 155개, 태스크 기록 검사 13개 폴더 확인)
