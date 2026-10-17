# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`에는 받기·분취·예약·소비·폐기·이동·책임자 변경만 있고, 격리·보관 등급·예약 만료·운송은 미구현(throw)이거나 연결되지 않았다. 보관 등급 분취 자식은 임시값(`AMBIENT`)이다.
- **목표:**
  1. `quarantine`·`release`로 격리를 설정하고, 격리 시료의 분취·새 예약·예약 소비를 `QUARANTINED`로 거절한다.
  2. 받기·분취 자식·이동·운송 시작의 목적 용기가 시료 요구 등급을 지원하지 않으면 `STORAGE_INCOMPATIBLE`로 거절한다.
  3. `advanceTime`으로 논리 시각을 진행하고, 만료된 ACTIVE 예약을 `EXPIRED`로 바꿔 예약 양만 푼다.
  4. `startTransit`·`confirmArrival`·`cancelTransit`으로 운송을 처리하고, 운송 중 금지 명령을 `IN_TRANSIT`으로 거절한다.
  5. 기존 기능(재전송·원자성·이력·E1~E4 규칙)은 그대로 유지한다.
- **비목표:** `types.ts` 변경, 실제 시계·외부 저장소·동시 호출, 예약 부분 소비, 저장소에 없는 연구실 관행 추가.

## 애매한 곳·가정
- 보관 등급 값이 `AMBIENT`·`CHILLED`·`FROZEN`이 아닌 입력 — (가정) `INVALID_INPUT`으로 거절 (등급 자체가 잘못된 입력이므로 `STORAGE_INCOMPATIBLE`이 아님)
- `advanceTime`의 `to`가 현재와 같음 — (가정) 허용, 성공 이벤트로 기록 ("현재 이상"의 문면대로)
- `to`가 정수가 아니거나 `Number.MAX_SAFE_INTEGER`를 넘는 값 — (가정) `INVALID_INPUT` (types.ts의 Tick 정의)
- `expiresAt`이 `undefined`·정수가 아님·현재와 같음 — (가정) `INVALID_INPUT` ("현재보다 미래"의 문면대로 현재와 같으면 거절)
- `quarantine`·`release`를 ACTIVE가 아닌 시료에 호출 — (가정) `NOT_ACTIVE` (기존 `active()` 헬퍼의 코드 재사용, quality.md의 "ACTIVE 시료" 문면)
- 운송 목적 용기가 출발 용기와 같음 — (가정) 출발 용기는 시료가 점유 중이므로 `CONTAINER_OCCUPIED` (별도 코드 없음)
- 운송 목적 용기 용량이 시료 남은 양보다 작음 — (가정) `CAPACITY_EXCEEDED` (E1.3 "남은 양은 담긴 용기의 용량 이하"를 운송 목적지에도 적용)
- 운송 시작 시 시료 ID 검사 순서 — (가정) 운송 ID 중복(`ID_TAKEN`) → 시료 존재·ACTIVE → 같은 시료의 ACTIVE 운송(`IN_TRANSIT`) → 목적 용기 존재·등급·점유·용량. 여러 규칙을 어기면 어느 코드든 허용(engine.md E6.4)
- 운송 ID와 시료·예약 ID의 네임스페이스 — (가정) engine.md "ID는 종류마다 따로 고유" 문면대로 운송 ID는 운송끼리만 비교
- 운송 중 `reserve`·`cancel`·`transferCustody`·`quarantine`·`release`·`advanceTime` — 허용 (가정: transit.md 허용 목록 문면대로)
- 운송 중 `consume` — 예약이 있어도 `IN_TRANSIT` (가정: transit.md 금지 목록의 "소비" 문면대로)
- 분취 자식 등급 — (가정) 부모 등급 상속 (storage.md "분취 구현에 적힌 규칙", samples.ts 정책 주석). 기존 `AMBIENT` 임시값은 제거

## Acceptance
- [x] 격리: quarantine·release 성공(멱등 포함), 비ACTIVE는 NOT_ACTIVE, 격리 시료의 분취·새 예약·예약 소비는 QUARANTINED, 취소·이동·폐기·책임자 변경·운송은 허용
- [x] 보관 등급: receive·split 자식·move·startTransit의 목적 용기 등급 불일치는 STORAGE_INCOMPATIBLE, 분취 자식은 부모 등급 상속, 잘못된 등급 값은 INVALID_INPUT
- [x] 예약 만료: advanceTime 과거 시각 INVALID_INPUT, 같은 시각 허용, expiresAt 검증, `expiresAt <= now` ACTIVE 예약 EXPIRED, 양 해제만 하고 remaining·consumed·discarded 불변, 만료 뒤 cancel·consume은 RESERVATION_CLOSED
- [x] 운송: startTransit 성공 시 목적 용기 확보·출발 용기 점유 유지, confirmArrival 이동·ARRIVED, cancelTransit 확보 해제·CANCELED, 끝난 운송 재조작은 TRANSIT_CLOSED, 없는 운송은 UNKNOWN_TRANSIT, 운송 중 분취·소비·폐기·move·추가 운송은 IN_TRANSIT
- [x] 실패한 명령은 상태·이력·eventId를 바꾸지 않고, 같은 eventId 재전송은 처음 Receipt를 돌려준다 (기존 규칙 회귀 테스트 포함)
- [x] `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md) · 원문: [request.md](request.md)
