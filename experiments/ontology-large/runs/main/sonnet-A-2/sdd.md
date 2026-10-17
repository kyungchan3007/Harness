# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, docs/engine·quality·storage·reservations·transit.md, architecture.md, loop.md, src/lab/* 전부(특히 storage.ts `isFree` 정책 주석, samples.ts 분취 등급 정책 주석).
- **접근:** 모든 명령은 기존 `Engine.run`을 거쳐 재전송·원자성·이력을 그대로 얻는다. 점유는 `State.occupied`(용기→시료) 하나로 통일한다: 운송 시작 시 목적 용기를 `occupied`에 넣어 확보하므로 `Storage.isFree`가 받기·분취·이동·다른 운송 목적지를 모두 막는다. 도착은 출발 용기를 비우고 시료의 `containerId`를 바꾸며, 취소는 목적 용기 확보만 푼다. 운송 중 판정은 `state.ts`의 `inTransit(s, sampleId)` 헬퍼(ACTIVE 운송 탐색)로 둔다. 만료는 `advanceTime`에서 `expiresAt <= to`인 ACTIVE 예약을 일괄 `EXPIRED`로 바꾸고 시료 `reserved`만 줄인다. 격리는 `quarantined` 플래그만 바꾼다.
- **대안·트레이드오프:** 운송 확보를 별도 맵으로 두는 안 → `isFree` 판정이 둘로 갈라져 누락 위험, 기각. 운송 중 여부를 시료 필드로 두는 안 → `SampleView`(types.ts) 수정 불가, 기각.
- **파일 계획:** state.ts(헬퍼), samples.ts(등급·격리·운송 검사), reservations.ts(만료·격리·운송·advanceTime), quality.ts, transit.ts, `src/lab/lab.test.ts`(테스트).
- **위험:** 재전송 판정이 항상 먼저(Engine.run). 실패 시 작업 복사본을 버리므로 부분 변경 없음. 만료 경계(`<=`).
- **검증 계획:** vitest로 각 정책(경계값 포함)·재전송·실패 원자성·이력·계보 보존 테스트, `pnpm check`.

## 계획과 달라진 점
없음. 테스트는 계획대로 `src/lab/lab.test.ts` 하나. 가드 hook이 prd의 (가정) 표기 누락을 잡아 prd 문구를 고친 뒤 코드를 작성함.

## 검증 결과
- `pnpm check` ALL PASS (Typecheck, 테스트 145개 — lab.test.ts 포함, lockfile, 태스크 기록).
- 경계값 확인: 만료 시각과 정확히 같은 시각에 만료, `advanceTime` 같은 시각 허용·과거 거절, `expiresAt <= now` 거절, 운송 목적 용기 확보/해제, 끝난 운송 재전송은 처음 Receipt.
