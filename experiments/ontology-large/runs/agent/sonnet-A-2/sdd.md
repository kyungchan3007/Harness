# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, docs/engine·quality·storage·reservations·transit.md, src/lab 전체, types.ts
- **접근:** 모든 명령은 `engine.run`(재전송·작업 복사본·이력)을 거친다. 운송은 `occupied` 맵에 목적 용기를 시료로 확보해 `Storage.isFree` 규칙을 그대로 재사용(받기·분취·이동·다른 운송이 `CONTAINER_OCCUPIED`). 격리는 `quarantined` 플래그만 바꾸고 예약은 건드리지 않는다. 만료는 `advanceTime`에서 `expiresAt <= now`인 ACTIVE 예약을 EXPIRED로, `reserved`만 줄인다. 자식 등급은 부모 상속.
- **대안·트레이드오프:** 운송 확보를 별도 맵으로 두는 안 — 기존 점유 판정과 어긋날 위험이 커서 기각.
- **파일 계획:** quality.ts, transit.ts 구현 / samples.ts·reservations.ts 검사 추가 / state.ts에 `inTransit`·`isTick` / lab.test.ts
- **위험:** 도착 시 출발 용기 해제와 목적 용기 유지 순서, 취소 시 목적 확보 해제 누락.
- **검증 계획:** 영역별 단위 테스트(실패 시 상태 불변 포함) + `pnpm check`.

## 계획과 달라진 점
없음

## 검증 결과
- lab.test.ts 6개 통과, typecheck 통과, `pnpm check` 결과는 trace.md 마지막 줄 참고
