# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, loop.md, `src/lab/*.ts`, `docs/engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`, architecture.md(lab 모듈은 아직 표에 없음)
- **접근:** 기존 모듈 구조 유지. 모든 명령은 `engine.run` 안에서 작업 복사본을 바꾸므로 재전송·원자성이 자동 적용된다.
  - `state.ts`: `transitOf(s, sampleId)`(ACTIVE 운송 조회) 추가.
  - 운송 점유: 목적 용기를 기존 `occupied` 맵에 `목적 용기 → 시료`로 넣어 `Storage.isFree`가 받기·분취·이동·다른 운송을 모두 막는다. 도착 시 출발 용기 해제, 취소 시 목적 용기 해제.
  - `samples.ts`: 받기·분취·이동에 등급 검사, 분취 자식 등급 상속, 분취·폐기·이동에 `IN_TRANSIT`, 분취에 `QUARANTINED`.
  - `reservations.ts`: reserve/consume에 격리·운송 검사, `advanceTime` 구현(만료 시 `reserved` 해제), `expiresAt` 검증.
  - `quality.ts`, `transit.ts`: 신규 구현.
- **대안·트레이드오프:** 운송 확보를 별도 맵으로 두는 안은 `isFree`와 복사 로직이 늘어 기각.
- **파일 계획:** `src/lab/{state,samples,reservations,quality,transit}.ts`, 테스트 `src/lab/lab.test.ts`
- **위험:** 검사 순서(재전송 판정은 `run`이 먼저), 운송 취소 시 확보 해제 누락.
- **검증 계획:** vitest로 항목별·재전송·원자성·이력 테스트, `pnpm check`.

## 계획과 달라진 점
없음 (테스트 파일의 `noUncheckedIndexedAccess` 타입 오류만 `!`로 수정)

## 검증 결과
- `src/lab/lab.test.ts` 16개: 격리·등급·만료·운송·재전송·이력 항목별 통과. `pnpm check` 결과는 아래 JOURNAL/trace 참고.
