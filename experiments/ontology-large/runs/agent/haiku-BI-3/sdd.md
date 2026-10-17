# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** `src/lab/types.ts`(공개 계약, 고치지 않음), `docs/engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`, `src/lab/*.ts` 기존 모듈과 정책 주석
- **접근:**
  1. `state.ts`: 운송 목적 확보를 `holds`(containerId → transitId)로 분리. `inTransit(s, sampleId)` 헬퍼 추가. 복사본에도 포함.
  2. `storage.ts`: `isFree`가 점유(`occupied`)와 확보(`holds`)를 모두 본다. `supports`로 등급 정확 일치 검사.
  3. `samples.ts`: 받기·분취·이동에 등급 검사, 분취 자식은 부모 등급 상속(기존 임시값 `AMBIENT` 제거), 분취에 격리·운송 검사, 폐기·이동에 운송 검사.
  4. `reservations.ts`: 예약에 만료 시각 검사·격리 검사, 소비에 격리·운송 검사, `advanceTime`은 `to`를 올리고 `expiresAt <= to` ACTIVE 예약을 `EXPIRED`로.
  5. `quality.ts`: `quarantine`·`release`가 같은 로직을 공유해 ACTIVE 시료의 격리 값만 바꿈.
  6. `transit.ts`: 시작 시 목적 확보, 도착 시 시료 이동·확보 해제, 취소 시 확보만 해제. 끝난 운송은 `TRANSIT_CLOSED`.
- **대안·트레이드오프:**
  - 목적 용기 확보를 `occupied`에 운송 ID로 넣기: 출발 용기 점유 해제·시료 containerId와 얽혀 `finish`·`move`가 복잡해짐 → 별도 `holds` 맵 채택
  - 운송 중 금지를 명령마다 `transit.status` 순회로 판정: 시료 수가 작아 비용 무시 가능, 단순함 우선
- **파일 계획:** 수정 `src/lab/{state,storage,samples,reservations,quality,transit}.ts`, 신규 `src/lab/lab.test.ts`. `types.ts`는 변경 없음.
- **위험:** 여러 규칙을 동시에 어기는 호출의 코드 순서 → engine.md E6.4대로 어느 코드든 허용, 테스트는 대표 코드만 고정
- **검증 계획:** 단위 테스트(격리·등급·만료·운송·원자성·재전송 11개 묶음), `tsc --noEmit`, `pnpm check`

## 계획과 달라진 점
- 없음

## 검증 결과
- 단위 테스트: `src/lab/lab.test.ts` 11개 통과, 전체 `vitest run` 139개 통과
- 타입: `tsc --noEmit` 통과
