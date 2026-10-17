# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** `docs/engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`, `agents/context/architecture.md`, `src/lab/*.ts`(특히 `storage.ts`의 점유 정책, `samples.ts`의 등급 상속 주석, `events.ts`의 재전송·원자성).
- **접근:** 모든 명령은 기존 `Engine.run`(재전송 판정 → 작업 복사본 → 커밋)을 그대로 쓴다. 상태 필드는 `types.ts`에 이미 있으므로 `State`에 추가하지 않는다.
  - 점유: 운송 목적 용기를 `occupied`에 시료 ID로 등록한다. `Storage.isFree`가 그대로 받기·분취·이동·다른 운송 목적지를 `CONTAINER_OCCUPIED`로 막는다. 도착은 출발 용기 해제(시료는 이미 목적 용기 점유), 취소는 목적 용기 해제.
  - 운송 중 판정: `state.ts`에 `inTransit(s, sampleId)`(ACTIVE 운송 존재 여부)를 두고 분취·소비·폐기·이동·운송 시작에서 `IN_TRANSIT`.
  - 격리: `quarantined` 플래그만 바꾼다. 분취·새 예약·소비에서 `QUARANTINED`.
  - 등급: `receive`·`split`(자식=부모 등급)·`move`·`startTransit`에서 `storage.supports`.
  - 만료: `advanceTime`이 ACTIVE 예약을 훑어 `expiresAt !== null && expiresAt <= to`면 `EXPIRED`로 하고 `reserved`만 줄인다. 이벤트는 하나.
- **대안·트레이드오프:** 운송 확보를 별도 맵으로 두는 안은 `isFree` 수정이 필요하고 누락 위험이 커서 기각. `occupied` 재사용은 `finish`가 시료의 현재 용기만 해제하므로 목적 확보와 충돌하지 않는다(운송 중 종료 명령은 모두 금지).
- **파일 계획:** `state.ts`(`inTransit`), `samples.ts`(등급·격리·운송 검사), `reservations.ts`(만료·격리·시각), `quality.ts`, `transit.ts`, `storage.ts`(TODO 주석 정리), `src/lab/lab.test.ts`(신규). `types.ts` 불변.
- **위험:** 검사 순서가 오류 코드에 영향(복수 위반은 아무 코드나 허용되나, 실패 시 상태 불변은 필수) → 모든 변경은 검사 뒤에만. 분취는 다중 자식이므로 검사를 전부 끝낸 뒤 변경.
- **검증 계획:** 정책 문서 항목별 vitest(격리 멱등·예약 불변, 등급 정확 일치·상속, 만료 경계(`==`)와 단일 이벤트, 운송 점유·취소·도착·`ID_TAKEN`·`TRANSIT_CLOSED`, 재전송 시 처음 Receipt, 실패 원자성). `pnpm check`.

## 계획과 달라진 점
- 격리 명령은 `set` 팩토리 하나로 합쳐 `quarantine`·`release`가 같은 경로를 쓰게 함(계획은 두 함수). 그 외 없음.

## 검증 결과
- `src/lab/lab.test.ts` 18개(격리·등급·만료·운송·재전송·이력) 통과.
- `pnpm check` 결과는 아래 trace.md 마지막 줄과 JOURNAL 참조.
