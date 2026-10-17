# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, agents/context/architecture.md, docs/{engine,quality,storage,reservations,transit}.md, agents/harness/loop.md, `src/lab/*.ts`(특히 types.ts, 정책 주석: samples.ts 등급 상속, storage.ts 운송 점유)
- **접근:** 기존 모듈 구조 유지. 모든 명령은 `Engine.run` 안에서 작업 복사본으로 실행되므로 재전송·원자성·이력은 자동 적용. 운송 점유는 기존 `occupied`(containerId→sampleId) 맵을 재사용 — 시작 시 목적 용기를 같은 시료로 점유해 `isFree`가 받기·분취·이동·다른 운송을 모두 막는다. 도착은 출발 점유 해제 + `containerId` 갱신, 취소는 목적 점유 해제. `state.ts`에 `inTransit(s, sampleId)` 도우미, `isTick` 검증 추가. 등급 검사는 `Storage.supports`를 연결.
- **대안·트레이드오프:** 별도 `reservedContainers` 맵을 두는 안은 `isFree`와 `finish` 양쪽을 고쳐야 하고 `copyState` 항목이 늘어 기각. 만료를 조회 시 계산하는 안은 snapshot의 상태·reserved와 어긋나 기각(시각이 진행될 때 실제로 변경).
- **파일 계획:** `state.ts`(inTransit), `samples.ts`(등급·격리·운송 중 검사), `reservations.ts`(expiresAt 검증, 격리, 운송 중 소비, advanceTime), `quality.ts`, `transit.ts`, `storage.ts`(TODO 주석 정리), 테스트 `src/lab/lab.test.ts`.
- **위험:** 운송 중 시료에서 `finish`가 호출되면 목적 점유가 남음 → 운송 중 소비·폐기·분취를 모두 막아 방지. 예약 만료 시 시료가 ACTIVE가 아니어도 안전하게 reserved 감소.
- **검증 계획:** vitest로 각 규칙(정상·경계·실패 시 무변경·재전송·EVENT_CONFLICT), 만료 경계(`expiresAt == now`), 운송 중 허용/금지 명령, 끝난 운송 재전송.

## 계획과 달라진 점
없음. (착수 중 hook이 PRD 가정 줄 형식을 요구해 prd 표기만 고침)

## 검증 결과
- `src/lab/lab.test.ts` 16개: 격리(멱등·허용/금지 명령·예약 불변), 등급(정확 일치·상속·실패 시 무변경), 시각·만료(경계 `expiresAt == now`, 한 이벤트, 양 불변, 격리·운송 중 만료), 운송(도착·취소·배타 확보·운송 중 금지/허용·끝난 운송 재전송·ID), 재전송·EVENT_CONFLICT.
- `pnpm check` 결과는 trace.md 마지막 행.
