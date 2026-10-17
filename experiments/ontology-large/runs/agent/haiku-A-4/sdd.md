# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, agents/harness/loop.md, docs/engine.md, docs/quality.md, docs/storage.md, docs/reservations.md, docs/transit.md, src/lab/types.ts, src/lab/*.ts(정책 주석 포함)
- **접근:**
  - 명령 모듈은 기존 구조를 유지하고 빈 `throw`만 채운다.
  - 운송 목적 용기 확보는 `State.targets`(containerId → transitId) 맵으로 둔다. `Storage.isFree`는 점유(`occupied`)와 확보(`targets`)를 함께 본다.
  - 운송 중 판정은 `inTransit(s, sampleId)` 헬퍼로 ACTIVE 운송 존재를 찾는다. 시료 타입은 바꾸지 않는다.
  - 예약 만료는 `advanceTime` 안에서 `expiresAt <= to`인 ACTIVE 예약을 모두 `EXPIRED`로 바꾸고 `reserved`에서 뺀다.
  - `copyState`에 `targets`를 추가해 기존 원자성(작업 복사본 커밋)을 유지한다.
- **대안·트레이드오프:**
  - 확보를 `occupied`에 운송 마커로 넣는 방식은 `occupied`가 `sampleId`를 값으로 가정하므로 기존 코드를 여럿 바꿔야 해서 버렸다.
  - 시료에 `transitId` 필드를 추가하는 방식은 `types.ts`를 고치게 되므로 버렸다.
- **검사 순서 (오류 코드 선택):**
  - 받기: 수량 → 등급 값 → ID → 용기 → 책임자 → 등급 적합 → 점유 → 용량
  - 분취: 입력 → 부모(없음·비ACTIVE) → 부모 운송 중 → 부모 격리 → 자식 ID·용기·등급·점유·용량 → 합계
  - 예약: 수량 → 만료 시각 → ID → 시료(없음·비ACTIVE) → 격리 → 운송 중(허용) → 이용 가능량
  - 소비: 예약 존재 → 예약 종료 → 시료 격리 → 운송 중
  - 이동: 시료 → 용기 → 점유 → 용량 → 등급 → 운송 중
  - 폐기: 시료 → 운송 중 → 예약
- **파일 계획:**
  - `src/lab/state.ts`: `targets` 추가, `copyState`, `inTransit` 헬퍼
  - `src/lab/storage.ts`: `isFree`가 `targets` 반영, `TODO` 주석 제거
  - `src/lab/samples.ts`: 받기·분취·이동 등급 검사, 분취 등급 상속, 격리·운송 중 검사, 폐기 운송 검사
  - `src/lab/reservations.ts`: 예약 만료 시각 검사, 격리·운송 검사, `advanceTime` 구현
  - `src/lab/quality.ts`: `quarantine`·`release` 구현
  - `src/lab/transit.ts`: `startTransit`·`confirmArrival`·`cancelTransit` 구현
  - `src/lab/lab.test.ts`: 신규 단위 테스트
  - `agents/orchestration/TASKS.md`, `agents/JOURNAL.md`: 기록
- **위험:**
  - 분취 자식 등급 상속으로 기존 분취 테스트 기대가 바뀔 수 있다. 기존 테스트 파일이 없어 회귀는 신규 테스트로만 확인한다.
  - 운송 중 확보가 `isFree`에 빠지면 다른 시료가 목적 용기를 빼앗는다. 받기·분취·이동·다른 운송 목적지 모두 테스트한다.
- **검증 계획:**
  - `pnpm exec tsc --noEmit`과 `pnpm exec vitest run`을 돌린다.
  - 규칙마다 최소 하나의 테스트를 둔다: 격리, 등급, 만료, 운송, 재전송, 원자성.
  - 마지막에 `pnpm check`가 PASS인지 확인한다.

## 계획과 달라진 점
- 받기에 등급 값 검사(`INVALID_INPUT`)와 분취 자식 등급 상속 검사를 추가했다. 계획의 검사 순서 목록에는 있었고 구현 중 명시적으로 확인했다.
- 운송 목적 확보 판정은 `storage.isFree`에 `targets`를 넣는 방식으로 구현했다. 계획과 같다.
- `request.md`는 `pnpm request 1`로 만들지 못했다. 이 저장소에 git remote가 없어 `gh issue view`가 실패한다. 착수 요청 파일의 원문을 같은 머리글 형식으로 옮겼다.

## 검증 결과
- `pnpm check` ALL PASS: Typecheck, Unit tests 12개 파일 149개 통과, lockfile 검사, 태스크 기록 검사(13개 폴더).
- `src/lab/lab.test.ts` 21개: 격리 3, 보관 등급 5, 시각·만료 4, 운송 6, 엔진 공통 3.
- 기존 cart·pricing 테스트는 변경 없이 통과.
