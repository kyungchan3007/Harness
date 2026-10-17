# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** `AGENTS.md`, `src/lab/types.ts`(계약, 수정 금지), `docs/engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`, `agents/ontology/ontology.json`(조건·불변식 I1~I14), 기존 `src/lab/*.ts` 정책 주석.
- **접근:** 명령마다 `engine.run` 본문에서 검사하고 성공하면 작업 복사본에 반영한다(기존 구조 유지). 운송 목적 확보는 `State.held`(용기 → 운송 ID)로 두고, `Storage.isFree`가 점유(`occupied`)와 확보(`held`)를 함께 본다. 운송 중 여부는 `state.inTransit`으로 판정한다.
- **대안·트레이드오프:**
  - 확보를 `occupied`에 섞어 넣는 방법: 점유 시료 ID와 운송 ID가 같은 맵에 섞여 I2(용기당 시료 하나) 검사가 흐려져 버림.
  - 별도 `held` 맵: 상태가 하나 늘지만 I2·I14 판정이 분리되어 읽기 쉬움. 채택.
  - 자식 등급을 호출자 입력으로 받는 방법: 문서가 "호출자가 지정하지 않는다"고 명시해 버림.
- **파일 계획:**
  - `src/lab/state.ts`: `held` 추가, `copyState`·`initialState` 갱신, `inTransit` 추가
  - `src/lab/storage.ts`: `isFree`가 `held` 반영, `STORAGE_GRADES`·`isGrade` 추가
  - `src/lab/samples.ts`: receive·split·move에 등급 검사, split 자식 등급을 부모 등급으로, split·discard·move에 격리·운송 검사 (`receive`의 등급 값 검사 포함)
  - `src/lab/reservations.ts`: reserve에 만료 시각 검사·격리 검사, consume에 격리·운송 검사, `advanceTime` 구현
  - `src/lab/quality.ts`: `quarantine`·`release` 구현
  - `src/lab/transit.ts`: `startTransit`·`confirmArrival`·`cancelTransit` 구현
  - `src/lab/lab.test.ts`: 새 규칙 단위 테스트 (신규)
  - 수정하지 않음: `src/lab/types.ts`, `docs/*`, `agents/ontology/*`
- **위험:**
  - 여러 규칙을 어기는 명령의 오류 코드 우선순위는 구현 순서에 따른다 (engine E6.4가 허용).
  - 운송 목적 용기를 `held`로만 막으므로, 확보 해제 누락 시 용기가 영구 잠긴다. 완료·취소 두 경로 모두 `held.delete`를 한다.
- **검증 계획:**
  - 단위 테스트: 격리·등급·만료·운송 규칙별로 성공·실패 코드와 스냅숏 결과 확인
  - 기존 온톨로지 검사(`agents/ontology/check.test.ts`, 시드 40개 무작위 탐색 + I1~I14)로 불변식 확인
  - `pnpm exec tsc --noEmit`, `pnpm check` 전체 게이트

## 계획과 달라진 점
- 시료 등급 검사를 `receive`에서 등급 값 검사(`isGrade`)와 용기 지원 검사 두 단계로 나눔. 계획에는 없던 INVALID_INPUT 검사를 추가함(ontology.json 조건과 맞추기 위해).
- 테스트 한 건의 기대값을 잘못 써서 고침: 도착 후 시료는 목적 용기 `c`에 있으므로 출발 용기 `a`로의 새 운송은 성공해야 한다. 구현 결함이 아니라 테스트 기대값 오류였다.

## 검증 결과
- `pnpm exec vitest run src/lab agents/ontology`: 26개 통과 (lab 단위 12, ontology 14)
- `pnpm exec tsc --noEmit`: 통과
- `bash agents/harness/evals/checks.sh`: ALL PASS (단위 테스트 전체 154개, 태스크 기록 13개 폴더 확인)
