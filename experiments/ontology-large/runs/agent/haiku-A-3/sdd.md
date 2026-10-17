# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md) · 원문: [request.md](request.md)

## 설계
- **읽은 문서:** `src/lab/types.ts`, `docs/engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`, `src/lab/{events,state,samples,reservations,storage,quality,transit,lab}.ts`
- **접근:**
  1. `state.ts`: 운송 목적 용기 확보 맵 `claimed: containerId → transitId` 추가 (`copyState`·`initialState` 포함)
  2. `storage.ts`: `isFree`가 점유(`occupied`)와 확보(`claimed`)를 모두 본다 → 받기·분취·이동·운송 목적지가 같은 규칙으로 막힘. `GRADES`·`isGrade` 추가
  3. `samples.ts`: 받기·분취·이동에 등급 검사, 분취 자식 등급은 부모 상속(임시 AMBIENT 제거), 분취에 `QUARANTINED`·`IN_TRANSIT` 검사
  4. `samples.ts` `discard`·`move`에 `IN_TRANSIT` 검사
  5. `quality.ts`: `quarantine`·`release`를 `active`로 검사한 뒤 `quarantined` 설정
  6. `reservations.ts`: 새 예약 `expiresAt` 검사, 예약·소비에 `QUARANTINED`·`IN_TRANSIT`, `advanceTime`은 검증 후 `now` 진행 + `expiresAt <= now` ACTIVE 예약을 `EXPIRED`(예약 양 해제)
  7. `transit.ts`: `startTransit`(ID 중복, 활성 시료, 같은 시료 추가 운송 `IN_TRANSIT`, 목적 용기 존재·확보·등급·용량), `confirmArrival`(시료 이동·출발 비움·확보 해제·`ARRIVED`), `cancelTransit`(확보 해제·`CANCELED`)
  8. 모든 명령은 기존 `Engine.run`을 거쳐 재전송·원자성·이력을 그대로 받는다
- **대안·트레이드오프:**
  - 운송 목적 용기를 `occupied`에 넣기: 출발 용기와 목적 용기의 의미가 섞여 도착·취소 때 되돌리기가 복잡 → 별도 `claimed` 맵 채택
  - 운송 중 시료를 어느 용기에도 두지 않기: docs/transit.md가 출발 용기 계속 점유를 명시 → 채택 안 함
  - 등급 검사를 `Storage.supports` 대신 `Storage` 안에 흡수: 기존 메서드 재사용이 더 작음 → 재사용
- **파일 계획:** `src/lab/{state.ts, storage.ts, samples.ts, reservations.ts, quality.ts, transit.ts, lab.ts(변경 없음 예상)}`, 테스트 `src/lab/lab.test.ts`. `types.ts` 불변.
- **위험:** 검사 순서가 규칙 여럿을 동시에 어기는 경우 코드가 달라질 수 있음 → E6.4에 따라 허용됨. 등급 검사 누락 → 명령별 단위 테스트.
- **검증 계획:** `lab.test.ts`에서 명령별 실패 코드·성공 상태·실패 시 무변경·재전송, 운송 점유, 만료 경계(`expiresAt == now`), 기존 동작 회귀. `pnpm check`(typecheck·vitest·기록 검사).

## 계획과 달라진 점
- `pnpm request 1`은 `gh` 원격이 없어 실패 → 작업 지시 파일의 요청 섹션을 그대로 `request.md`에 복사 (원문 고정 규칙은 복사로 대체)
- 받기에 잘못된 등급 값 검사(`INVALID_INPUT`)를 추가: 세 등급 밖의 값은 "용기 미지원"과 구분해야 해서 (prd 가정과 일치)
- `startTransit`에 용량 검사(`CAPACITY_EXCEEDED`)를 추가: 도착 뒤 E1.3 불변식을 보장하려고 (prd 가정과 일치)
- 공용 헬퍼를 추가: `transitOf`(state.ts, 시료의 ACTIVE 운송 조회), `GRADES`·`isGrade`(storage.ts)
- `lab.ts`는 바꾸지 않았고 `types.ts`도 그대로다

## 검증 결과
- 단위 테스트 `src/lab/lab.test.ts` 29개: 격리·등급·만료 경계(`expiresAt == now`)·운송 점유와 목적 확보·도착·취소·끝난 운송 ID·재전송·이력·분취 계보 회귀
- `pnpm check` ALL PASS (typecheck, vitest 157개, lockfile, 태스크 기록 13개 폴더)
- 실패 명령의 무변경·eventId 미기록은 테스트에서 실패 후 같은 eventId 재사용으로 확인
- 여러 규칙을 동시에 어기는 호출의 코드는 E6.4에 따라 검사 순서대로 정함 (테스트는 단일 규칙 위반으로 검증)
