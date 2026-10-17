# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, ontology.md, docs/engine·quality·storage·reservations·transit.md, src/lab 전체
- **접근:** 모든 명령이 `Engine.run`(재전송·작업 복사본·이력)을 거치므로 새 명령도 `run` 안에서 검사 후 변경만 한다. 운송이 확보한 목적 용기는 `State.held`(containerId→transitId)로 두고 `Storage.isFree`가 occupied와 held를 함께 본다. 운송 중 판정은 `inTransit(state, sampleId)`.
- **대안·트레이드오프:** held를 occupied에 섞는 안은 도착 시 구분이 어려워 별도 맵으로 분리(복사본에도 포함).
- **파일 계획:** state.ts(held, inTransit) · storage.ts(isFree) · samples.ts(등급·격리·운송 검사, 자식 등급 상속) · reservations.ts(expiresAt 검증, 격리·운송 소비 거절, advanceTime) · quality.ts · transit.ts · lab.test.ts
- **위험:** 오류 코드 우선순위는 문서상 자유. 만료·격리·운송 상호작용(만료는 격리·확보를 안 바꿈).
- **검증 계획:** 기능별 단위 테스트 + 재전송·원자성 확인, `pnpm check`.

## 계획과 달라진 점
없음

## 검증 결과
- `src/lab/lab.test.ts` 6개 통과, `pnpm check` 결과는 JOURNAL 참고.
