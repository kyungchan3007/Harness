# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** `docs/engine.md`(E1–E6), `docs/quality.md`, `docs/storage.md`, `docs/reservations.md`, `docs/transit.md`, `agents/context/ontology.md`(명령별 전제·불변식 I1–I14), `src/lab/*.ts` 전부, `src/lab/types.ts`(고치지 않음)
- **접근:**
  1. `state.ts`: 운송 목적 용기 확보용 `targets: Map<containerId, transitId>` 추가(`copyState`·`initialState` 포함). 등급·tick 검사 헬퍼(`isGrade`·`isTick`)와 `inTransit(s, sampleId)` 추가.
  2. `storage.ts`: `isFree`가 `occupied`와 `targets`를 함께 본다(운송 목적 확보가 받기·분취·이동·다른 운송을 막음). `supports`의 TODO 제거.
  3. `samples.ts`: receive에 등급 이름 검사(`INVALID_INPUT`)·등급 적합(`STORAGE_INCOMPATIBLE`). split에 `QUARANTINED`·`IN_TRANSIT`·자식 용기 등급 적합, 자식 `storageGrade`는 부모 값 상속(TODO 제거). discard·move에 `IN_TRANSIT`, move에 등급 적합.
  4. `quality.ts`: quarantine/release가 ACTIVE 시료의 `quarantined`만 설정.
  5. `reservations.ts`: reserve에 `expiresAt` 검증·`QUARANTINED`, consume에 `QUARANTINED`·`IN_TRANSIT`, advanceTime은 시각을 올리고 만료 예약을 `EXPIRED`로 바꾸며 한 이벤트로 기록.
  6. `transit.ts`: startTransit은 운송 ID 재사용·ACTIVE·`IN_TRANSIT`·목적 용기(있음·비어 있음·등급·용량)를 검사하고 목적을 `targets`에 확보. confirmArrival은 시료를 목적 용기로 옮기고 확보를 풀며 ARRIVED, cancelTransit은 확보만 풀고 CANCELED.
  7. 모든 새 명령은 `engine.run`을 거쳐 E5 재전송·E6 원자성·이력을 그대로 받는다.
- **대안·트레이드오프:**
  - 운송 목적 확보를 별도 맵 대신 `occupied`에 운송 ID를 넣는 방식: `occupied`의 값 타입(sampleId)과 I2 판정이 섞여 위험 → 별도 `targets` 맵으로 분리해 `isFree`에서만 합침
  - 운송 중 시료를 `occupied`에서 빼는 방식: docs/transit.md가 출발 용기 점유를 명시 → 빼지 않음
  - 등급·tick 검사를 각 모듈에 흩기: 중복 → `state.ts`에 한 번 정의
- **파일 계획:** 수정 `src/lab/state.ts`, `storage.ts`, `samples.ts`, `quality.ts`, `reservations.ts`, `transit.ts`. 추가 `src/lab/lab.test.ts`(규칙 번호별 단위 테스트). `types.ts`·`lab.ts`는 변경 없음.
- **위험:** 운송 확보가 `isFree`에 섞여 기존 receive·split·move 판정이 바뀜 → 기존 테스트 유지 확인 + 확보 중 다른 시료 거절 테스트. 분취 자식 등급 상속이 기존 자식 생성과 어긋남 → 자식 등급 단위 테스트.
- **검증 계획:** 새 단위 테스트(격리·등급·만료·운송·재전송·원자성), 기존 128개 테스트 유지, `pnpm check` ALL PASS.

## 계획과 달라진 점
- startTransit 실패 순서: 목적 용기 확보(CONTAINER_OCCUPIED)를 등급(STORAGE_INCOMPATIBLE)보다 먼저 검사한다. 두 규칙을 동시에 어기면 engine.md E6 4번대로 둘 중 하나를 돌려주면 되므로 코드를 바꾸지 않았다
- 기록 중 BSD sed -i 인자 실수와 quality.ts 쓰기 누락을 발견해 파일을 다시 썼다(trace 7)

## 검증 결과
- 게이트: `pnpm check` ALL PASS (typecheck, vitest 141개 — 기존 128 + 신규 lab.test.ts 13, 레코드 검사 통과)
- 신규 테스트: 격리(2)·보관 등급(3)·예약 만료(3)·운송(5)으로 13개, 재전송·실패 원자성 포함
- 미실행: 커밋·PR은 아직 없음 (사용자 지시 대기)
