# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 시료 보관 엔진에 격리·보관 등급 적합성·예약 만료·운송이 연결되지 않았다(미구현 메서드 5개, 보관 등급 TODO, 분취 자식 등급 임시값).
- **목표:**
  1. `quarantine`·`release`, 격리 시료의 분취·새 예약·소비 거절(`QUARANTINED`)
  2. 받기·분취·이동·운송 목적지의 보관 등급 적합성(`STORAGE_INCOMPATIBLE`), 분취 자식은 부모 등급 상속
  3. `advanceTime`과 예약 만료(`expiresAt <= now`), 새 예약의 `expiresAt` 검증
  4. `startTransit`·`confirmArrival`·`cancelTransit`과 운송 중 금지 명령(`IN_TRANSIT`), 목적 용기 배타 확보
- **비목표:** `types.ts` 수정, 실제 시계·외부 저장소·동시 호출, 문서에 없는 연구실 관행.

## 애매한 곳·가정
- 잘못된 보관 등급 값(세 가지 밖)으로 받기 — `INVALID_INPUT` (가정: 양 검증과 같은 입력 오류 취급)
- 출발 용기와 같은 용기를 운송 목적지로 지정 — `CONTAINER_OCCUPIED` (가정: 시료가 그 용기를 점유 중이므로 move와 같은 판정)
- 현재와 같은 시각으로 `advanceTime` — 성공하고 이벤트 하나를 남김 (가정: 요청의 "현재 이상")
- `expiresAt`이 정수가 아니거나 안전 정수 범위 밖 — `INVALID_INPUT` (가정: Tick 타입 정의의 "유효 시각")

## Acceptance
- [x] 격리: quarantine·release(같은 값도 성공), 분취·새 예약·소비 `QUARANTINED`, 취소·이동·폐기·책임자 변경·운송은 막지 않음
- [x] 보관 등급: 받기·분취·이동·운송 목적지 정확 일치 검사, 분취 자식 등급 상속
- [x] 예약 만료: advanceTime 검증·경계 포함 만료·이벤트 하나, expiresAt 검증, 만료는 양·소비·폐기·격리·용기를 안 바꿈
- [x] 운송: 시작·도착·취소, 목적 용기 배타 확보, 운송 중 금지 명령 `IN_TRANSIT`, 끝난 운송 ID/TRANSIT_CLOSED/재전송
- [x] 실패 원자성·재전송·이력 규칙이 새 명령에도 적용, 단위 테스트, `pnpm check` PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
