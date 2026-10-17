# 0040 — 시료 보관 엔진 확장 — PRD

- **이슈:** #1
- **문제:** `src/lab/`에 격리·보관 등급·예약 만료·운송이 미연결(미구현 throw, 임시 등급)이다.
- **목표:** 기존 기능을 유지하며 격리, 보관 적합성, `advanceTime` 만료, 운송 3종을 `docs/` 정책대로 구현한다.
- **비목표:** `types.ts` 수정, 문서에 없는 연구실 관행 추가.

## 애매한 곳·가정
- 분취 자식 등급 — 부모 등급 상속 (`samples.ts` 정책 주석에 명시) (확인됨: 코드 정책 주석)
- `advanceTime(to == now)` — 허용, 이벤트 1개 기록 (확인됨: 요청 "현재 이상")
- 만료 경계 — `expiresAt <= now`면 만료 (확인됨: reservations.md)
- 운송 중 `reserve`/`cancel`/`transferCustody`/격리 — 허용 (확인됨: transit.md)
- 여러 규칙 위반 시 코드 선택 — 자유 (확인됨: engine.md E6-4)
- 유효하지 않은 `storageGrade` — `INVALID_INPUT` (가정)

## Acceptance
- [x] quarantine/release 구현, 격리 시 split·reserve·consume은 QUARANTINED
- [x] 받기·분취·이동·운송 목적지 등급 적합성(STORAGE_INCOMPATIBLE)
- [x] advanceTime·reserve 만료 시각 검증, 만료 처리
- [x] startTransit/confirmArrival/cancelTransit, 운송 중 금지 명령 IN_TRANSIT
- [x] 단위 테스트와 게이트 통과

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
