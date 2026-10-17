# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, ontology.md, docs/engine·quality·storage·reservations·transit.md, `src/lab/*.ts` 전부(types.ts의 EventView.args 모양 포함)
- **접근:** 기존 모듈 구조를 유지하고 미구현 메서드와 TODO만 채운다. 모든 명령은 `engine.run`을 거치므로 재전송·원자성·이력이 자동 적용된다.
  - 운송 점유: ACTIVE 운송의 목적 용기를 `s.occupied`에 (목적 용기 → 시료)로 넣는다. `Storage.isFree`가 받기·분취·이동·다른 운송 목적지를 그대로 막는다(storage.ts 주석 정책). 도착 시 출발 용기만, 취소 시 목적 용기만 제거.
  - 운송 중 판정: `state.ts`에 `inTransit(s, sampleId)` 도우미(ACTIVE 운송 탐색).
  - 만료: `advanceTime`에서 `expiresAt !== null && expiresAt <= now`인 ACTIVE 예약을 EXPIRED로 하고 시료 reserved만 감소.
  - 등급: `Storage.supports`를 receive·split(자식 용기 vs 부모 등급)·move·startTransit에 연결. 자식 등급은 부모 상속.
- **대안·트레이드오프:** 운송 확보를 별도 맵으로 두면 `isFree` 수정이 필요하고 누락 위험이 있어 기각(occupied 재사용).
- **파일 계획:** state.ts(inTransit), samples.ts, reservations.ts, quality.ts, transit.ts, 테스트 `src/lab/lab.test.ts`
- **위험:** 실패 시 작업 복사본을 버리므로 원자성은 유지되나, 본문에서 상태 변경은 모든 검사 뒤에 둔다.
- **검증 계획:** 계약별 vitest(격리·등급·만료 경계·운송 점유·재전송·원자성·이력 복제), `pnpm check`, verifier 판정.

## 계획과 달라진 점
없음 — 단, 가드가 PRD의 가정 줄마다 `(가정)` 표시를 요구해 prd 문구만 두 번 고쳤다(trace 참고).

## 검증 결과
- `src/lab/lab.test.ts` 22개: 격리·등급(정확 일치·자식 상속)·만료 경계·운송 점유·IN_TRANSIT 허용/금지·재전송·원자성·이력 복제.
- `pnpm check`: 아래 trace의 마지막 줄 참고.
