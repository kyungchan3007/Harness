# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** `src/lab/types.ts`(공개 계약, 수정 금지), `docs/engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`, `src/lab/*.ts`의 정책 주석, `agents/ontology/ontology.json`(I1~I14, 명령 requires).
- **접근:** 기존 모듈 구조를 유지하고 미구현 명령을 채운다. 모든 변경 명령은 `Engine.run` 하나를 거쳐 재전송·작업 복사본·이력 규칙을 상속한다. 운송 중 목적 용기 확보는 `State.claimed`(containerId → transitId) 맵으로 두고, 용기 빈 칸 판정(`Storage.isFree`)이 점유와 확보를 함께 본다.
- **대안·트레이드오프:**
  - 운송 목적지 확보를 `occupied` 맵에 같이 넣는 방법: 도착 시 점유 주체가 시료인지 운송인지 구별이 안 돼 기각.
  - 운송 목록을 매번 전체 스캔해 확보를 찾는 방법: 구현은 단순하나 확보 조회가 O(운송 수)가 됨. 운송 수가 작은 메모리 엔진이라 `claimed` 맵을 두고, 시료별 운송 판정(`transitOf`)만 스캔으로 둠.
  - 분취 자식 등급을 호출자 인자로 받는 방법: 요구 "호출자가 따로 지정하지 않는다"와 `docs/storage.md`에 반해 기각.
- **파일 계획:**
  - `src/lab/state.ts`: `claimed` 맵 추가(initial·copy), `transitOf(s, sampleId)` 헬퍼
  - `src/lab/storage.ts`: `isFree`가 확보도 본다, `GRADES`·`isGrade`, TODO 주석 제거
  - `src/lab/samples.ts`: 받기(등급 검사·적합성), 분취(격리·운송·등급 상속·적합성), 폐기(운송), 이동(운송·적합성)
  - `src/lab/quality.ts`: `quarantine`·`release`
  - `src/lab/reservations.ts`: 예약(격리·`expiresAt` 검증), 소비(격리·운송), `advanceTime`
  - `src/lab/transit.ts`: `startTransit`·`confirmArrival`·`cancelTransit`
  - `src/lab/lab.test.ts`: 새 테스트(명령별 성공·실패·원자성·재전송)
- **위험:**
  - `copyState`에 `claimed`를 빠뜨리면 실패 명령 뒤 상태가 새어 나감 → 원자성 테스트로 확인
  - `advanceTime`이 만료 예약의 시료 `reserved`를 빠뜨리면 I4 위반 → 테스트에서 `reserved` 확인
- **검증 계획:** `pnpm exec tsc --noEmit`, `pnpm exec vitest run`(기존 테스트 + 새 테스트), `bash agents/harness/evals/checks.sh` 전체 PASS. 기존 cart·pricing 테스트가 그대로 통과하는지도 본다.

## 명령별 검사 순서 (정한 값)
- receive: 양·등급 값 → ID_TAKEN → 용기 존재 → 책임자 → 빈 용기 → 용량 → 등급 적합
- split: 자식 1개 이상·양 → 부모 ACTIVE → 격리 → 운송 중 → 자식별(ID·용기 존재·빈 용기·용량·등급 적합) → 합 ≤ available
- reserve: 양·expiresAt → ID_TAKEN → 시료 ACTIVE → 격리 → 양 ≤ available
- consume: 예약 존재 → 예약 ACTIVE → 격리 → 운송 중
- discard: 시료 ACTIVE → 운송 중 → HAS_RESERVATION
- move: 시료 ACTIVE → 운송 중 → 용기 존재 → 빈 용기 → 용량 → 등급 적합
- startTransit: 운송 ID 새것 → 시료 ACTIVE → 운송 중 → 목적 용기 존재 → 빈 용기 → 용량 → 등급 적합
- confirmArrival / cancelTransit: 운송 존재 → ACTIVE

## 계획과 달라진 점
- 파일 계획과 대체로 같게 구현했다. `src/lab/lab.ts`는 바꾸지 않았다(조립 코드가 이미 새 명령을 연결하고 있었음).
- `src/lab/state.ts`에 `claimed` 맵이 추가됐다. 파일 계획에는 없던 항목인데, 운송 목적 확보를 `occupied`와 분리하기 위해 필요했다(대안 항목 참조).
- 테스트 기대값을 두 번 고쳤다. 첫째, 운송 시작 전에 확보 충돌을 가정한 케이스가 실제로는 운송 중이 아니었다. 둘째, 운송 중 분취·폐기가 예약 존재와 겹칠 때 어느 코드든 허용되는데(engine.md E6 4번) 테스트가 한 코드만 기대했다. 구현은 바꾸지 않았다.
- 테스트 중 "A3(용량 10)로 양 100 시료 이동"은 용량 초과가 맞는 결과여서 양 5 시료로 바꿨다(테스트 설계 오류, 구현 정상).

## 검증 결과
- `pnpm exec tsc --noEmit`: PASS
- `pnpm exec vitest run`: 13개 파일, 165개 테스트 PASS (신규 `src/lab/lab.test.ts` 23개 포함, 기존 cart·pricing·hooks 테스트 그대로 통과)
- `pnpm onto:check`: 14개 PASS (구현은 온톨로지 파일을 바꾸지 않음)
- `bash agents/harness/evals/checks.sh`: ALL PASS (Typecheck · Unit tests · No npm/yarn lockfiles · Task records)
