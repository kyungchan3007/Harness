# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, ontology.json, architecture.md, docs/ 5개, `src/lab/*.ts` 전부, `types.ts`.
- **접근:** 기존 구조(`Engine.run`이 복사본에서 실행하고 성공 시에만 커밋)를 그대로 쓰고 모듈별 스텁을 채운다.
  - `state.ts`: 운송 중 판정 `inTransit(s, sampleId)`(ACTIVE 운송 탐색) 추가.
  - `storage.ts`: `supports`를 받기·분취·이동·운송에 연결. 운송 목적 확보는 `occupied`에 목적 용기→시료로 등록해 `isFree` 하나로 받기·분취·이동·운송 목적지를 모두 막는다(주석 갱신).
  - `samples.ts`: `receive`(등급 값 검증·적합성), `split`(격리·운송 중·자식 등급 상속·적합성), `discard`·`move`(운송 중, 이동 적합성).
  - `reservations.ts`: `reserve`(expiresAt 검증·격리), `consume`(격리·운송 중), `advanceTime`(검증·만료).
  - `quality.ts`: `quarantine`/`release`. `transit.ts`: 운송 3명령.
- **검사 순서(여러 개 어긋날 때 임의 허용):** 입력 값 → ID_TAKEN → 존재(UNKNOWN_*) → 시료 상태(NOT_ACTIVE) → 격리/운송 중 → 용기 점유 → 용량 → 등급 → 양(INSUFFICIENT).
- **대안·트레이드오프:** 목적 확보를 별도 맵으로 두는 안은 `isFree` 호출처마다 두 곳을 봐야 해 누락 위험이 크다. `occupied` 재사용은 `finish`가 시료의 `containerId`만 비우므로 안전(운송 중엔 종료 명령이 모두 막힘).
- **파일 계획:** `src/lab/{state,storage,samples,reservations,quality,transit}.ts` 수정, 테스트 `src/lab/lab.test.ts` 신규. `types.ts`·`lab.ts`·`events.ts`는 그대로.
- **위험:** 원자성(실패 시 무변경)은 `run`의 복사본에 의존 — 본문에서 변경은 모든 검사 뒤에만 한다. 분취는 자식 전부 검사 후 반영.
- **검증 계획:** 명령별 성공·실패·경계(만료 `==now`, 같은 시각 진행), 재전송·충돌, 실패 후 스냅숏 동일 테스트 + `pnpm check`(`onto:check` 무작위 불변식 포함).

## 계획과 달라진 점
없음 — 계획한 파일·방식 그대로 구현했다. 단, prd 가정 줄의 표기 형식을 hook(guard)에 맞게 한 번 고쳤다.

## 검증 결과
- `src/lab/lab.test.ts` 신규 14개(등급·격리·만료 경계·운송·재전송/충돌·무변경) 통과.
- `pnpm check` ALL PASS: typecheck, 전체 테스트 155개(`onto:check`의 I1~I14 무작위 불변식 포함), lockfile, 태스크 기록.
- 미검증: 커밋·PR·이슈 동기화(`pnpm issue-sync`)는 요청이 없어 하지 않았다.
