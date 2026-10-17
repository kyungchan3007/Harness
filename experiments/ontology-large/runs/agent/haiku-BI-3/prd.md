# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`은 받기·분취·예약·소비·폐기·이동·책임자 변경만 지원한다. 격리, 보관 등급 적합성, 예약 만료, 운송은 공개 계약(`types.ts`)에만 있고 구현이 빠져 있다.
- **목표:**
  1. `quarantine`·`release`: ACTIVE 시료의 격리 여부 설정, 같은 값이어도 성공. 격리 중에는 분취·새 예약·예약 소비를 `QUARANTINED`로 거절.
  2. 보관 등급: 받기·분취 자식·이동·운송 목적지에서 용기 지원 목록에 시료 등급이 정확히 있어야 함, 아니면 `STORAGE_INCOMPATIBLE`. 분취 자식은 부모 등급을 상속.
  3. 예약 만료: `advanceTime`(절대 시각, 과거 불가), 만료 시각 `expiresAt <= now`인 ACTIVE 예약은 `EXPIRED`로 바뀌고 예약 양만 풀림.
  4. 운송: `startTransit`·`confirmArrival`·`cancelTransit`. 운송 중에는 분취·소비·폐기·이동·추가 운송을 `IN_TRANSIT`으로 거절. 목적 용기는 운송이 끝날 때까지 확보.
- **비목표:** 실제 시계·외부 저장소·동시 호출, `types.ts` 수정, 저장소에 없는 실험실 관행 추가.

## 애매한 곳·가정
- 격리와 운송 중 허용 명령 — `docs/quality.md`·`docs/transit.md` 기준 (확인됨: 격리는 취소·이동·폐기·책임자·운송을 막지 않음)
- 분취 자식의 격리 여부 — 새 시료이므로 `false`로 시작 (가정: 정책 문서에 상속 규정 없음)
- 여러 규칙을 어기는 호출의 오류 코드 — 구현 순서대로 첫 코드 (engine.md E6.4 허용) (가정: 어느 코드든 허용이라 구현 순서를 따름)

## Acceptance
- [x] 격리·해제: 같은 값 재설정 성공, 격리 중 분취·새 예약·소비 `QUARANTINED`, 예약·취소·폐기·이동은 허용
- [x] 보관 등급: 받기·분취·이동·운송 목적지에서 정확 일치 검사, 분취 자식 등급 상속, 잘못된 등급 값 `INVALID_INPUT`
- [x] 예약 만료: 과거 시각 `INVALID_INPUT`, 경계 포함 `EXPIRED`, 양만 풀림, 만료 뒤 취소 `RESERVATION_CLOSED`
- [x] 운송: 시작·도착·취소, 목적 확보 배타, 운송 중 금지 명령 `IN_TRANSIT`, 끝난 운송 `TRANSIT_CLOSED`·`ID_TAKEN`
- [x] 실패는 상태·이력·eventId를 바꾸지 않음 (원자성), 성공 재전송은 처음 Receipt
- [x] `pnpm check` 게이트 통과 (단위 테스트 `src/lab/lab.test.ts`)

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
