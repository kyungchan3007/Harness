# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/` 엔진에 격리·보관 등급·예약 만료·운송이 연결되지 않아 새 필드와 메서드가 미완성(throw / 임시값)이다.
- **목표:** 기존 기능을 유지한 채 4가지 기능을 `docs/`의 다섯 정책 문서와 `types.ts` 계약대로 구현한다.
- **비목표:** `types.ts` 수정, 문서에 없는 연구실 관행 추가, 실제 시계·외부 저장소·동시성.

## 애매한 곳·가정
- 분취 자식의 보관 등급 — `samples.ts` 정책 주석대로 부모 등급 상속 (확인됨: samples.ts 정책 주석)
- `receive`의 `storageGrade`가 세 값이 아닐 때 — `INVALID_INPUT (가정)`
- 운송 목적지가 출발 용기와 같을 때 — 출발 용기는 점유 중이므로 `CONTAINER_OCCUPIED (가정)`
- `advanceTime(to)`가 현재와 같을 때 — 성공, 이벤트 하나만 남김 (가정, 요청의 "현재 이상")
- 정수 아님·음수·MAX_SAFE_INTEGER 초과 시각 — `INVALID_INPUT (가정, types.ts Tick 정의)`

## Acceptance
- [x] 격리: quarantine/release 멱등 성공, 분취·새 예약·소비는 QUARANTINED, 취소·이동·폐기·책임자 변경·운송은 허용, 기존 예약 불변
- [x] 보관 등급: receive·split·move·startTransit 목적 용기 정확 일치 검사(STORAGE_INCOMPATIBLE), 자식은 부모 등급 상속
- [x] 예약 만료: advanceTime 절대 시각, 과거는 INVALID_INPUT, expiresAt <= now 예약 EXPIRED(양만 해제), 새 예약 expiresAt 검증
- [x] 운송: start/confirm/cancel, 목적 용기 배타 확보, 운송 중 금지 명령 IN_TRANSIT, 끝난 운송 ID_TAKEN/TRANSIT_CLOSED
- [x] 재전송·원자성·이력 규칙이 새 명령에도 적용, `pnpm check` PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
