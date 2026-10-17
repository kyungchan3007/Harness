# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/` 엔진은 받기·분취·예약·소비·폐기·이동만 지원한다. 격리, 보관 등급 적합성, 예약 만료, 운송 명령은 모듈 뼈대만 있고 미구현(throw)이며, 분취 자식 등급은 임시값(AMBIENT)이다.
- **목표:**
  1. `quarantine`·`release`로 ACTIVE 시료의 격리 여부를 설정하고, 격리 중 분취·새 예약·예약 소비를 `QUARANTINED`로 막는다.
  2. 받기·분취 자식·이동·운송 목적지에서 용기의 지원 등급이 시료 요구 등급을 정확히 포함하는지 검사한다(`STORAGE_INCOMPATIBLE`). 분취 자식은 부모 등급을 상속한다.
  3. 논리 시각 `advanceTime`을 구현하고, 만료 시각이 지난 ACTIVE 예약을 `EXPIRED`로 바꿔 예약 양을 푼다.
  4. `startTransit`·`confirmArrival`·`cancelTransit`으로 운송을 구현하고, 운송 중 금지 명령을 `IN_TRANSIT`으로 막는다.
- **비목표:** 실제 시계·외부 저장소·동시 호출, `src/lab/types.ts` 변경, 예약 부분 소비, 연구실 실제 관행 추가.

## 애매한 곳·가정
- `advanceTime(to)`의 `to`가 현재 시각과 같으면 성공 (가정: "현재 이상"이라는 요청 문구를 따름). 성공이므로 이벤트 하나를 남긴다.
- 새 예약 `expiresAt`이 현재와 정확히 같으면 `INVALID_INPUT` (가정: 요청의 "현재보다 미래"를 따름). 만료 판정 `expiresAt <= now`와 별개다.
- 운송 목적 용기 확보는 `occupied` 맵에 운송 중 목적 용기를 시료 ID로 넣어 구현한다 (가정: docs/transit.md의 "배타적 확보"를 기존 점유 검사로 표현). 이로써 받기·분취·이동·다른 운송 목적지가 같은 방식으로 막힌다.
- 운송 시작 시 출발 용기와 목적 용기가 같으면 `CONTAINER_OCCUPIED` (가정: 출발 용기는 이미 그 시료가 점유 중이므로).
- 운송 중 시료에 대한 `quarantine`·`release`·`transferCustody`·새 예약·예약 취소·시각 진행은 허용 (가정: docs/transit.md 허용 목록을 그대로 따름).
- 격리 시료의 운송 시작은 허용 (가정: docs/quality.md의 제외 목록을 그대로 따름).

## Acceptance
- [x] 격리: `quarantine`·`release` 멱등 성공, 격리 중 분취·새 예약·예약 소비 `QUARANTINED`, 예약 취소·이동·폐기·책임자 변경·운송은 막지 않음
- [x] 보관 등급: 받기·분취 자식·이동·운송 목적지에서 지원 목록에 없으면 `STORAGE_INCOMPATIBLE`, 분취 자식은 부모 등급 상속
- [x] 예약 만료: `expiresAt` 검증(`INVALID_INPUT`), `advanceTime` 절대 시각·과거 거절, 만료 시 `EXPIRED`와 예약 양 해제, 실제 양·소비·폐기는 불변
- [x] 운송: 시작·도착·취소, 운송 ID 고유(`ID_TAKEN`), `UNKNOWN_TRANSIT`·`TRANSIT_CLOSED`, 목적 용기 배타 확보, 운송 중 분취·소비·폐기·이동·추가 운송 `IN_TRANSIT`
- [x] 공통 계약(E1~E6): 실패 시 상태 불변, 같은 eventId 재전송 시 처음 Receipt, 성공마다 이벤트 1개
- [x] `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
