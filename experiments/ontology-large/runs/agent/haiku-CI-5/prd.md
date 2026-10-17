# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`은 받기·분취·예약·소비·폐기·이동만 구현돼 있고, 격리·보관 등급·예약 만료·운송은 스텁(미구현 throw)이거나 연결이 빠져 있다. 온톨로지 불변식 검사(`pnpm onto:check`)가 I8·I9·I12·I13 등에서 실패한다.
- **목표:**
  1. `quarantine`·`release`를 구현하고, 격리 시 분취·새 예약·소비를 `QUARANTINED`로 거절한다.
  2. 받기·분취 자식·이동·운송 시작에서 보관 등급 적합성(`STORAGE_INCOMPATIBLE`)을 검사한다. 분취 자식은 부모 등급을 상속한다.
  3. `advanceTime`으로 논리 시각을 진행하고, 만료 시각이 지난 ACTIVE 예약을 `EXPIRED`로 바꿔 예약 양을 푼다. 새 예약의 `expiresAt`을 검증한다.
  4. `startTransit`·`confirmArrival`·`cancelTransit`을 구현하고, 운송 중 분취·소비·폐기·이동·추가 운송을 `IN_TRANSIT`으로 거절한다.
- **비목표:** 실제 시계·외부 저장소·동시 호출, `types.ts` 변경, 저장소에 없는 연구실 관행 추가, 부분 소비 기능.

## 애매한 곳·가정
- 분취 자식의 등급 — 부모 등급을 상속하고 자식 용기가 그 등급을 지원해야 함 (가정: `docs/storage.md` "분취 자식의 등급은 분취 구현에 적힌 규칙" + `samples.ts` 주석 "부모의 등급을 상속")
- `advanceTime`의 `to == now` — 성공하고 이벤트를 남김 (가정: "현재 이상"이 문구대로 포함)
- `expiresAt == now` 새 예약 — `INVALID_INPUT` (가정: 요청의 "현재보다 미래인 유효 시각"과 docs의 "now보다 큰 유효 정수"를 따름)
- 운송 중 격리·해제·새 예약·예약 취소·책임자 변경 — 허용 (확인됨: `docs/transit.md` 운송 중 명령 "허용" 목록)
- 여러 규칙을 동시에 어기면 어느 코드를 돌려줄지 — 구현 순서대로 하나 (확인됨: `docs/engine.md` E6 4번 "무엇을 돌려줘도 됩니다")

## Acceptance
- [x] `quarantine`·`release` 구현, 같은 값이어도 성공, 격리 시 분취·새 예약·소비 `QUARANTINED`
- [x] 받기·분취 자식·이동·운송 시작의 등급 적합성 `STORAGE_INCOMPATIBLE`, 분취 자식 등급 상속
- [x] `advanceTime` 구현 (과거 `INVALID_INPUT`, 경계 포함 만료, 이벤트 하나), 예약 `expiresAt` 검증
- [x] `startTransit`·`confirmArrival`·`cancelTransit` 구현, 운송 중 `IN_TRANSIT`, 끝난 운송 `TRANSIT_CLOSED`·`UNKNOWN_TRANSIT`·`ID_TAKEN`
- [x] 단위 테스트 추가 (`src/lab/lab.test.ts`)
- [x] `pnpm onto:check` (I1~I14) 통과
- [x] `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
