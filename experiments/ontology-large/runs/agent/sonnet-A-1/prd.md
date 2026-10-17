# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 기존 엔진에 확장 계약(`types.ts`)의 새 필드·메서드(격리, 보관 등급, 논리 시각·예약 만료, 운송)가 연결돼 있지 않다.
- **목표:** `docs/`의 정책 다섯 문서와 구현 모듈의 정책 주석대로 새 기능을 구현하고, 기존 기능·재전송(E5)·원자성·이력(E6)을 유지한다.
- **비목표:** `types.ts` 수정, 실제 시계·외부 저장소·동시 호출, 문서에 없는 연구실 관행 추가.

## 애매한 곳·가정
- 받기의 `storageGrade`가 세 값이 아닐 때 — `INVALID_INPUT` (가정)
- `advanceTime`의 `to`가 정수가 아니거나 범위(0~MAX_SAFE_INTEGER) 밖일 때 — `INVALID_INPUT` (가정, types.ts Tick 정의)
- `reserve`의 `expiresAt`이 `undefined`·비정수일 때 — `INVALID_INPUT` (가정)
- 분취 자식 등급 — samples.ts 정책 주석대로 부모 등급 상속 (확인됨: 주석)
- 시료가 용기 용량을 넘는 운송 — `CAPACITY_EXCEEDED` (가정, E1.3)
- 운송 ID는 시료·예약 ID와 별도 이름공간 (확인됨: engine E1.4 "종류마다 따로")

## Acceptance
- [x] quarantine·release: ACTIVE 시료만, 멱등 성공, 예약 불변 (quality.md)
- [x] 격리 시 분취·새 예약·소비는 QUARANTINED, 취소·이동·폐기·책임자 변경·운송은 허용
- [x] 받기·분취·이동·운송 목적지의 등급 적합성(STORAGE_INCOMPATIBLE), 분취 자식 등급 상속
- [x] advanceTime 절대 시각·과거는 INVALID_INPUT, expiresAt <= now 예약 EXPIRED(이벤트 하나)
- [x] reserve의 expiresAt 검증
- [x] startTransit·confirmArrival·cancelTransit, 용기 확보·IN_TRANSIT 거절·ID_TAKEN·UNKNOWN_TRANSIT·TRANSIT_CLOSED
- [x] `pnpm check` PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
