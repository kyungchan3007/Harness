# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 시료 보관 엔진은 받기·분취·예약·소비·폐기·이동만 한다. 격리, 보관 등급 적합성, 예약 만료(논리 시각), 운송 명령은 공개 계약(`types.ts`)에만 있고 구현이 미완성이다(`throw`).
- **목표:**
  1. `quarantine`·`release`: ACTIVE 시료의 격리 여부 설정(같은 값이어도 성공). 격리 중에는 분취·새 예약·예약 소비를 `QUARANTINED`로 거절.
  2. 보관 등급: 받기·분취 자식·이동·운송 목적지가 시료 요구 등급을 지원하지 않으면 `STORAGE_INCOMPATIBLE`. 분취 자식은 부모 등급을 상속.
  3. 논리 시각: `advanceTime(eventId, to)`로 절대 시각 진행. `expiresAt <= now`인 ACTIVE 예약은 `EXPIRED`가 되고 예약 양만 풀림. 새 예약의 `expiresAt`은 null 또는 현재보다 큰 정수.
  4. 운송: `startTransit`·`confirmArrival`·`cancelTransit`. 운송 중에는 분취·소비·폐기·직접 이동·추가 운송을 `IN_TRANSIT`으로 거절. 목적 용기는 운송이 끝날 때까지 배타적으로 확보.
  5. 기존 재전송(E5)·원자성(E6)·이력 규칙을 새 명령에도 그대로 적용.
- **비목표:** 실제 시계·외부 저장소·동시 호출, `types.ts` 수정, 저장소에 없는 실제 연구실 관행 추가, 공개 계약의 필드·메서드 변경.

## 애매한 곳·가정
- 검사 순서 — 각 명령의 전제 목록 순서를 따름 (가정: `docs/`·`agents/context/ontology.md` 표의 순서가 기준). 여러 규칙을 어기면 어느 코드를 내도 됨(engine.md E6-4).
- 격리 중 예약 취소·운송 시작 — 막지 않음 (가정: quality.md "격리는 다음 명령을 막지 않음" 목록을 따름).
- 운송 중 새 예약·책임자 변경 — 허용 (가정: transit.md "허용" 목록을 따름).
- 분취 자식의 등급 — 부모 등급 상속, 호출자가 지정하지 않음 (가정: `samples.ts` 정책 주석을 따름).
- `advanceTime`의 `to`가 현재와 같은 경우 — 성공하고 이벤트 하나를 남김 (가정: "현재 이상"이라는 요청 문구).
- 운송 목적 확보 저장 방식 — 출발 용기 점유(`occupied`)와 분리된 별도 맵 (가정: 두 점유를 같은 맵에 섞으면 시료 이동·종료 처리가 얽힘).
- 새 오류 코드 — `types.ts`의 `ErrorCode`에 이미 있으므로 추가 없음 (가정: 공개 계약이 이미 필요한 코드를 모두 담고 있음).

## Acceptance
- [x] `quarantine`·`release`: ACTIVE만, 같은 값 재설정도 성공, 기존 예약 상태·양·만료 불변
- [x] 격리 시료의 분취·새 예약·예약 소비 → `QUARANTINED`, 예약 취소·이동·폐기·운송은 막지 않음
- [x] 받기·분취 자식·이동·운송 목적지의 보관 등급 적합성 검사 → `STORAGE_INCOMPATIBLE`, 분취 자식은 부모 등급 상속
- [x] `advanceTime`: 과거 시각·비정수 `INVALID_INPUT`, 만료 경계 포함 `EXPIRED`, 예약 양만 풀림, 이벤트 하나
- [x] `reserve`의 `expiresAt` 검증(null 또는 now보다 큰 정수)
- [x] `startTransit`·`confirmArrival`·`cancelTransit` 전 상태 전이와 오류 코드, 목적 용기 배타 확보
- [x] 운송 중 분취·소비·폐기·직접 이동·추가 운송 → `IN_TRANSIT`
- [x] 실패 시 상태·이력·eventId 무변화, 같은 eventId 재전송은 처음 Receipt
- [x] `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
