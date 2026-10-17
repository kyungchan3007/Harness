# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 시료 보관 엔진에 격리·보관 등급·예약 만료·운송이 미구현이거나 연결되지 않았다(`throw new Error("미구현…")`, 분취 자식 등급 임시값 AMBIENT, `supports` 미연결).
- **목표:**
  1. `quarantine`·`release`와 격리 중 분취·새 예약·소비 거절(`QUARANTINED`).
  2. 받기·분취 자식 용기·이동·운송 목적지의 보관 등급 적합성 검사(`STORAGE_INCOMPATIBLE`), 분취 자식은 부모 등급 상속.
  3. `advanceTime`과 예약 만료(`expiresAt <= now`), 새 예약의 만료 시각 검증.
  4. `startTransit`·`confirmArrival`·`cancelTransit`, 운송 중 금지 명령(`IN_TRANSIT`).
  5. 기존 재전송(E5)·원자성(E6)·이력 규칙을 새 명령에도 적용.
- **비목표:** `types.ts` 수정, 실제 시계·외부 저장소·동시 호출, 문서에 없는 실제 연구실 관행.

## 애매한 곳·가정
- `receive`의 알 수 없는 등급 값 — `INVALID_INPUT` (가정: engine.md E1.5의 "값이 잘못됨" 계열, 등급은 세 값뿐)
- 운송 시작 시 시료 양이 목적 용기 용량 초과 — `CAPACITY_EXCEEDED` (가정: E1.3 "시료 양은 담긴 용기 용량 이하"를 도착 후에도 지키려는 move와 같은 검사)
- 목적 용기가 지금 출발 용기 — `CONTAINER_OCCUPIED` (가정: move와 같은 규칙, 출발 용기는 시료가 점유)
- 운송 중 시료의 예약 취소·새 예약·만료 — 허용 (가정: transit.md 그대로)
- 규칙을 여럿 어기는 호출의 오류 코드 — 어느 것이든 허용 (가정: engine.md E6.4)

## Acceptance
- [x] 격리: `quarantine`/`release`, 격리 중 분취·새 예약·소비 `QUARANTINED`, 예약·이동·폐기·책임자·운송은 막지 않음
- [x] 보관 등급: 받기·분취·이동·운송 목적지 `STORAGE_INCOMPATIBLE`(정확 일치), 자식 등급 상속
- [x] 예약 만료: `advanceTime` 검증·`<=` 만료·이벤트 하나·남은 양/소비/폐기 불변, `expiresAt` 검증
- [x] 운송: 시작·도착·취소, 출발 점유·목적 배타 확보, 운송 중 금지 명령 `IN_TRANSIT`, 끝난 운송 ID/`TRANSIT_CLOSED`/`UNKNOWN_TRANSIT`
- [x] 재전송·원자성·이력이 새 명령에도 적용됨(테스트)
- [x] `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
