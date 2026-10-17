# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 격리·시각 진행·운송 명령이 미구현이고, 보관 등급이 받기·분취·이동에 연결되지 않았으며(분취 자식 등급이 임시값), 예약 만료 입력 검증과 운송 중·격리 중 금지 규칙이 없다.
- **목표:** `quarantine`·`release`·`advanceTime`·`startTransit`·`confirmArrival`·`cancelTransit`을 구현하고, 등급 적합성·격리·운송 중 제한·`expiresAt` 검증을 기존 명령에 연결한다. 기존 재전송·원자성·이력 규칙을 그대로 따른다.
- **비목표:** `types.ts` 수정, 저장소 문서에 없는 실제 연구실 관행 추가.

## 애매한 곳·가정
- 분취 자식의 보관 등급 — 부모 등급 상속, `samples.ts` 정책 주석이 기준 (확인됨: 코드 주석)
- 운송 목적 용기 확보 — `occupied` 맵에 목적 용기를 시료로 점유시켜 `isFree` 한 곳에서 판정 (가정: `storage.ts` 정책 주석이 구현 방식을 정함)
- 운송 중 `reserve`·`cancel`·`transferCustody`·`quarantine`·`advanceTime` — 허용 (확인됨: transit.md)
- `receive`의 잘못된 `storageGrade` 값 — `INVALID_INPUT` (가정: ontology 5절)
- `advanceTime`의 `to` 범위 — 0 이상 `MAX_SAFE_INTEGER` 이하 정수이고 현재 이상, 아니면 `INVALID_INPUT` (확인됨: types.ts Tick 정의, 요청)
- 여러 규칙 위반 시 코드 — 어느 것이든 허용 (확인됨: engine.md E6.4)

## Acceptance
- [x] 격리·해제, 격리 중 분취·예약·소비 `QUARANTINED`
- [x] 받기·분취·이동·운송 목적지의 등급 정확 일치 검사, 자식 등급 상속
- [x] `advanceTime` 및 만료(경계 포함, 양만 해제), `expiresAt` 검증
- [x] 운송 시작·도착·취소, 목적 용기 배타 확보, 운송 중 금지 `IN_TRANSIT`
- [x] 단위 테스트와 `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
