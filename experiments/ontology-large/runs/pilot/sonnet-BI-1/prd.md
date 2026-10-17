# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 기존 기능은 동작하지만 격리·보관 등급·예약 만료·운송 명령이 미구현(throw)이거나 연결 전 임시값이다.
- **목표:** `quarantine`·`release`·`advanceTime`·`startTransit`·`confirmArrival`·`cancelTransit` 구현, 보관 등급을 받기·분취·이동·운송에 연결, 격리·운송 중 제한을 기존 명령에 적용. 기존 재전송(E5)·원자성(E6) 규칙 유지.
- **비목표:** `src/lab/types.ts` 수정, 문서에 없는 실제 연구실 관행 추가, 실제 시계·저장소·동시성.

## 애매한 곳·가정
- `receive`의 `storageGrade`가 세 값이 아니면 무엇을 돌려주나 — `INVALID_INPUT` (가정: ontology의 "등급 값(INVALID_INPUT)"을 따름)
- 유효 시각의 범위 — types.ts의 `Tick`대로 0 이상 `Number.MAX_SAFE_INTEGER` 이하 정수, `advanceTime`의 `to`와 `expiresAt` 모두 (가정)
- `to`가 `now`와 같으면 — 성공하고 이벤트 하나 기록 (가정: "현재 이상"이 허용 범위)
- `expiresAt`이 `now`와 같거나 과거면 — `INVALID_INPUT` (가정: 요청의 "현재보다 미래")
- 분취 자식 등급 — 부모 등급 상속, 자식 용기가 그 등급을 지원해야 함 (가정: samples.ts 정책 주석·storage.md 해석)
- 운송 중 `reserve`·`cancel`·`transferCustody`·격리·해제·`advanceTime` — 허용, 각 명령의 다른 제한은 그대로 (가정: transit.md 해석)
- 운송 시작 시 용량 — 목적 용기 용량 < 남은 양이면 `CAPACITY_EXCEEDED` (가정: engine.md E1.3·ontology I3에서 도출, 운송 용량 문구는 문서에 없음)
- 여러 규칙을 동시에 어기는 호출의 코드 — 아무 것이나 허용 (가정: engine.md E6.4)

## Acceptance
- [x] quarantine·release: ACTIVE만, 같은 값 재설정도 성공, 기존 예약 불변, 끝난 시료는 NOT_ACTIVE
- [x] 격리 시 split·reserve·consume은 QUARANTINED, cancel·move·discard·transferCustody·운송은 허용
- [x] receive·split·move·startTransit이 지원 등급 정확 일치로 STORAGE_INCOMPATIBLE 판정, 자식은 부모 등급 상속
- [x] advanceTime: 과거·비정수·범위 밖 INVALID_INPUT, expiresAt ≤ now ACTIVE 예약 모두 EXPIRED(이벤트 하나), 양만 풀림
- [x] reserve의 expiresAt 검증(null 또는 now 초과 유효 정수)
- [x] startTransit/confirmArrival/cancelTransit: 점유·확보·ID_TAKEN·UNKNOWN_TRANSIT·TRANSIT_CLOSED·재전송 규칙
- [x] 운송 중 split·consume·discard·move·startTransit은 IN_TRANSIT, 실패 시 상태·이력 불변
- [x] `pnpm check` PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
