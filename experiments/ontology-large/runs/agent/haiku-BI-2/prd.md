# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** 시료 보관 엔진(`src/lab/`)에 격리·보관 등급·예약 만료·운송 명령이 미구현(스텁)이고, 분취 자식 등급·용기 등급 검사가 임시값(TODO)이다.
- **목표:**
  1. `quarantine`·`release`로 ACTIVE 시료의 격리 여부를 설정한다. 격리 시 분취·새 예약·예약 소비를 `QUARANTINED`로 거절한다.
  2. 받기·분취·이동·운송 목적지에서 시료의 요구 등급과 용기 지원 등급을 정확 일치로 검사한다(`STORAGE_INCOMPATIBLE`). 분취 자식은 부모 등급을 상속한다.
  3. `advanceTime`으로 논리 시각을 진행하고, 만료 시각(`expiresAt`)이 지난 ACTIVE 예약을 `EXPIRED`로 바꿔 예약 양만 푼다.
  4. `startTransit`·`confirmArrival`·`cancelTransit`으로 운송을 한다. 운송 중에는 분취·소비·폐기·직접 이동·추가 운송을 `IN_TRANSIT`으로 거절한다.
- **비목표:** `src/lab/types.ts` 변경, 실제 시계·외부 저장소·동시 호출, 연구실 현장 관행(저장소에 없는 규칙) 추가, 부분 소비.

## 애매한 곳·가정
- 분취 자식의 격리 여부 — 항상 false로 시작 (가정: 부모가 격리면 분취 자체가 `QUARANTINED`로 막히므로 자식은 격리 상태를 물려받을 일이 없음)
- `advanceTime`의 `to`가 현재 시각과 같은 경우 — 성공하고 이벤트 하나를 남김 (가정: "현재 이상"이라는 문구대로 허용, 만료가 없어도 이벤트는 남김)
- `expiresAt`의 유효 범위 — `null` 또는 현재 시각보다 큰 0 이상 안전 정수 (가정: 0 이상 정수 규칙은 시각 전반의 규칙과 같게 적용)
- 등급 값 검사 위치 — 받기(`receive`)에서만 등급 이름 자체를 검사해 `INVALID_INPUT` (가정: 다른 명령은 이미 저장된 등급만 다루므로 추가 검사 없음)
- 여러 규칙을 동시에 어긴 호출의 오류 코드 — 구현 순서대로 첫 코드를 돌려줌 (가정: engine.md E6 4번이 허용하는 범위)

## Acceptance
- [x] `quarantine`·`release`: ACTIVE 시료만, 같은 값이어도 성공, 기존 예약 불변
- [x] 격리 시 분취·새 예약·예약 소비 `QUARANTINED`, 격리 중 예약 취소·이동·폐기·책임자 변경·운송은 허용
- [x] 받기·분취·이동·운송 목적지의 등급 정확 일치 검사, 분취 자식 등급 = 부모 등급
- [x] `advanceTime`: 과거 시각 `INVALID_INPUT`, `expiresAt <= now`인 ACTIVE 예약 `EXPIRED`, 실제 양 불변, 이벤트 하나
- [x] `reserve`의 `expiresAt` 검증(`null` 또는 현재보다 미래)
- [x] 운송 시작·도착·취소와 운송 중 금지 명령(`IN_TRANSIT`), 끝난 운송 `TRANSIT_CLOSED`, 운송 ID 재사용 `ID_TAKEN`
- [x] 모든 새 명령에 E5 재전송·E6 원자성·이력 규칙 적용 (단위 테스트)
- [x] `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md) · 원문: [request.md](request.md)
