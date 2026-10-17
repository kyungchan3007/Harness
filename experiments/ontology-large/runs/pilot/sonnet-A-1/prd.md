# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 시료 보관 엔진은 기존 기능(받기·분취·예약·취소·소비·폐기·이동·책임자 변경)만 동작한다. 공개 계약(`types.ts`)의 새 필드(`storageGrade`·`quarantined`·`expiresAt`·`now`·`transits`)와 새 메서드(`quarantine`·`release`·`advanceTime`·`startTransit`·`confirmArrival`·`cancelTransit`)는 미구현이거나 임시값이다.
- **목표:** `docs/`의 정책 문서 5개와 `types.ts`·구현 주석의 계약대로 격리·보관 등급·예약 만료·운송을 구현하고, 기존 재전송(E5)·원자성·이력(E6) 규칙을 새 명령에도 적용한다.
- **비목표:** `types.ts` 수정, 실제 시계·외부 저장소·동시 호출, 저장소에 적히지 않은 실제 연구실 관행.

## 애매한 곳·가정
- `receive`의 `storageGrade`가 세 값이 아니면 — `INVALID_INPUT` (가정: 계약상 타입이 세 값뿐이라 런타임 위반은 입력 오류)
- `advanceTime`의 `to`가 정수가 아니거나 0 미만·`MAX_SAFE_INTEGER` 초과 — `INVALID_INPUT` (가정: types.ts의 Tick 정의를 따름). 현재와 같은 값은 성공하며 이벤트를 남긴다 (가정: 요청의 "현재 이상").
- `reserve`의 `expiresAt`이 `Tick` 유효 정수가 아니거나 `now` 이하 — `INVALID_INPUT`. `undefined`도 `null`이 아니므로 `INVALID_INPUT` (가정).
- 분취 자식의 보관 등급 — 부모 등급 상속, 자식 용기는 그 등급을 지원해야 함 (가정: samples.ts 정책 주석 그대로).
- 운송 시작의 용량 검사 — 목적 용기 용량이 시료 남은 양 미만이면 `CAPACITY_EXCEEDED` (가정: engine E1.3, move와 같은 규칙).
- 격리된 시료의 운송·이동·폐기·취소·책임자 변경은 막지 않고, 운송 중 새 예약·취소·책임자 변경·격리·해제·시각 진행은 허용 (가정: quality.md·transit.md 그대로).
## Acceptance
- [x] `quarantine`·`release`: ACTIVE 시료만, 멱등 성공, 격리 시 분취·새 예약·소비는 `QUARANTINED`, 기존 예약은 불변
- [x] 보관 등급: 받기·분취·이동·운송 목적지에서 정확 일치만 허용, 자식은 부모 등급 상속
- [x] `advanceTime`·만료: `expiresAt <= now`인 ACTIVE 예약 `EXPIRED`, 이벤트 1개, 양·소비·폐기 불변, 과거 시각·잘못된 만료 시각은 `INVALID_INPUT`
- [x] 운송: 시작·도착·취소, 목적 용기 배타 확보, 운송 중 금지 명령은 `IN_TRANSIT`, 끝난 운송 ID 재사용 `ID_TAKEN`·`UNKNOWN_TRANSIT`·`TRANSIT_CLOSED`
- [x] 재전송·`EVENT_CONFLICT`·원자성·이력 규칙이 새 명령에도 성립
- [x] `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
