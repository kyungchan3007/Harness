# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 기존 기능은 유지한 채 새 필드·메서드(격리, 보관 등급, 만료, 운송)가 미연결/미구현이다.
- **목표:** `types.ts` 계약과 `docs/` 정책 5개를 따라 `quarantine`·`release`·`advanceTime`·`startTransit`·`confirmArrival`·`cancelTransit`을 구현하고, 받기·분취·이동에 보관 적합성을, 분취·예약·소비·폐기·이동에 격리/운송 제한을 연결한다.
- **비목표:** `types.ts` 수정, 저장소에 없는 실제 연구실 관행 추가, 동시 호출·실제 시계·외부 저장소.

## 애매한 곳·가정
- 분취 자식의 보관 등급 — 부모 등급 상속 (samples.ts 정책 주석, storage.md가 위임) (가정 아님: 문서 명시)
- `advanceTime`으로 현재와 같은 시각 — 성공, 이벤트 하나 기록 ("현재 이상" 요청문) (가정)
- 소비/폐기/분취 검사 순서 — 여러 규칙 위반 시 아무 코드나 허용(E6.4)이라 NOT_ACTIVE → QUARANTINED → IN_TRANSIT 순으로 정함 (가정)
- 받기의 `storageGrade`가 세 값이 아니면 — `INVALID_INPUT` (가정)
- 운송 시작 시 용량 초과 — `CAPACITY_EXCEEDED` (이동 규칙 E4 준용) (가정)

## Acceptance
- [x] 격리·해제: ACTIVE만, 멱등, 분취·새 예약·소비 `QUARANTINED`, 예약 불변, 그 외 명령은 막지 않음
- [x] 보관 적합성: 받기·분취·이동·운송 목적지, 정확히 일치만, 자식 등급 상속
- [x] 예약 만료: `expiresAt` 검증, `advanceTime` 절대 시각, `expiresAt <= now` 만료, 양만 해제
- [x] 운송: 배타적 확보, 도착/취소, 운송 중 금지 명령 `IN_TRANSIT`, 끝난 운송 기록 유지
- [x] 재전송·원자성·이력 규칙 유지 (모든 명령이 `engine.run`을 거침)
- [x] `pnpm check` PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
