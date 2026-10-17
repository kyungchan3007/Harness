# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** 시료 보관 엔진(`src/lab/`)은 받기·분취·예약·소비·폐기·이동의 기본만 있다. 격리·보관 적합성·예약 만료·운송 명령은 미구현(throw)이거나 연결되지 않았다.
- **목표:** 기존 명령의 동작을 유지하면서 격리(`quarantine`·`release`), 보관 등급 검사, 논리 시각 진행(`advanceTime`)에 따른 예약 만료, 운송(`startTransit`·`confirmArrival`·`cancelTransit`)을 `createLab`의 공개 계약대로 구현한다.
- **비목표:** `src/lab/types.ts` 수정, 실제 시계·외부 저장소·동시 호출, 문서 정책(`docs/`) 변경, 저장소에 없는 실제 연구실 관행 추가.

## 기준 원문
- 요구 원문은 이슈 #1 본문과 이 태스크의 요청 문장을 따른다. 세부 규칙은 `src/lab/types.ts`, `docs/` 정책 다섯 개, 관련 모듈의 정책 주석이 판정 기준이다.

## 애매한 곳·가정
- 분취 자식의 보관 등급 — 부모 등급을 상속 (가정: `src/lab/samples.ts` 정책 주석과 `docs/storage.md`의 "구현에 적힌 규칙")
- 분취 자식의 격리 여부 — 항상 false로 시작 (가정: 기존 코드 유지, 부모는 격리 중이면 분취 자체가 거절됨)
- `advanceTime`에 현재와 같은 시각 — 성공하고 이벤트를 남긴다 (가정: "현재 이상"의 문언 그대로)
- 여러 규칙을 동시에 어기는 호출의 오류 코드 — 검사 순서대로 첫 코드 (가정: `docs/engine.md` E6.4 허용 범위 안)
- 운송 목적 용기 확보 — 기존 `isFree` 판정에 포함하는 방식으로 구현 (가정: `src/lab/storage.ts` 주석의 정책)

## Acceptance
- [x] `quarantine`·`release`가 ACTIVE 시료의 격리 여부만 바꾸고, 이미 같은 상태여도 성공한다 (`docs/quality.md`)
- [x] 격리된 시료의 분취·새 예약·예약 소비가 `QUARANTINED`로 거절되고, 기존 예약은 그대로다 (`docs/quality.md`)
- [x] 받기·분취·이동·운송 시작의 목적 용기가 시료의 요구 등급을 지원하지 않으면 `STORAGE_INCOMPATIBLE`로 거절한다 (`docs/storage.md`)
- [x] `advanceTime`은 현재 이상의 유효 정수만 받고, `expiresAt <= now`인 ACTIVE 예약을 `EXPIRED`로 만들어 예약 양만 푼다 (`docs/reservations.md`)
- [x] 새 예약의 `expiresAt`은 `null`이거나 현재보다 큰 유효 정수여야 한다 (`docs/reservations.md`)
- [x] `startTransit`·`confirmArrival`·`cancelTransit`이 `docs/transit.md`의 상태·점유·오류 코드 규칙을 지킨다
- [x] 운송 중 분취·소비·폐기·직접 이동이 `IN_TRANSIT`으로 거절된다
- [x] 기존 재전송(E5)·원자성(E6)·이력 규칙이 새 명령에도 적용되고, 기존 테스트가 그대로 통과한다
- [x] 새 동작마다 단위 테스트가 있다 (`src/lab/lab.test.ts`)
- [x] `bash agents/harness/evals/checks.sh` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
