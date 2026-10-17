# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** `docs/engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`, `src/lab/*.ts` 정책 주석, ontology.json
- **접근:** 모든 명령은 기존 `Engine.run`(재전송 판정, 작업 복사본, 이력)을 거친다. `state.ts`에 `inTransit` 조회를 추가하고 격리·시각·운송 명령을 각 모듈에 채웠다. 운송 목적 용기는 `occupied`에 `transit:<id>`로 넣어 `Storage.isFree`가 그대로 막는다.
- **대안·트레이드오프:** 목적 확보를 별도 집합으로 두는 안은 `isFree` 수정과 복사 코드가 늘어 채택하지 않음.
- **파일 계획:** `quality.ts`, `reservations.ts`(reserve 검증·consume 격리/운송·advanceTime), `samples.ts`(등급·격리·운송 검사), `transit.ts`, `state.ts`, `storage.ts`(주석 정리), `lab.test.ts`
- **위험:** 운송 취소/도착 때 확보 해제 누락, 실패 시 상태 변경 잔존(작업 복사본으로 방지).
- **검증 계획:** 명령별 단위 테스트, 재전송·이력 테스트, `pnpm check`

## 계획과 달라진 점
없음

## 검증 결과
- 단위 테스트 11개 통과, `pnpm check` ALL PASS
