# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, ontology.json, docs/engine·quality·storage·reservations·transit.md, src/lab/* 전부(특히 samples.ts·storage.ts 정책 주석).
- **접근:** 모든 명령은 기존 `engine.run`(재전송·원자성·이력)을 그대로 거친다. 상태에 `held: Map<목적 containerId, transitId>`를 추가하고 `Storage.isFree`가 `occupied`와 `held`를 모두 본다 → receive·split·move·startTransit이 같은 판정을 공유(transit.md의 "용기 구현의 규칙"). 운송 중 여부는 ACTIVE 운송 조회(`inTransit`)로 판단. 분취 자식 등급은 부모 상속(samples.ts 정책 주석), 모든 적합성은 `Storage.supports`.
- **대안·트레이드오프:** `occupied`에 목적 용기도 넣는 안은 I2(용기↔시료)와 finish/move의 삭제 로직이 섞여 기각.
- **파일 계획:** state.ts(held, inTransit, copyState), storage.ts(isFree), samples.ts, reservations.ts, quality.ts, transit.ts, 테스트 `src/lab/lab.test.ts`.
- **위험:** 판정 순서에 따라 오류 코드가 달라질 수 있으나 복수 위반은 임의(E6.4). 재전송 판정은 run이 먼저 처리.
- **검증 계획:** 정책별 단위 테스트(경계·원자성·재전송), `pnpm onto:check`, `pnpm check`.

## 계획과 달라진 점
없음 (계획대로 구현. 테스트 작성 중 이벤트 ID 재사용 실수 1회는 테스트 쪽 오류였고 엔진은 EVENT_CONFLICT를 올바르게 냄).

## 검증 결과
- `pnpm check` ALL PASS: tsc, vitest 158개(신규 `src/lab/lab.test.ts` 16개 포함), 온톨로지 불변식 검사(`agents/ontology`) 통과, 태스크 기록 검사.
- 검사 범위: 격리 멱등·허용/금지 명령, 등급 정확 일치와 자식 상속, 만료 경계(`expiresAt == now`)·이벤트 1개·양만 풀림, 운송 배타 확보·IN_TRANSIT·끝난 운송 재사용·재전송·실패 원자성.
