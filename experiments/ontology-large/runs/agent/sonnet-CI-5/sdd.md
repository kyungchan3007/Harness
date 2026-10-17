# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, ontology.json, docs/engine·quality·storage·reservations·transit.md, src/lab/*.ts(특히 samples.ts·storage.ts의 정책 주석)
- **접근:** 기존 `Engine.run`(재전송 판정→작업 복사본→이력)을 그대로 쓰고 명령 본문만 채운다. 운송은 `State.occupied`에 출발 용기 점유와 목적 용기 확보를 함께 기록해 `Storage.isFree` 하나로 CONTAINER_OCCUPIED를 막는다. 운송 중 여부는 `inTransit(s, sampleId)`(ACTIVE 운송 탐색)로 판정. 분취 자식 등급은 samples.ts 정책 주석대로 부모 등급 상속.
- **대안·트레이드오프:** 목적 확보를 별도 맵으로 두는 안은 isFree·finish·copyState를 모두 고쳐야 해서 기각(occupied 재사용이 불변식 I2/I14를 한 곳에서 유지).
- **파일 계획:** quality.ts(격리), reservations.ts(만료·검증·격리/운송 가드), samples.ts(등급·격리·운송 가드), transit.ts(운송), state.ts(`inTransit`), storage.ts(주석), lab.test.ts(테스트). types.ts는 수정하지 않음.
- **위험:** 한 가드 누락(예: consume의 IN_TRANSIT)·만료가 격리/운송에 영향·실패 시 부분 변경. 실패 경로는 작업 복사본이라 안전.
- **검증 계획:** 명령별·문서 규칙별 단위 테스트(격리·등급·만료 경계·운송 점유/금지/식별자/재전송·원자성) + `pnpm check`.

## 계획과 달라진 점
없음

## 검증 결과
- `pnpm exec tsc --noEmit` 통과, `pnpm exec vitest run` 전체 통과(lab 테스트 포함). 최종 `pnpm check` 결과는 trace.md 마지막 행.
