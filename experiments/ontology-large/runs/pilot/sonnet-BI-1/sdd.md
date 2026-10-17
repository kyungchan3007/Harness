# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, ontology.md, docs/ 다섯 개, src/lab/ 전체(특히 samples.ts·storage.ts 정책 주석), types.ts
- **접근:** 기존 모듈 분할 유지. 모든 명령은 `engine.run`의 작업 복사본에서 실행되므로 실패 시 원자성·재전송은 자동 보장.
  - 운송 확보는 별도 구조 없이 `occupied`(containerId→sampleId)에 목적 용기를 추가해 `Storage.isFree`가 그대로 막게 한다(storage.ts 정책). 도착: 출발 항목 삭제 + 시료 containerId 변경. 취소: 목적 항목 삭제.
  - `state.ts`에 `inTransit(s, sampleId)`(ACTIVE 운송 조회)와 `isTick` 추가. 시료 쪽 명령이 `IN_TRANSIT` 판정에 사용.
  - `Storage.supports`를 receive·split(자식 용기)·move·startTransit에 연결. 분취 자식 등급은 부모 상속.
  - `advanceTime`: 검증 → now 갱신 → expiresAt ≤ now인 ACTIVE 예약을 EXPIRED, 시료 reserved 감소.
- **대안·트레이드오프:** 확보 용기를 별도 Map으로 두는 안은 copyState·isFree 수정이 늘고 점유 규칙이 두 곳에 갈라져 기각.
- **파일 계획:** state.ts, samples.ts, reservations.ts, quality.ts, transit.ts, 테스트 `src/lab/lab.test.ts`
- **위험:** 검사 순서(E5 재전송은 run이 먼저 보장), 운송 중 consume이 finish로 occupied를 건드리는 경로(IN_TRANSIT으로 차단), 자식 등급 상속 누락
- **검증 계획:** 명령별 성공·실패 코드, 실패 후 스냅숏 동일, 재전송, 경계(expiresAt==now), 운송 확보 배타성, 등급 정확 일치(FROZEN≠CHILLED)

## 계획과 달라진 점
없음. (`isTick`·`inTransit`을 reservations.ts가 아닌 state.ts에 둠 — 시료·운송 모듈이 함께 쓰므로.)

## 검증 결과
- `src/lab/lab.test.ts` 15개: 격리 2, 등급 3, 만료·시각 3, 운송 6, 이력·재전송 1. 실패 케이스는 모두 명령 전후 스냅숏 동일까지 확인.
- `pnpm check` 결과는 아래 trace 참조.
