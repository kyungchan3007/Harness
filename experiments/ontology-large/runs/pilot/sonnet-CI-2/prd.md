# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 시료 보관 엔진에 `quarantine`·`release`·`advanceTime`·`startTransit`·`confirmArrival`·`cancelTransit`이 미구현이고, 보관 등급(`storageGrade`)이 받기·분취·이동에 연결돼 있지 않다(분취 자식 등급은 임시값 `AMBIENT`).
- **목표:** 요청의 격리·보관 등급·예약 만료·운송을 `docs/`의 정책 문서 다섯 개와 구현 주석의 계약대로 구현한다. 기존 기능·재전송(E5)·원자성·이력(E6) 규칙을 새 명령에도 적용한다.
- **비목표:** `src/lab/types.ts` 수정, 문서에 없는 실무 관행 추가, 실제 시계·외부 저장소·동시 호출.

## 애매한 곳·가정
- 분취 자식의 보관 등급 — 부모 등급 상속, 자식 용기는 그 등급을 지원해야 함 (가정 아님, `samples.ts` 주석·storage.md 확정. 구현 때 임시값 제거)
- 운송 목적 용기 확보의 표현 — 용기 점유 맵(`occupied`)에 목적 용기를 올려 `isFree` 한 곳으로 받기·분취·이동·운송 목적지를 막음 (가정: 구현 선택이며 공개 계약에 영향 없음)
- 받기의 `storageGrade`가 세 값이 아닐 때 — `INVALID_INPUT` (가정: ontology의 "등급 값(INVALID_INPUT)")
- `advanceTime(to)`에서 `to`가 현재와 같을 때 — 성공하고 이벤트 하나 (가정: "현재 이상"이므로 같은 값 허용)
- `expiresAt`이 비정수·`MAX_SAFE_INTEGER` 초과·undefined일 때 — `INVALID_INPUT` (가정: types.ts의 `Tick` 정의)
- 규칙을 여러 개 어긴 호출의 오류 코드 — 어느 것이든 허용 (가정: engine.md E6.4 그대로 적용)
- 운송 시작 때 목적 용기 용량 — 남은 양이 용량 이하여야 하고 넘으면 `CAPACITY_EXCEEDED` (가정: engine.md E1.3, 운송 중 양이 안 바뀌어 도착 때 재검사 불필요)

## Acceptance
- [x] `quarantine`·`release`: ACTIVE 시료만, 같은 값도 성공, 예약은 그대로
- [x] 격리된 시료의 분취·새 예약·소비는 `QUARANTINED`, 취소·이동·폐기·책임자 변경·운송은 허용
- [x] 받기·분취(자식 등급=부모 등급)·이동·운송 시작에서 목적 용기 등급 불일치는 `STORAGE_INCOMPATIBLE`
- [x] `advanceTime`: 과거·비정수 `INVALID_INPUT`, `expiresAt <= now` ACTIVE 예약 모두 `EXPIRED`(이벤트 하나), 남은 양·소비·폐기 불변
- [x] `reserve`의 `expiresAt`은 null 또는 now 초과 유효 정수
- [x] 운송: 시작·도착·취소, 목적 용기 배타 확보, 운송 중 분취·소비·폐기·이동·추가 운송은 `IN_TRANSIT`, 끝난 운송 ID 재사용 `ID_TAKEN`, 끝난 운송 조작 `TRANSIT_CLOSED`
- [x] 실패 시 상태·이력 불변, 재전송·`EVENT_CONFLICT` 동작
- [x] `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
