# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** `src/lab/types.ts`(공개 계약, 수정 금지), `docs/engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`, `agents/context/ontology.md`(명령별 전제·효과 5절, 불변식 I1~I14), `src/lab/{events,state,samples,reservations,quality,storage,transit,lab}.ts`
- **접근:**
  - 명령마다 ontology 5절 표의 전제 순서대로 검사하고, 성공했을 때만 상태를 바꾼다(기존 `Engine.run`의 작업 복사본 사용).
  - 운송 목적 확보는 `State.targeted: Map<containerId, transitId>`로 따로 둔다. 출발 용기 점유(`occupied`)는 그대로 둔다. `Storage.isFree`는 두 맵을 모두 본다.
  - 운송 중 판정은 같은 시료의 ACTIVE 운송을 찾는 `inTransit(s, sampleId)` 헬퍼로 한다.
  - 만료는 `advanceTime`에서 ACTIVE 예약 중 `expiresAt !== null && expiresAt <= to`인 것을 `EXPIRED`로 바꾸고 시료의 `reserved`만 줄인다.
  - 분취 자식 등급은 부모의 `storageGrade`를 그대로 쓴다(`samples.ts`의 임시값 제거).
  - `storage.supports(id, grade)`를 받기·분취·이동·운송 시작에서 쓴다(`storage.ts`의 TODO 제거).
- **대안·트레이드오프:**
  - 목적 확보를 `occupied`에 넣는 방법: 구현은 짧지만 `finish`·`move`가 출발 용기와 목적 용기를 구별해야 해서 얽힌다. 기각.
  - 운송마다 목적 확보를 전체 순회로 찾는 방법: 메모리 샌드박스라 성능 문제가 없다. 다만 `targeted` 맵이 더 단순해 채택.
  - 만료를 예약 조회 시점에 계산하는 방법: 상태가 명시적으로 `EXPIRED`여야 하고 이력·재전송과 맞지 않아 기각. `advanceTime`에서 확정한다.
- **파일 계획:**
  - `src/lab/state.ts`: `targeted` 맵 추가, `copyState`에 복사 추가, `inTransit` 헬퍼, 논리 시각 검사 헬퍼
  - `src/lab/storage.ts`: `isFree`가 `targeted`도 확인, `supports`의 TODO 제거
  - `src/lab/samples.ts`: receive 등급 값·적합 검사, split 격리·운송·자식 등급 상속·등급 적합, discard 운송 검사, move 운송·등급 적합
  - `src/lab/reservations.ts`: reserve의 `expiresAt`·격리 검사, consume 격리·운송 검사, `advanceTime` 구현
  - `src/lab/quality.ts`: quarantine·release 구현
  - `src/lab/transit.ts`: startTransit·confirmArrival·cancelTransit 구현
  - `src/lab/lab.test.ts`(신규): 명령별 성공·실패·재전송·원자성 단위 테스트
  - `agents/orchestration/TASKS.md`, `agents/JOURNAL.md`: 클레임·기록
- **위험:**
  - `types.ts`의 `Lab` 시그니처와 구현이 어긋나면 typecheck에서 잡힌다.
  - `copyState`에서 새 맵을 빠뜨리면 실패 시 롤백이 깨진다. 실패 후 스냅숏 동일성 테스트로 확인한다.
  - `exactOptionalPropertyTypes` 설정 때문에 `expiresAt` 등 optional 처리에 주의한다.
- **검증 계획:**
  - 명령별 단위 테스트: 각 오류 코드, 성공 시 효과, 실패 시 스냅숏 불변(I8), 같은 eventId 재전송(E5)
  - 불변식 점검: I1(계보 보존), I2(용기 점유), I4(reserved 합), I13(만료 예약 없음), I14(운송 짝)
  - 게이트: `pnpm check`

## 계획과 달라진 점
- 원문 파일(request.md)은 만들지 않았다. `pnpm request 1`이 원격 저장소 없음("no git remotes found")으로 이슈 본문을 가져오지 못했다. 판정 기준은 작업 요청 원문(AGENT_TASK.md)이다.
- 받기·분취 자식·이동·운송 시작의 등급 검사는 계획대로 용량 검사 다음에 두었다. 분취 자식 등급은 `samples.ts`의 임시값(AMBIENT) 대신 부모 등급을 쓰도록 바꿨다.
- 테스트는 `src/lab/lab.test.ts` 한 파일에 17개로 작성했다.

## 검증 결과
- `pnpm exec tsc --noEmit`: PASS
- `pnpm exec vitest run src/lab`: 17개 PASS (기존 128개 포함 전체 145개 PASS)
- 불변식: I1·I2·I4·I13·I14는 실패 경로 포함 테스트에서 확인(운송 목적 확보 해제, 만료 후 reserved 감소, 실패 후 스냅숏 동일)
- `bash agents/harness/evals/checks.sh`: 아래 기록 참조
