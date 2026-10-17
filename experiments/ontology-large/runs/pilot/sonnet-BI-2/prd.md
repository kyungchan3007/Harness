# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 엔진은 기존 기능만 동작한다. 공개 계약(`types.ts`)에 있는 격리·보관 등급·예약 만료·운송은 미구현(throw)이거나 임시값(분취 자식 등급 `AMBIENT`)이다.
- **목표:** `docs/`의 정책 문서 다섯 개·`types.ts`·모듈 정책 주석을 따라 새 기능을 구현하고, 기존 재전송(E5)·원자성(E6)·이력 규칙을 새 명령에도 적용한다.
- **비목표:** `types.ts` 수정, 저장소에 적히지 않은 연구실 관행 추가, 실제 시계·외부 저장소·동시 호출.

## 애매한 곳·가정
- 받기 `storageGrade`가 세 값이 아닐 때 — `INVALID_INPUT` (가정: ErrorCode 구성상 가장 가까운 코드)
- `advanceTime`의 `to`가 정수가 아니거나 `MAX_SAFE_INTEGER` 초과 — `INVALID_INPUT` (가정: types.ts Tick 정의)
- `to`가 now와 같은 경우 — 성공하고 이벤트 하나 기록 (가정: 요청의 "현재 이상")
- 운송 도착 시 목적 용기 용량 — 시작 때 검사한 용량 유지, 도착에서 재검사 없음 (가정: 운송 중 양이 늘 수 없음)
- 운송 시작에서 목적 용기가 출발 용기와 같음 — `CONTAINER_OCCUPIED` (가정: 시료가 이미 점유 중)
- 분취 자식의 등급 — 부모 등급 상속 (가정: samples.ts 주석·storage.md가 이미 정함)
- 여러 규칙을 동시에 어기는 호출의 코드 — 아무거나 허용 (가정: engine.md E6.4)
## Acceptance
- [x] quarantine·release: ACTIVE만, 같은 값도 성공, 예약 그대로, 끝난 시료는 NOT_ACTIVE
- [x] 격리 시 split·reserve·consume은 QUARANTINED, cancel·move·discard·transferCustody·운송은 허용
- [x] receive·split(자식 용기, 부모 등급 상속)·move·startTransit이 등급 불일치면 STORAGE_INCOMPATIBLE (정확 일치만)
- [x] advanceTime: 과거·비정수 INVALID_INPUT, expiresAt ≤ now ACTIVE 예약 모두 EXPIRED, 이벤트 하나, 양·격리·용기 불변
- [x] reserve expiresAt: null 또는 now보다 큰 유효 정수, 아니면 INVALID_INPUT
- [x] 운송: 시작·도착·취소, 목적 용기 배타 확보, 끝난 운송 ID 재사용 ID_TAKEN, UNKNOWN_TRANSIT·TRANSIT_CLOSED
- [x] 운송 중 split·consume·discard·move·추가 startTransit은 IN_TRANSIT, reserve·cancel·transferCustody·격리·advanceTime은 허용
- [x] 재전송(E5)·원자성(E6)·이력 args가 새 명령에도 적용
- [x] `pnpm check` PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
