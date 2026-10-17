# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** 시료 보관 엔진(`src/lab/`)에 격리·보관 등급·예약 만료·운송 명령이 빠져 있거나 스텁(`throw`)이다. 분취 자식의 등급은 임시값(`AMBIENT`)이고, 보관 등급 검사는 받기·분취·이동에 연결돼 있지 않다.
- **목표:**
  1. 기존 기능(받기·분취·예약·소비·폐기·이동·책임자·재전송·원자성·이력)을 그대로 유지한다.
  2. 격리 `quarantine`·`release`를 구현하고, 격리 중 분취·새 예약·소비를 `QUARANTINED`로 거절한다.
  3. 보관 등급을 받기·분취·이동·운송 목적지에 연결해 `STORAGE_INCOMPATIBLE`로 거절한다. 분취 자식은 부모 등급을 이어받는다.
  4. 논리 시각 `advanceTime`과 예약 만료(`EXPIRED`, 양만 풀림)를 구현한다.
  5. 운송 `startTransit`·`confirmArrival`·`cancelTransit`을 구현하고, 운송 중 금지 명령을 `IN_TRANSIT`으로 거절한다.
- **비목표:** 실제 시계·외부 저장소·동시 호출, `src/lab/types.ts` 수정, 저장소에 없는 연구실 관행 추가, 등급 상하·대체 관계.

## 원문
- 원문 출처: 작업 지시 파일(AGENT_TASK.md)의 "요청 — 시료 보관 엔진 확장" 절과 `AGENTS.md`의 "따를 계약" 지침.
- `request.md`(이슈 본문 원문 고정)는 **만들지 못했다.** 이 저장소에는 GitHub 원격이 없어 `pnpm request 1`(`gh issue view`)이 실패했다 (확인 필요: 원문 고정을 어떻게 할지).

## 애매한 곳·가정
- 원문 고정 — 원격이 없어 `request.md` 없음 (가정: 지시 파일의 요청 절을 원문으로 본다. 원격 연결 후 `pnpm request 1`로 이슈 본문을 다시 고정한다)
- 잘못된 보관 등급 값(예: `"WARM"`) — `INVALID_INPUT`으로 봄 (가정: engine E1.5·`errors` 정의의 "등급 값 잘못됨"과 같은 범주)
- 여러 규칙을 동시에 어기면 — 검사 순서대로 첫 코드 (가정: engine E6.4가 허용하는 선택, 순서는 구현 파일 기준)
- `advanceTime(to)`의 `to`가 현재와 같음 — 성공한다 (가정: 요청의 "현재 이상")
- 격리 중 예약 취소·이동·폐기·책임자 변경·운송 — 막지 않는다 (확인됨: docs/quality.md)
- 운송 중 예약 생성·취소·책임자 변경·격리는 허용 (확인됨: docs/transit.md)
- 분취 자식 등급 — 부모 등급 상속 (확인됨: docs/storage.md, ontology "분취 순간 부모 등급 이어받음")

## Acceptance
- [x] `quarantine`·`release`: ACTIVE만, 같은 값도 성공, 격리 중 분취·새 예약·소비 `QUARANTINED`
- [x] 보관 등급: 받기·분취 자식·이동·운송 목적지에서 정확 일치 검사, 실패 `STORAGE_INCOMPATIBLE`, 분취 자식은 부모 등급 상속
- [x] `advanceTime`: 앞으로만 진행, 과거·잘못된 값 `INVALID_INPUT`, 만료 경계 포함 `EXPIRED`, 양만 풀림
- [x] 새 예약의 `expiresAt`: null 또는 현재보다 큰 유효 정수, 아니면 `INVALID_INPUT`
- [x] 운송 3종: 목적 용기 배타 확보, 도착·취소 결과, 끝난 운송 `TRANSIT_CLOSED`, ID 재사용 `ID_TAKEN`
- [x] 운송 중 분취·소비·폐기·이동·추가 운송 `IN_TRANSIT`
- [x] 단위 테스트 12개 (`src/lab/lab.test.ts`)
- [ ] 원문 `request.md` 고정 — 미완, 사유: GitHub 원격 없음 (후속: 원격 연결 후 `pnpm request 1`)
- [x] `pnpm check` ALL PASS (아래 sdd 검증 결과)

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
