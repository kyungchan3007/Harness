# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** types.ts, docs 5종, ontology.json, src/lab 전 모듈의 정책 주석
- **접근:** 모든 명령은 기존 `Engine.run` 안에서 작업 복사본으로 실행하므로 재전송·원자성·이력은 그대로 따른다. 운송은 `transits` 맵 + 목적 용기를 `occupied`에 시료 ID로 확보(기존 `isFree`가 받기·분취·이동·다른 운송을 모두 막음). 운송 중 판정은 `inTransit(state, sampleId)` 하나로 통일.
- **대안·트레이드오프:** 목적 확보를 별도 맵으로 두는 안은 isFree 외 모든 검사 지점을 고쳐야 해 기각. 단점은 occupied가 "시료가 실제 있는 곳"과 "확보"를 한 맵에 섞는 것이며 도착 시 출발만 지우면 되므로 수용.
- **파일 계획:** state.ts(inTransit), samples.ts(등급·격리·운송 검사), reservations.ts(만료 검증·advanceTime), quality.ts, transit.ts, lab.test.ts
- **위험:** 검사 순서에 따라 다중 위반 시 코드가 달라지나 E6.4상 허용. 운송 중 finish 경로는 막혀 있어 occupied 확보가 새지 않음.
- **검증 계획:** 기능별 단위 테스트(재전송·EVENT_CONFLICT·실패 시 스냅숏 불변 포함) + `pnpm check`

## 계획과 달라진 점
없음

## 검증 결과
`pnpm check` ALL PASS (아래 trace 참조)
