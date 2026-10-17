# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** `docs/engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`, `src/lab/` 전 모듈의 정책 주석, `agents/ontology/ontology.json`.
- **접근:** 모든 명령은 기존대로 `Engine.run`(재전송 판정 → 작업 복사본 → 이력 → 커밋)을 거치므로 E5·E6은 새 명령에 자동 적용된다. 모듈별로 채운다.
  - `state.ts`: 운송 목적 용기 확보 표 `targets`(containerId → transitId)를 추가하고 `copyState`에 포함. `inTransit(s, sampleId)` 헬퍼.
  - `storage.ts`: `isFree`가 시료 점유(`occupied`)와 운송 확보(`targets`)를 모두 본다. 출발 용기는 시료가 `occupied`에 그대로 있어 점유가 유지된다.
  - `samples.ts`: 받기에 등급 값 검증과 `supports`, 분취는 격리·운송 중 거절·자식 용기 등급 검사·부모 등급 상속, 이동은 운송 중 거절·등급 검사, 폐기는 운송 중 거절.
  - `reservations.ts`: 예약은 격리 거절과 `expiresAt` 검증, 소비는 격리·운송 중 거절, `advanceTime`은 `expiresAt <= to`인 ACTIVE 예약을 `EXPIRED`로 바꾸고 예약 양만 푼다.
  - `quality.ts`: `quarantined`만 설정.
  - `transit.ts`: 시작(ID 새것·ACTIVE·운송 중 아님·목적 용기 존재·비어 있고 확보 안 됨·용량·등급)·도착(시료 이동, 확보 해제)·취소(확보 해제).
- **대안·트레이드오프:** (1) 목적 확보를 `occupied`에 가짜 시료 ID로 넣기 — 단순하지만 I2(용기↔ACTIVE 시료)와 `finish`·`move` 로직이 오염돼 기각. (2) 별도 `targets` 표 — 상태 복사 한 줄이 늘지만 의미가 분리돼 채택. 운송 중 여부는 운송 표를 훑어 판정(규모가 작아 인덱스 불필요).
- **파일 계획:** `src/lab/{state,storage,samples,reservations,quality,transit}.ts` 수정, `src/lab/lab.test.ts` 신규. `types.ts`·`lab.ts`·`events.ts`는 그대로.
- **위험:** 검사 순서가 달라 코드가 바뀌는 경우(여러 규칙 위반은 E6.4로 허용). 실패 시 부분 변경은 작업 복사본으로 차단. 재전송 판정은 `run` 맨 앞이라 도착·취소 뒤 같은 이벤트 재전송이 `TRANSIT_CLOSED`를 내지 않는다.
- **검증 계획:** vitest로 기능별 단위 테스트와 실패 시 스냅숏 불변, 재전송/충돌, 만료 경계, 운송 배타 확보·취소 해제·ID 재사용, 계보 보존(I1) 확인. `pnpm check`.

## 계획과 달라진 점
없음

## 검증 결과
- `src/lab/lab.test.ts` 18개(격리·등급·만료 경계·운송 배타 확보·IN_TRANSIT·재전송·원자성·계보 보존) 통과, `pnpm exec tsc --noEmit` 통과.
- `pnpm check` ALL PASS.
