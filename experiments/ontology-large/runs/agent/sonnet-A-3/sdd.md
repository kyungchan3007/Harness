# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, docs/engine·quality·storage·reservations·transit.md, src/lab/*.ts 정책 주석
- **접근:** 운송 목적 용기 확보는 기존 `occupied` 맵에 목적 용기→시료로 등록해 `isFree` 규칙을 그대로 쓴다. 도착은 출발 용기 해제, 취소는 목적 용기 해제. 운송 중 여부는 `state.inTransit`(ACTIVE 운송 조회). 등급 검사는 `storage.supports`를 receive·split·move·startTransit에 연결. 모든 명령은 `engine.run`을 거쳐 재전송·원자성·이력이 자동 적용된다.
- **대안·트레이드오프:** 시료에 inTransit 플래그를 두는 안은 `types.ts` 변경이 필요해 기각.
- **파일 계획:** quality.ts, transit.ts, reservations.ts, samples.ts, state.ts, storage.ts(주석), lab.test.ts
- **위험:** 만료 시 예약 양 이중 해제, 운송 중 종료 상태 불일치. 운송 중 소비·폐기·분취를 막아 방지.
- **검증 계획:** 규칙별 단위 테스트, `pnpm check`.

## 계획과 달라진 점
없음

## 검증 결과
`pnpm check` 결과는 trace.md 마지막 행.
