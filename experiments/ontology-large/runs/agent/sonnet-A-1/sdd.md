# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, architecture.md, docs/engine·quality·storage·reservations·transit.md, src/lab 전 모듈의 정책 주석, loop.md
- **접근:** 기존 `Engine.run`(재전송·작업 복사본·이력) 위에 명령만 추가한다. 상태 구조는 그대로 두고, 운송 확보는 기존 `occupied`(용기→시료) 맵에 목적 용기를 넣어 표현해 `Storage.isFree` 규칙(받기·분취·이동·다른 운송 모두 CONTAINER_OCCUPIED)을 그대로 재사용한다.
  - quality.ts: quarantine·release는 `active()` 후 플래그 설정.
  - samples.ts: receive·split·move에 등급 검사(`storage.supports`), 분취 자식 등급은 부모 상속, 격리/운송 검사 추가.
  - reservations.ts: reserve에 expiresAt 검증·QUARANTINED, consume에 QUARANTINED·IN_TRANSIT, advanceTime에서 만료 일괄 처리.
  - transit.ts: start(목적 용기 확보)·confirm(출발 비움, 목적으로 이동)·cancel(목적 확보 해제).
- **대안·트레이드오프:** 확보 전용 맵 신설 안 함 — 기존 isFree 하나로 판정이 모이고 copyState 변경이 없다.
- **파일 계획:** quality.ts, samples.ts, reservations.ts, transit.ts, 새 `lab.test.ts`. types.ts 불변.
- **위험:** 운송 중 시료 식별은 ACTIVE 운송 조회로 한다. 실패 시 상태가 바뀌지 않도록 모든 검사를 변경 앞에 둔다(작업 복사본이 보장).
- **검증 계획:** 정책 문서 규칙별 단위 테스트(재전송·원자성 포함), `pnpm check`.

## 계획과 달라진 점
없음

## 검증 결과
pnpm check ALL PASS (typecheck, 테스트 128개, 기록 검사).
