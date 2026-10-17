# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, ontology.json, `docs/engine·quality·storage·reservations·transit.md`, `src/lab/*.ts`(특히 `samples.ts`·`storage.ts` 정책 주석), `types.ts`
- **접근:** 모든 명령은 기존 `Engine.run` 안에서 실행(재전송·원자성·이력은 그대로). 미구현 모듈(quality·transit·advanceTime)을 채우고 samples·reservations에 검사를 추가한다. 목적 용기 확보는 `occupied` 맵을 재사용해 `isFree` 한 곳으로 판정. 운송 중 판정은 ACTIVE 운송 조회 헬퍼(`state.ts`).
- **대안·트레이드오프:** 확보 용기를 별도 맵으로 두는 안 — `isFree`·복사 코드를 늘리고 누락 위험이 커 기각.
- **파일 계획:** `state.ts`(inTransit 헬퍼) · `storage.ts`(주석 정리) · `samples.ts`(등급·격리·운송 검사) · `reservations.ts`(격리·만료·advanceTime) · `quality.ts` · `transit.ts` · `lab.test.ts`(신규)
- **위험:** 자식 등급 임시값 제거 / 재전송이 상태 검사보다 먼저인지 / 운송 시작 실패 시 확보가 새지 않는지
- **검증 계획:** `src/lab/lab.test.ts`에 Acceptance별 테스트, `pnpm check`.

## 계획과 달라진 점
없음. 설계(occupied 맵 재사용, `inTransit` 헬퍼)대로 구현. `lab.ts`는 이미 모든 모듈이 배선돼 있어 수정하지 않았다.

## 검증 결과
- `src/lab/lab.test.ts` 19개 테스트(등급·격리·만료·운송·재전송·이력·원자성) 통과.
- `pnpm check` 결과는 아래 trace 마지막 줄 참고.
