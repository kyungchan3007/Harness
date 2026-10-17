# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, ontology.md, architecture.md, `docs/engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`, `src/lab/*.ts`의 정책 주석(`samples.ts` 등급 상속, `storage.ts` 운송 점유)
- **접근:** 기존 모듈 구조를 유지하고 빈 곳만 채운다. 모든 명령은 `engine.run`(재전송 판정·작업 복사본·이력)을 거친다.
  - `state.ts`: `inTransit(s, sampleId)` — ACTIVE 운송이 있는 시료인가.
  - `samples.ts`: 받기에 등급 값 검사·적합성, 분취에 격리·운송 중·자식 용기 적합성과 부모 등급 상속, 이동에 운송 중·적합성, 폐기에 운송 중. 격리는 폐기·이동·책임자 변경을 막지 않는다.
  - `reservations.ts`: `reserve`에 `expiresAt` 검증·격리, `consume`에 격리·운송 중, `advanceTime`에 만료 처리.
  - `quality.ts`: `quarantine`·`release`는 ACTIVE 확인 후 `quarantined`만 설정.
  - `transit.ts`: 운송 시작·도착·취소. 목적 용기 확보는 `occupied`(용기→시료)에 목적 용기를 더 넣어 표현해 `Storage.isFree`가 그대로 막게 한다. 도착은 출발 용기 항목을 지우고 시료의 `containerId`를 바꾸고, 취소는 목적 항목만 지운다.
- **대안·트레이드오프:** 확보를 별도 맵(용기→운송)에 두는 안은 `isFree`와 모든 호출부를 고쳐야 하고 복사·롤백 경로가 늘어난다. `occupied` 재사용은 점유 판정이 한 곳에 남는 대신 "용기 → 시료" 맵의 뜻이 "점유 또는 확보"로 넓어진다(주석으로 명시).
- **파일 계획:** `src/lab/{state,samples,reservations,quality,transit,storage}.ts` 수정, `src/lab/lab.test.ts` 신규. `types.ts`·`lab.ts`는 그대로.
- **위험:** `finish`·`move`가 `occupied.delete(containerId)`로 출발 용기만 지우므로 운송 중 이 경로가 열리면 확보가 새거나 엉킨다(그래서 운송 중 금지 검사를 앞에 둔다). 분취는 검사를 모두 끝낸 뒤에 상태를 쓴다(기존 구조 유지).
- **검증 계획:** 계약 항목마다 단위 테스트(성공·실패·실패 뒤 스냅숏 불변·재전송), 계보 보존 점검, `pnpm check`.

## 계획과 달라진 점
없음. 설계대로 구현했다. 덧붙인 것: `split`의 자식 항목이 null이어도 예외 대신 `INVALID_INPUT`을 돌려주도록 `ch && isQty(ch.qty)`로 방어(실패는 예외가 아니라 `{ ok: false }`라는 요청 규칙).

## 검증 결과
- `src/lab/lab.test.ts` 19개: 격리, 등급(받기·분취 상속·이동·운송), 만료(경계·이벤트 하나·격리/운송 중), 운송(점유·확보·취소·ID), 재전송·이력, 수량 보존. 실패 케이스는 모두 스냅숏 불변도 함께 확인.
- 테스트 작성 중 실패 2건은 구현이 아니라 테스트 쪽 오류(기본 인자가 undefined를 null로 바꿈, 운송 중 시료로 목적 용기 검사를 해 IN_TRANSIT이 먼저 걸림)였고 테스트를 고쳤다.
- `pnpm check` 결과는 아래 trace 마지막 줄 참고.
