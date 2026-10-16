# 0040 — 연구실 시료 보관 엔진 — PRD

- **이슈:** #1

## 문제·목표

- **문제:** 에이전트 하네스의 상태 추적·기록·원자성·이력을 검증하려면 복잡한 규칙과 많은 상호작용이 필요하다.
- **목표:** 가상의 연구실 시료 보관 시스템을 구현한다. 요구사항은 8개 규칙(R1~R8)으로 명확하고, 명령 8개(receive, split, reserve, cancel, consume, discard, move, transferCustody)로 단계적 검증이 가능하다.
  - 코드는 `src/lab/lab.ts`에 `createLab(catalog: Catalog): Lab`을 내보낸다.
  - 함수 모양·결과 모양·오류 코드는 `src/lab/types.ts`에 정의되어 있고, 수정하지 않는다.
  - 메모리 안에서 한 번에 한 호출씩 처리하고, 실패는 예외가 아닌 `{ ok: false, code }`로 돌려준다.
- **비목표:** 저장소, 동시 실행, 실제 시각, 지속성.

## 애매한 곳·가정

- 없음 — 요청의 규칙 R1~R8과 공개 예시 5개가 모든 요구사항을 명확하게 정의한다.

## Acceptance

- [x] 모든 규칙 R1~R8을 만족하는 `createLab` 구현이 `src/lab/lab.ts`에 있다.
- [x] 기존 `src/lab/types.ts`는 수정하지 않는다.
- [x] 규칙마다 e2e 테스트 1개 이상이 있다 (특히 R2 수량 보존, R3 예약·소비, R7 같은 명령 다시 보내기).
- [x] 공개 예시 5개가 모두 통과한다.
- [x] `pnpm check` ALL PASS.

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
