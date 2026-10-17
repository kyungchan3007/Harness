# 0040 — 시료 보관 엔진 확장 (격리·보관 등급·예약 만료·운송) — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 격리·시각 진행·운송 명령이 미구현이고, 보관 등급·예약 만료 검증이 받기·분취·이동·예약에 연결돼 있지 않다.
- **목표:** `types.ts` 계약과 `docs/` 정책 다섯 문서대로 기존 기능을 유지한 채 새 기능을 구현한다.
- **비목표:** `types.ts` 수정, 문서에 없는 실제 연구실 관행 추가, 실제 시계·외부 저장소·동시 호출.

원문 기준: [request.md](request.md)

## 애매한 곳·가정
- 분취 자식의 보관 등급 — samples.ts 정책 주석대로 부모 등급 상속 (가정 아님, 코드 계약)
- 받기에서 잘못된 `storageGrade` 값 — engine.md/types의 등급 3종 밖이면 INVALID_INPUT (가정)
- 여러 규칙을 동시에 어기는 호출의 코드 — engine.md E6.4에 따라 무엇이든 허용, 검사 순서는 구현이 정함 (가정)
- `advanceTime`의 `to`가 현재와 같음 — "현재 이상"이므로 성공하고 이벤트 하나 기록 (가정)

## Acceptance
- [x] quarantine·release: ACTIVE 시료의 격리 설정, 같은 값도 성공, 예약은 건드리지 않음
- [x] 격리 시료의 분취·새 예약·소비는 QUARANTINED, 취소·이동·폐기·책임자 변경·운송은 막지 않음
- [x] 받기·분취·이동·운송 목적지에서 정확 일치 등급 검사(STORAGE_INCOMPATIBLE), 분취 자식은 부모 등급 상속
- [x] advanceTime: 현재 이상 유효 정수만, expiresAt <= now ACTIVE 예약 모두 EXPIRED, 이벤트 하나
- [x] reserve의 expiresAt는 null 또는 now보다 큰 유효 정수
- [x] 운송 시작·도착·취소, 목적 용기 배타 확보, 운송 중 IN_TRANSIT 금지, 끝난 운송 ID_TAKEN/TRANSIT_CLOSED
- [x] 재전송·원자성·이력 규칙이 새 명령에도 적용, 테스트 통과, `pnpm check` PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
