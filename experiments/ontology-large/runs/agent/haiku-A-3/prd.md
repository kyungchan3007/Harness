# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** 시료 보관 엔진(`src/lab/`)에 격리, 보관 등급, 예약 만료, 운송 명령이 없어 `quarantine`·`release`·`advanceTime`·`startTransit`·`confirmArrival`·`cancelTransit`이 미구현(throw)이고, 받기·분취·이동에도 보관 등급 검사가 없다.
- **목표:**
  - 기존 명령(받기·분취·예약·취소·소비·폐기·이동·책임자 변경)의 동작을 유지한 채 위 기능을 `createLab` 공개 계약대로 구현한다.
  - 실패는 예외가 아니라 `{ ok: false, code }`로 돌려준다.
- **비목표:**
  - `src/lab/types.ts` 수정.
  - 실제 시계, 외부 저장소, 동시 호출 처리.
  - 저장소 문서에 없는 실제 연구실 관행 추가.

## 애매한 곳·가정
- 시각 진행에서 현재와 같은 시각 재진행은 허용한다 (가정: docs/reservations.md의 "여러 예약이 한 번에 만료돼도 이벤트 하나"와 맞춤)
- 새 예약 `expiresAt`의 유효 시각은 `Number.isSafeInteger`인 정수 Tick으로 본다 (가정: types.ts의 Tick 정의)
- 운송 시작 시 목적 용기 용량은 시료의 남은 양 이상이어야 한다 (가정: E1.3 불변식을 도착 후에도 지키기 위함, 문서에 명시 없음)
- 보관 등급 값이 세 등급 밖이면 `INVALID_INPUT`으로 본다 (가정). 세 등급 안이지만 용기가 지원하지 않으면 `STORAGE_INCOMPATIBLE`
- 분취 자식의 등급은 부모 등급을 그대로 상속한다 (가정: docs/storage.md와 samples.ts 정책 주석을 따르고 임시값 AMBIENT를 제거)
- 격리 중 운송 시작·도착·취소는 허용한다 (가정: docs/quality.md에 명시된 대로)
- 운송 중 예약 생성·취소·책임자 변경·격리·시각 진행은 허용한다 (가정: docs/transit.md에 명시된 대로)

## Acceptance
- [x] `quarantine`·`release`: ACTIVE 시료의 격리 여부 설정, 같은 상태도 성공, 비ACTIVE는 `NOT_ACTIVE`
- [x] 격리 시료의 분취·새 예약·예약 소비는 `QUARANTINED`, 격리는 예약·취소·이동·폐기·책임자 변경·운송을 막지 않음
- [x] 받기·분취 자식·이동·운송 시작의 목적 용기가 요구 등급을 지원하지 않으면 `STORAGE_INCOMPATIBLE`, 등급 값이 잘못되면 `INVALID_INPUT`
- [x] `advanceTime`: 현재 이상의 유효 시각만 받고 과거는 `INVALID_INPUT`, `expiresAt <= now` ACTIVE 예약을 `EXPIRED`로 바꾸고 예약 양을 풀며 남은 양·소비·폐기는 그대로
- [x] 새 예약 `expiresAt`은 `null` 또는 현재보다 큰 유효 시각만 허용
- [x] `startTransit`·`confirmArrival`·`cancelTransit`이 docs/transit.md 상태·점유 규칙을 따르고, 운송 중 분취·소비·폐기·직접 이동·추가 운송은 `IN_TRANSIT`
- [x] 끝난 운송의 ID 재사용은 `ID_TAKEN`, 없는 운송은 `UNKNOWN_TRANSIT`, 끝난 운송에 새 이벤트로 도착·취소하면 `TRANSIT_CLOSED`
- [x] 실패한 명령은 상태·이력·eventId를 바꾸지 않고, 같은 eventId 재전송은 처음 Receipt를 돌려줌 (engine.md E5·E6)
- [x] `pnpm check` PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md) · 원문: [request.md](request.md)
