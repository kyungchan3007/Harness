# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md) · 원문: [request.md](request.md)

## 설계
- **읽은 문서:** `src/lab/types.ts`(공개 계약, 수정 금지), `docs/engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`, `src/lab/{events,state,samples,storage,reservations,quality,transit,lab}.ts`
- **접근:**
  - 모든 명령은 기존 `Engine.run`을 거친다(E5 재전송 판정 → 작업 복사본 → 성공 시 이력). 새 명령도 같은 경로.
  - 격리: `quality.ts`에 `quarantine`·`release`를 구현. `active()` 헬퍼로 존재·ACTIVE 검사, `quarantined` 플래그만 설정. 분취·예약·소비에 `QUARANTINED` 검사 추가.
  - 보관 등급: `Storage.supports()`(이미 있음)를 receive·split 자식·move·startTransit에서 사용. 분취 자식 등급은 부모 `storageGrade` 복사(임시 `AMBIENT` 제거). 등급 값 검사는 `samples.ts`의 `isGrade` 헬퍼 한 곳.
  - 예약 만료: 상태에 `now`는 이미 있다. `advanceTime`은 `to` 검증 → `now = to` → `to` 이하 만료 ACTIVE 예약을 `EXPIRED`로 바꾸고 시료의 `reserved`만 줄인다. `reserve`는 `expiresAt`이 null이거나 `now < expiresAt`인 Tick만 허용.
  - 운송: `State`에 `claimed: Map<containerId, transitId>`를 추가해 목적 용기 확보를 표현한다. `Storage.isFree()`가 `occupied`와 `claimed`를 모두 본다(storage.ts 정책 주석과 일치). 운송 중 시료는 `containerId`를 출발 용기로 유지하므로 E1 불변식(ACTIVE 시료는 용기 하나) 유지. 도착은 출발 점유 해제 → 목적 점유 설정 → 확보 해제, 취소는 확보 해제만.
  - 운송 중 금지: `inTransit(s, sampleId)`(ACTIVE 운송 중 같은 시료가 있는가) 헬퍼를 `transit.ts`에 두고 split·consume·discard·move·startTransit에서 사용. 분취·소비·폐기·이동은 `IN_TRANSIT`, 추가 운송도 `IN_TRANSIT`.
  - `lab.ts`는 이미 명령 모듈을 조립하므로 변경 없음(모듈 시그니처만 맞춘다).
- **대안·트레이드오프:**
  - 운송 목적 확보를 `occupied`에 `sampleId`로 넣는 방법: 시료 하나가 두 용기를 점유한 것처럼 보여 E1 불변식이 깨지고 move·finish 로직이 얽힌다. 기각.
  - 별도 `claimed` 맵: 상태가 한 항목 늘지만 점유 의미가 분리되고 `isFree` 한 곳만 바뀐다. 채택.
  - 만료를 조회 시점에 계산: `snapshot`의 `status`만 바꾸면 되지만 `reserved`·`cancel`·`consume`의 판정이 여러 곳에 흩어진다. 채택 안 함 — `advanceTime`에서 한 번에 확정하는 쪽이 E6 원자성·이력과 맞는다.
- **파일 계획:**
  - `src/lab/state.ts`: `State.claimed` 추가, `initialState`·`copyState` 갱신
  - `src/lab/storage.ts`: `isFree`가 `claimed`도 검사
  - `src/lab/samples.ts`: `isGrade`, receive·split(등급 상속, 자식 용기 `supports`)·move(`supports`)·split·move에 `QUARANTINED`·`IN_TRANSIT` 검사 추가. 분취 임시 `AMBIENT` 제거
  - `src/lab/reservations.ts`: reserve의 `QUARANTINED`·`expiresAt` 검증, consume의 `QUARANTINED`·`IN_TRANSIT`, advanceTime 구현
  - `src/lab/quality.ts`: quarantine·release 구현
  - `src/lab/transit.ts`: startTransit·confirmArrival·cancelTransit 구현, `inTransit` 헬퍼
  - `src/lab/lab.test.ts`(신규): 기능별 단위 테스트와 기존 규칙 회귀(E5 재전송·원자성)
- **위험:**
  - `receive`의 input을 args로 기록하므로 `storageGrade` 추가가 기존 재전송 판정 키에 들어간다 — 기존 호출은 항상 같은 키이므로 영향 없음.
  - 운송 목적 확보가 `isFree`를 거치므로 `receive`·`split`·`move`에 자동 적용된다 — 의도한 동작.
  - 등급 상속 변경이 기존 테스트가 있다면 깨질 수 있음 — 기존 테스트 파일이 `src/lab/`에는 없음(확인함).
- **검증 계획:**
  - 단위 테스트: 위 Acceptance 항목 각각
  - 회귀: 같은 eventId 재전송이 상태·이력을 바꾸지 않음, 실패 명령이 상태를 바꾸지 않음
  - 게이트: `pnpm check` (typecheck·vitest·lockfile·태스크 기록)

## 계획과 달라진 점
- `inTransit` 헬퍼는 계획의 `transit.ts`가 아니라 `state.ts`에 둠. `samples.ts`·`reservations.ts`가 `transit.ts`를 import하지 않게 해 순환을 피함.
- 운송 중 `consume`은 `QUARANTINED` 검사 뒤에 `IN_TRANSIT` 검사 (여러 규칙 중 하나의 코드 허용, engine.md E6.4).
- 테스트 카탈로그에 FROZEN 전용 용기 `C5`를 추가함 (분취 등급 상속 검증용, `C3`는 시료가 점유 중이라 쓸 수 없었음).
- 파일 계획의 `quality.ts` 외에 `transit.ts`는 `Storage`·`active`를 그대로 사용, `lab.ts`는 변경 없음 (계획과 같음).
- `pnpm request 1`은 git remote가 없어 실패 → `request.md`는 작업 요청 원문을 수동으로 옮김 (trace.md 2단계).
- `samples.ts`에서 `isGrade` 검사를 `isQty`와 한 `if`로 묶음 (INVALID_INPUT이라 같은 코드).

## 검증 결과
- 단위 테스트 `src/lab/lab.test.ts` 16개 추가, 기존 포함 전체 144개 ALL PASS.
- `pnpm exec tsc --noEmit` PASS.
- Acceptance 다섯 항목 + 실패 원자성·재전송 회귀를 테스트로 확인.
- 게이트: `bash agents/harness/evals/checks.sh` (아래 결과 참조).
