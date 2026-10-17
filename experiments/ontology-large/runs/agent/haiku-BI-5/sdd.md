# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md) · 원문: [request.md](request.md)

## 설계
- **읽은 문서:** `AGENTS.md`, `docs/engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`, `src/lab/types.ts`, `src/lab/*.ts` 전부
- **접근:**
  - 기존 모듈 구조(명령 모듈 → `Engine.run`)를 그대로 쓴다. 모든 명령은 `engine.run`으로 작업 복사본에서 검사·변경하고 성공 시에만 반영한다 (E6 원자성).
  - 운송 목적 용기 확보는 `State.claims: Map<containerId, transitId>`로 표현한다. `isFree`가 `occupied`와 `claims`를 함께 본다. 출발 용기는 기존대로 `occupied`에 시료가 남는다.
  - 만료는 `advanceTime`이 `now`를 갱신하고 `expiresAt <= to`인 ACTIVE 예약을 `EXPIRED`로 바꾸며 `reserved`를 깎는다.
  - 보관 등급 판정은 `Storage.supports`(정확 일치)를 쓴다. 분취는 부모 등급을 자식에 넣고, 자식 용기도 부모 등급을 지원해야 한다.
- **검사 순서 (명령별):**
  - `receive`: 양·등급 값(INVALID_INPUT) → ID_TAKEN → 용기 → 책임자 → 점유 → 용량 → 등급
  - `split`: 자식 목록 → 부모 ACTIVE → QUARANTINED → IN_TRANSIT → 자식별(ID, 용기, 점유, 용량, 등급) → 합계 INSUFFICIENT
  - `reserve`: 양·expiresAt(INVALID_INPUT) → ID_TAKEN → 시료 ACTIVE → QUARANTINED → INSUFFICIENT
  - `consume`: 예약 존재 → RESERVATION_CLOSED → QUARANTINED → IN_TRANSIT
  - `discard`·`move`: 시료 ACTIVE → IN_TRANSIT → (move는 용기 존재·점유·용량·등급)
  - `startTransit`: 운송 ID 재사용(ID_TAKEN) → 시료 ACTIVE → IN_TRANSIT → 목적 용기 존재·점유/확보 → 용량 → 등급
  - `confirmArrival`·`cancelTransit`: 운송 없음(UNKNOWN_TRANSIT) → 끝남(TRANSIT_CLOSED)
  - `advanceTime`: 정수·현재 이상(INVALID_INPUT)
- **대안·트레이드오프:**
  - 운송 확보를 `occupied`에 목적 용기 시료 ID로 넣는 방식도 가능하나, 시료 ID가 두 용기를 가리키게 되어 `finish`·도착 처리에서 헷갈린다. 별도 `claims` 맵으로 분리했다.
  - `advanceTime`에서 전체 예약을 훑는 방식(선형)을 택했다. 메모리 안 단순 구현 범위에서 충분하다.
- **파일 계획:**
  - `src/lab/state.ts`: `claims` 필드 추가, `initialState`·`copyState` 갱신
  - `src/lab/storage.ts`: `isFree`가 `claims` 확인, 등급 상수·`isGrade` 추가
  - `src/lab/samples.ts`: 등급 검사, 분취 등급 상속, 격리·운송 검사
  - `src/lab/reservations.ts`: 만료 검사, 격리 검사, 운송 검사, `advanceTime`
  - `src/lab/quality.ts`: `quarantine`·`release`
  - `src/lab/transit.ts`: 운송 세 명령
  - `src/lab/lab.test.ts`: 단위 테스트 (신규)
  - `docs/` 정책 문서와 `types.ts`는 수정하지 않는다.
- **위험:**
  - 검사 순서가 공개 계약의 오류 코드에 영향 줄 수 있다 → 위 순서를 sdd에 고정하고 테스트로 확인.
  - 운송 취소·도착 후 확보 해제 누락 시 용기가 영구 점유됨 → 테스트에서 해제 후 재사용 확인.
- **검증 계획:** 단위 테스트로 prd Acceptance 각 항목 확인, `pnpm exec tsc --noEmit`, `bash agents/harness/evals/checks.sh`.

## 계획과 달라진 점
(trace.md 참조)

## 검증 결과
- `pnpm exec tsc --noEmit`: 통과
- `pnpm exec vitest run`: 12개 파일 142개 테스트 전부 통과 (신규 `src/lab/lab.test.ts` 14개)
- `bash agents/harness/evals/checks.sh`: ALL PASS
- 미수행: `pnpm request 1`(이슈 원문 고정, gh 호출 필요)·커밋·PR·이슈 동기화(`pnpm issue-sync`)는 사용자 요청 범위 밖이라 하지 않음
