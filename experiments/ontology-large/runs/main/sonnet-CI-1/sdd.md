# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, ontology.json, docs/engine·quality·storage·reservations·transit.md, src/lab/* 전부
- **접근:** 기존 모듈 구조 유지. 모든 명령은 `engine.run`을 거치므로 재전송·원자성·이력이 자동 적용된다.
  - `state.ts`: `transitOf(s, sampleId)`(ACTIVE 운송 조회), `isTick`(유효 시각).
  - `storage.ts`: `isFree`가 시료 점유와 ACTIVE 운송 목적지 확보를 함께 본다.
  - `samples.ts`: receive 등급 검증·적합성, split 격리·운송 중·등급 상속·자식 용기 적합성, discard·move 운송 중 금지, move 적합성.
  - `reservations.ts`: reserve 격리·expiresAt 검사, consume 격리·운송 중 검사, advanceTime.
  - `quality.ts`, `transit.ts`: 구현.
- **대안·트레이드오프:** 목적 용기 확보를 `occupied` 맵에 넣는 안은 I2(용기당 ACTIVE 시료)와 섞여 기각. 운송 목록에서 계산한다.
- **파일 계획:** `src/lab/{state,storage,samples,reservations,quality,transit}.ts` 수정, `src/lab/lab.test.ts` 추가. `types.ts` 불변.
- **위험:** 재전송 판정이 먼저(E5), 실패 시 상태 불변 → 작업 복사본에서만 변경.
- **검증 계획:** 명령별 vitest, 원자성·재전송 확인, `pnpm check`, `pnpm onto:check`.

## 계획과 달라진 점
- 코드 수정이 처음에 hook으로 막힘: prd "애매한 곳" 줄에 `(가정)` 표시가 빠져 있었음 → 표시 추가 후 진행.
- 임시 패치 스크립트 실행이 거절되어 Edit으로 직접 수정(내용 동일).

## 검증 결과
- `pnpm check` ALL PASS: tsc, vitest 13파일 153개(신규 `src/lab/lab.test.ts` 11개 + ontology 불변식 I1~I14 무작위 검사 포함), 락파일, 태스크 기록.
- `types.ts` 불변. 기존 명령 동작은 유지(검사만 추가).
