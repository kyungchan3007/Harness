# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 시료 보관 엔진에 격리·보관 등급·예약 만료·운송이 연결되지 않았다(`quarantine`·`release`·`advanceTime`·운송 3종은 미구현, 분취 자식 등급은 임시값, 용기 적합성 검사는 어디에도 쓰이지 않음).
- **목표:** `docs/`의 정책 문서 5개와 `types.ts` 계약대로 새 기능을 구현하고 기존 기능·재전송·원자성·이력 규칙을 유지한다.
- **비목표:** `types.ts` 수정, 실제 시계·저장소·동시성, 문서에 없는 실무 관행 추가.

## 애매한 곳·가정
- `advanceTime`의 `to`가 현재와 같으면 — 성공(이벤트 기록, 만료 판정 수행) (가정: 요청 문구 "현재 이상"에서 도출)
- "유효 시각" — 0 이상 MAX_SAFE_INTEGER 이하 정수(`Tick` 정의). `expiresAt`은 `null`이거나 `now`보다 큰 값 (가정: `expiresAt == now`는 즉시 만료이므로 "미래"가 아니라 거절)
- `receive`의 `storageGrade`가 세 값이 아니면 `INVALID_INPUT` (가정: 타입 계약 위반)
- 분취 자식 등급 — 부모 등급 상속, 자식 용기가 지원하지 않으면 `STORAGE_INCOMPATIBLE` (가정: `samples.ts` 정책 주석·storage.md에서 도출)
- 운송 시작 검사 — 시료 ACTIVE, 운송 ID 중복, 이미 운송 중(`IN_TRANSIT`), 목적 용기 존재·비어 있음(확보 포함)·용량·등급. 격리·예약은 막지 않음 (가정: transit.md·quality.md에서 도출)
- 운송 중 `consume`/`split`/`discard`/`move`는 `IN_TRANSIT`, 새 예약·예약 취소·책임자 변경·격리/해제·시각 진행은 허용 (가정: transit.md에서 도출)
- 여러 규칙을 동시에 어기면 코드는 아무 것이나 가능 (가정: engine.md E6-4)

## Acceptance
- [x] `quarantine`·`release`: ACTIVE 시료만, 같은 값이어도 성공, 격리 시 분취·새 예약·소비는 `QUARANTINED`, 기존 예약 불변
- [x] 받기·분취·이동·운송 목적지가 요구 등급을 정확히 지원하지 않으면 `STORAGE_INCOMPATIBLE`, 분취 자식은 부모 등급 상속, 등급 불변
- [x] `advanceTime`: 과거·비정수·범위 밖 `to`는 `INVALID_INPUT`, 만료는 `expiresAt <= now`, 한 이벤트로 여러 예약 만료, 양·소비·폐기 불변
- [x] `reserve`의 `expiresAt` 검증(`null` 또는 now보다 미래)
- [x] 운송: 시작·도착·취소, 용기 배타 확보, 운송 중 금지 명령 `IN_TRANSIT`, 끝난 운송 `TRANSIT_CLOSED`·ID 재사용 `ID_TAKEN`·없는 운송 `UNKNOWN_TRANSIT`
- [x] 새 명령도 재전송(E5)·원자성·이력(E6) 규칙을 따름
- [x] `pnpm check` PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
