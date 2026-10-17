# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** `docs/engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`, `src/lab/types.ts`, `src/lab/{lab,events,state,samples,reservations,quality,storage,transit}.ts`
- **접근:**
  1. `quality.ts`: `quarantine`·`release`는 `active()`로 검사 후 `quarantined`를 설정. 분취·예약·소비에서 `quarantined`면 `QUARANTINED`.
  2. `storage.ts`의 `supports()`를 받기·분취 자식·이동·운송 목적지에서 호출 → `STORAGE_INCOMPATIBLE`. 분취 자식 등급은 `parent.storageGrade`로 상속(임시 AMBIENT 제거).
  3. `reservations.ts`: `reserve`에서 `expiresAt`을 `null` 또는 안전 정수이면서 `> now`인지 검사. `advanceTime`은 `to`가 안전 정수이고 `>= now`인지 검사 후 `now`를 올리고, `status === ACTIVE && expiresAt !== null && expiresAt <= to` 예약을 `EXPIRED`로 바꾸고 해당 시료 `reserved`에서 `qty`를 뺌. 이벤트는 하나.
  4. `transit.ts`: 운송 ID는 `s.transits`에 있으면 `ID_TAKEN`. 시료는 `active()`, 같은 시료의 ACTIVE 운송이 있으면 `IN_TRANSIT`, 목적 용기는 `storage.get` → 지원 등급 → `isFree`. 시작 시 `occupied.set(target, sampleId)`로 확보.
     도착: 운송 조회·`ACTIVE` 확인 → `occupied.delete(source)`, 시료 `containerId = target`, 상태 `ARRIVED`. 취소: `occupied.delete(target)`, 상태 `CANCELED`. 시료 `containerId`는 도착 시에만 바뀜.
  5. `samples.ts`(분취·폐기·이동): 격리 검사, 운송 중 검사(`transitActive` 헬퍼 필요)를 추가. 이동은 목적 용기 등급 검사 추가.
  6. 운송 중 판정은 `state.ts`에 `inTransit(s, sampleId)` 헬퍼로 모음.
- **대안·트레이드오프:**
  - 운송 목적 확보를 별도 맵(`reservedFor`)으로 두기: 점유 검사 경로가 둘이 됨 → 기존 `occupied` 재사용을 택함. 대신 `occupied` 값이 "담긴 시료"가 아니라 "확보한 시료"일 수 있음을 주석으로 명시.
  - 만료를 조회 시점 계산으로 하기: 예약 상태가 두 곳에서 바뀌어 `snapshot` 일관성이 깨짐 → `advanceTime`에서 상태를 실제로 바꿈.
- **파일 계획:** `src/lab/{samples,reservations,quality,storage,transit,state}.ts` 수정, `src/lab/lab.ts`는 필요 시만. 테스트 `src/lab/lab.test.ts` 신설(명령별 단위 + 공통 계약 회귀).
- **위험:** 기존 기능 회귀 — 기존 분취·예약·소비·폐기·이동 동작을 테스트로 고정. 운송 점유 키 충돌 — 목적 확보 시 `occupied` 항목이 이미 있으면 `CONTAINER_OCCUPIED`로 막힘을 테스트.
- **검증 계획:** 단위 테스트(각 규칙·실패 시 상태 불변·재전송·이벤트 seq), `pnpm check`(typecheck·vitest·task records).

## 계획과 달라진 점
- 운송 시작에 용량 검사(`CAPACITY_EXCEEDED`)를 추가. 계획에는 없었지만 E1-3(시료 양 ≤ 담기는 용기 용량)을 목적 용기에도 적용하려고 넣음.
- 분취 자식 등급은 `parent.storageGrade`로 바꾸고, 자식 용기에 대한 지원 등급 검사도 추가(docs/storage.md 적용 범위).
- 운송 중 `consume`은 계획의 `IN_TRANSIT` 목록에 있어 검사를 넣었고, 격리 검사(`QUARANTINED`)를 먼저 둠 (둘 다 거절이므로 어느 코드를 돌려줘도 계약 위반이 아님, E6-4).
- `inTransit` 헬퍼는 `state.ts`에, `isTick`도 `state.ts`에 둠. `lab.ts`는 수정하지 않음.

## 검증 결과
- `pnpm exec tsc --noEmit`: 통과
- `pnpm exec vitest run`: 12개 파일, 148개 테스트 통과 (기존 128 + 신규 `src/lab/lab.test.ts` 20개)
- `bash agents/harness/evals/checks.sh` (`pnpm check`): ALL PASS
- 신규 테스트는 격리·보관 등급·예약 만료·운송·공통 계약(E5·E6 재전송, 실패 시 eventId 미기록, seq)을 명령별로 확인
