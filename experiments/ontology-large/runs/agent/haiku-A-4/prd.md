# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** 시료 보관 엔진(`src/lab/`)에는 받기·분취·예약·폐기·이동이 있지만 격리, 보관 등급 적합성, 예약 만료, 운송 기능이 빠져 있다. 공개 계약(`src/lab/types.ts`)의 새 필드와 메서드는 선언만 되어 있고 구현이 `throw`로 막혀 있다.
- **목표:**
  - 기존 기능의 동작과 공개 계약을 그대로 유지한다.
  - 격리(`quarantine`·`release`)를 구현하고 분취·새 예약·소비를 막는다.
  - 보관 등급 적합성을 받기·분취·이동·운송 목적지에 적용한다.
  - 논리 시각(`advanceTime`)과 예약 만료를 구현한다.
  - 운송(`startTransit`·`confirmArrival`·`cancelTransit`)을 구현하고 운송 중 명령을 막는다.
- **비목표:**
  - `src/lab/types.ts` 수정.
  - 실제 시계, 외부 저장소, 동시 호출 처리.
  - 문서에 없는 연구실 관행 추가.
  - 예약 부분 소비.

## 애매한 곳·가정
- 받기의 `storageGrade`가 `AMBIENT`·`CHILLED`·`FROZEN`이 아니면 `INVALID_INPUT`으로 거절한다 (가정)
- 예약의 `expiresAt`이 정수 시각이 아니거나 범위(0 이상 최대 정수)를 벗어나면 `INVALID_INPUT`으로 거절한다 (가정)
- 여러 규칙을 동시에 어기는 호출은 검사 순서대로 첫 오류 코드를 돌려준다. 순서는 sdd.md의 검사 순서를 따른다 (가정)
- 격리된 시료의 예약 취소는 허용한다. 문서(quality.md)가 취소를 막지 않는다고 명시하므로 확인된 규칙이다 (가정)
- `advanceTime`에 현재와 같은 시각을 주면 성공하고 이벤트를 하나 남긴다 (가정)

## Acceptance
- [x] 격리: `quarantine`·`release`가 ACTIVE 시료의 격리 여부를 설정하고(이미 같은 값이어도 성공), 격리된 시료의 분취·새 예약·예약 소비를 `QUARANTINED`로 거절한다
- [x] 격리는 기존 예약·취소·이동·폐기·책임자 변경·운송을 막지 않는다
- [x] 보관 등급: 받기·분취 자식·이동·운송 목적지에서 용기 지원 목록에 시료 요구 등급이 정확히 있어야 하며, 없으면 `STORAGE_INCOMPATIBLE`
- [x] 분취 자식은 부모의 보관 등급을 상속한다 (기존 임시값 `AMBIENT` 제거)
- [x] 논리 시각: `advanceTime`은 현재 이상의 정수 시각만 받고, 과거는 `INVALID_INPUT`
- [x] 예약 만료: 새 예약의 `expiresAt`은 `null` 또는 현재보다 미래인 정수 시각만 허용
- [x] `expiresAt <= now`인 ACTIVE 예약은 `EXPIRED`가 되고 예약 양만 풀리며, 남은 양·소비량·폐기량은 바뀌지 않는다
- [x] 운송: `startTransit`은 ACTIVE 시료를 고유 운송 ID로 시작하고 목적 용기를 확보한다. 도착 확정은 시료를 목적 용기로 옮기고, 취소는 출발 용기에 둔다. 둘 다 목적 확보를 푼다
- [x] 운송 중에는 분취·소비·폐기·직접 이동·추가 운송 시작을 `IN_TRANSIT`으로 거절한다
- [x] 끝난 운송은 ID를 남기며, 운송 ID 재사용은 `ID_TAKEN`, 없는 운송은 `UNKNOWN_TRANSIT`, 끝난 운송에 도착·취소는 `TRANSIT_CLOSED`
- [x] 실패한 명령은 상태·이력·eventId를 바꾸지 않는다 (engine.md E5·E6)
- [x] 단위 테스트(`src/lab/lab.test.ts`)가 위 규칙을 검증하고 `pnpm check`가 PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md) · 원문: [request.md](request.md)
