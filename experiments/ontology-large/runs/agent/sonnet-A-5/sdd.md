# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, docs/engine·quality·storage·reservations·transit.md, src/lab 전 모듈
- **접근:** 모든 명령은 기존 `Engine.run`(재전송·작업 복사본·이력)을 거친다. 운송 목적 용기는 `occupied` 맵에 같은 시료 ID로 넣어 `isFree`가 그대로 배타 확보를 판정한다. 운송 중 여부는 `inTransit(s, sampleId)`로 ACTIVE 운송을 조회한다.
- **대안·트레이드오프:** 별도 reserved-container 집합을 두는 안은 copyState 수정이 필요해 기각.
- **파일 계획:** quality.ts, reservations.ts, samples.ts, transit.ts, state.ts(헬퍼), storage.ts(주석)
- **위험:** 소비·분취 등의 검사 순서(재전송 판단은 run이 먼저), 실패 시 부분 변경 없음(작업 복사본).
- **검증 계획:** `src/lab/lab.test.ts` 단위 테스트, `pnpm check`.

## 계획과 달라진 점
없음

## 검증 결과
pnpm check 결과는 trace.md 마지막 줄 참조.
