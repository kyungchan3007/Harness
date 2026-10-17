# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 시료 보관 엔진에 격리·보관 등급·예약 만료·운송이 미연결(미구현 throw, 임시값)이다.
- **목표:** 기존 기능을 유지하며 docs/ 정책 문서 5개와 `types.ts` 계약대로 새 기능을 구현한다.
- **비목표:** `types.ts` 수정, 문서에 없는 연구실 관행 추가, 실제 시계·동시성.

## 애매한 곳·가정
- 분취 자식의 보관 등급 — 부모 등급 상속, 자식 용기도 그 등급을 지원해야 함 (확인됨: samples.ts 정책 주석)
- 알 수 없는 보관 등급 값 — `INVALID_INPUT` (가정)
- 운송 도착 시 용량 — 시작 시점에 목적 용기 용량 검사, 이후 양은 늘지 않으므로 재검사 불필요 (가정)
- 만료 시각이 현재와 같은 예약 신규 생성 — 현재보다 미래만 허용(`INVALID_INPUT`) (확인됨: 요청 원문)
- `advanceTime(to === now)` — 유효하며 이벤트를 남김 (가정: "현재 이상")

## Acceptance
- [x] quarantine/release 구현, 격리 시 분취·예약·소비 `QUARANTINED`
- [x] 받기·분취·이동·운송 목적지의 보관 등급 검사, 분취 자식 등급 상속
- [x] advanceTime, 예약 expiresAt 검증, 만료 처리(예약 양만 해제)
- [x] startTransit/confirmArrival/cancelTransit, 운송 중 `IN_TRANSIT` 차단, 용기 배타 확보
- [x] 단위 테스트 및 `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
