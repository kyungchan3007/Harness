# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** `src/lab/types.ts`(공개 계약, 수정 금지), `docs/engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`, `agents/context/ontology.md`(명령별 전제·불변식 I1~I14), 모듈 `state.ts`·`events.ts`·`samples.ts`·`reservations.ts`·`storage.ts`·`transit.ts`·`quality.ts`·`lab.ts`
- **접근:**
  - 모든 명령은 기존처럼 `engine.run(eventId, op, args, body)`로 감싼다. 실패·재전송·이력은 엔진이 맡으므로 명령은 검사와 상태 변경만 쓴다.
  - 격리는 `quality.ts`에서 `quarantined`만 바꾼다. 분취·예약·소비에 `QUARANTINED` 검사를 넣는다.
  - 보관 등급은 `Storage.supports`를 받기·분취 자식·이동·운송 시작에 연결한다. 분취 자식 등급은 TODO 임시값 대신 부모 등급을 복사한다.
  - 운송 목적 용기 확보는 `State`에 `claimed: containerId → transitId` 맵을 추가하고 `Storage.isFree`가 `occupied`와 함께 본다. 그러면 받기·분취·이동·다른 운송 시작이 모두 같은 판정을 쓴다.
  - 운송 중 금지는 `state.ts`의 `inTransit(s, sampleId)`로 판정한다(ACTIVE 운송 중 같은 시료).
  - `advanceTime`은 `s.now = to` 후 `expiresAt !== null && expiresAt <= to`인 ACTIVE 예약을 `EXPIRED`로 바꾸고 그 양을 시료 `reserved`에서 뺀다. 남은 양·소비·폐기는 건드리지 않는다.
- **대안·트레이드오프:**
  - 목적 용기를 `occupied`에 시료 ID로 넣는 방법: 구현은 짧지만 `finish()`·`occupied` 의미("시료가 있는 용기")가 섞인다. 별도 `claimed` 맵을 택해 의미를 분리했다.
  - 운송 중 검사를 시료의 `containerId` 상태 플래그로 하는 방법: 상태 불변식을 늘린다. 운송 목록 조회로 판정해 상태를 추가하지 않았다. 메모리 규모에서 선형 탐색은 충분하다.
- **파일 계획:**
  - `src/lab/state.ts` — `claimed` 필드, `initialState`·`copyState` 반영, `inTransit` 추가
  - `src/lab/storage.ts` — `isFree`가 `claimed`도 보고, TODO 주석 제거
  - `src/lab/samples.ts` — 받기 등급 검사·분취 자식 등급 상속·분취 격리/운송 검사·이동 등급 검사
  - `src/lab/reservations.ts` — `expiresAt` 검사, 예약·소비 격리 검사, 소비 운송 검사, `advanceTime`
  - `src/lab/quality.ts` — `quarantine`·`release`
  - `src/lab/transit.ts` — `startTransit`·`confirmArrival`·`cancelTransit`
  - `src/lab/samples.ts` 폐기 — 운송 검사 추가 (같은 파일)
  - `src/lab/lab.test.ts` — 새 동작 단위 테스트 (신규)
  - `src/lab/types.ts`, `docs/`, `lab.ts` — 변경 없음 (`lab.ts`는 이미 모든 모듈을 조립함)
- **검사 순서(오류 코드):** 입력 값 → 존재(ID_TAKEN·UNKNOWN_*) → 생애 상태(NOT_ACTIVE·RESERVATION_CLOSED·TRANSIT_CLOSED) → 격리·운송 → 용기(UNKNOWN_CONTAINER·CONTAINER_OCCUPIED) → 용량 → 등급 → 양·예약. 여러 규칙을 어기면 이 순서의 첫 코드를 낸다.
- **위험:**
  - `state.ts`의 `copyState`에 `claimed`를 빠뜨리면 실패 시 롤백이 깨진다 → 실패 후 스냅숏 동일 테스트로 검증
  - 운송 목적 확보 해제를 빠뜨리면 이후 용기가 영구 점유된다 → 도착·취소 뒤 같은 용기 재사용 테스트
  - 만료 판정 경계(`expiresAt == now`) 오류 → 경계 테스트
- **검증 계획:** `pnpm exec tsc --noEmit`, `pnpm exec vitest run`(기존 128개 + 새 lab 테스트), `bash agents/harness/evals/checks.sh`. 테스트는 각 docs 규칙을 명령별로 최소 한 개씩 덮는다.

## 계획과 달라진 점
- 운송 중 판정을 시료에 플래그로 두지 않고 `inTransit(s, sampleId)`로 조회했다 (계획과 같음, 구현 세부만 확정).
- 운송 목적 확보 조회 `findTransit`(UNKNOWN_TRANSIT · TRANSIT_CLOSED 판정)을 `transit.ts` 안 헬퍼로 두었다. 파일 계획에 없던 항목이다.
- 보관 등급 상속은 `samples.ts`의 TODO 임시값(AMBIENT)을 부모 등급으로 바꾸는 것으로 끝냈다.
- 테스트는 계획대로 `src/lab/lab.test.ts` 한 파일(18개)로 작성했다.

## 검증 결과
- `pnpm exec tsc --noEmit`: PASS
- `pnpm exec vitest run`: 12개 파일, 146개 테스트 PASS (기존 128개 + 신규 18개)
- `bash agents/harness/evals/checks.sh`: ALL PASS (Typecheck · Unit tests · lockfile · 태스크 기록 13개 폴더)
- `types.ts`와 `docs/`, `lab.ts`는 수정하지 않았다
