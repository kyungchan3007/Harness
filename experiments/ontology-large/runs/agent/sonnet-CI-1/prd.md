# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 엔진에 격리·보관 등급·예약 만료(논리 시각)·운송이 연결돼 있지 않다. 새 필드(`storageGrade`·`quarantined`)와 새 메서드(`quarantine`·`release`·`advanceTime`·`startTransit`·`confirmArrival`·`cancelTransit`)가 미구현이거나 임시값이다.
- **목표:** 기존 기능을 유지한 채 네 기능을 `docs/`의 정책 문서 다섯 개와 코드 정책 주석대로 구현한다. 재전송(E5)·원자성(E6)·이력 규칙을 새 명령에도 적용한다.
- **비목표:** `src/lab/types.ts` 수정, 문서에 없는 연구실 관행 추가, 실제 시계·외부 저장소·동시 호출.

## 애매한 곳·가정
- 분취 자식의 보관 등급 — `samples.ts` 정책 주석대로 부모 등급을 상속, 호출자 지정 없음 (가정)
- 운송 목적 용기 확보의 구현 방식 — 용기 점유 표와 분리한 확보 표를 두고 `Storage.isFree`가 둘 다 본다 (가정)
- 운송 용량 검사 — 이동과 같이 시료의 남은 양(예약 제외)이 목적 용기 용량 이하여야 한다 (가정)
- 유효하지 않은 보관 등급 값 / 유효하지 않은 시각 — `INVALID_INPUT` (가정)
- `advanceTime`에 현재와 같은 시각 — 성공하고 이벤트를 남긴다. 현재 이상이면 유효하다는 요청 문구 기준 (가정)
- 격리·운송 중 검사 순서 — 규칙을 여러 개 어기면 어느 코드를 줘도 된다는 E6.4 기준으로 임의 순서 (가정)

## Acceptance
- [x] 격리: `quarantine`·`release`(같은 값도 성공), 격리 시 분취·새 예약·소비는 `QUARANTINED`, 예약은 건드리지 않음
- [x] 보관 등급: 받기·분취·이동·운송 목적지에서 `STORAGE_INCOMPATIBLE`, 정확 일치만, 자식은 부모 등급 상속
- [x] 예약 만료: `advanceTime` 절대 시각, 과거 `INVALID_INPUT`, `expiresAt <= now` 경계 포함 만료, 새 예약 `expiresAt` 검증, 이벤트 하나
- [x] 운송: 시작·도착·취소, 목적 용기 배타 확보, 운송 중 금지 명령 `IN_TRANSIT`, 끝난 운송 `TRANSIT_CLOSED`·ID 재사용 `ID_TAKEN`
- [x] 재전송·원자성·이력이 새 명령에도 적용되고 `pnpm check`가 PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
