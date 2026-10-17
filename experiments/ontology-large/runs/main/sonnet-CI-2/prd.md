# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 엔진은 기존 기능(받기·분취·예약·소비·폐기·이동·책임자)만 동작한다. `quarantine`·`release`·`advanceTime`·`startTransit`·`confirmArrival`·`cancelTransit`은 미구현(throw)이고, 보관 등급은 어느 명령에도 연결되지 않았으며 분취 자식 등급은 임시값 `AMBIENT`다.
- **목표:** 공개 계약(`types.ts`)과 정책 문서 5개(`engine/quality/storage/reservations/transit.md`)·모듈 정책 주석대로 격리, 보관 등급 적합성, 예약 만료(논리 시각), 운송을 구현한다. 재전송(E5)·원자성(E6)·이력 규칙이 새 명령에도 적용된다.
- **비목표:** `types.ts` 수정, 문서에 없는 연구실 관행 추가, 실제 시계·외부 저장소·동시 호출, 부분 소비.

## 애매한 곳·가정
- 분취 자식의 보관 등급 — 부모 등급 상속, 자식 용기도 그 등급을 지원해야 함. 근거: `samples.ts` 정책 주석·storage.md (문서에 명시, 가정 아님).
- `receive`의 `storageGrade`가 세 값이 아닐 때 — `INVALID_INPUT` (가정: ontology.json receive.requires에 "등급 값(INVALID_INPUT)"으로 적힘).
- `reserve`의 `expiresAt` 형식 — `null` 또는 `now`보다 큰 안전 정수(Tick 범위)만 허용, 아니면 `INVALID_INPUT` (가정: Tick 정의를 유효 시각의 기준으로 씀).
- `advanceTime(to)`가 현재와 같을 때 — 성공, 이벤트 1개 남김, 만료 판정 수행 (가정: 요청의 "현재 이상").
- 운송 목적 용기 확보 구현 — 내부 `occupied` 맵에 목적 용기를 운송 시료로 등록해 `isFree`가 그대로 막게 함 (가정: 구현 방식 선택, 정책은 storage.ts 주석).
- 규칙이 여러 개 어긋난 호출의 오류 코드 — 검사 순서는 SDD에 기록 (가정: engine.md E6.4가 어느 코드든 허용).
## Acceptance
- [x] 격리: `quarantine`·`release`는 ACTIVE 시료에 동작, 같은 값 재설정도 성공, 기존 예약은 그대로
- [x] 격리 시 분취·새 예약·소비는 `QUARANTINED`, 취소·이동·폐기·책임자 변경·운송은 막지 않음
- [x] 보관 등급: 받기·분취 자식·이동·운송 목적지가 요구 등급 미지원이면 `STORAGE_INCOMPATIBLE`(정확 일치만), 자식은 부모 등급 상속
- [x] 예약 만료: `advanceTime`은 현재 이상 유효 정수만(과거·비정수 `INVALID_INPUT`), `expiresAt <= now`인 ACTIVE 예약을 `EXPIRED`로 하고 예약 양만 풀며 이벤트 1개
- [x] `reserve`의 `expiresAt`는 `null` 또는 현재보다 큰 유효 정수, 아니면 `INVALID_INPUT`
- [x] 운송: 시작·도착·취소와 상태·점유·확보 규칙, 끝난 운송 ID 재사용 `ID_TAKEN`·`UNKNOWN_TRANSIT`·`TRANSIT_CLOSED`
- [x] 운송 중 분취·소비·폐기·이동·추가 운송은 `IN_TRANSIT`, 예약·취소·책임자 변경·격리·시각 진행은 허용
- [x] 새 명령도 재전송·`EVENT_CONFLICT`·실패 시 무변경·이력 args 규칙을 따름
- [x] `pnpm check` PASS (온톨로지 검사 `pnpm onto:check` 포함)

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
