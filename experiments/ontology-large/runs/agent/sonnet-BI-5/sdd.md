# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** ontology.md, docs/engine·quality·storage·reservations·transit.md, `src/lab/` 전체
- **접근:** 모든 명령은 `engine.run` 안에서 작업 복사본으로 실행(재전송·원자성은 기존 구조가 보장). 운송은 `transits` 맵의 ACTIVE 기록 + `occupied`에 목적 용기를 시료 점유로 넣어 `isFree` 하나로 확보 판정. `inTransit(s, id)` 헬퍼를 `state.ts`에 추가.
- **대안·트레이드오프:** 별도 `reserved containers` 맵 — 새 상태 복사 코드가 필요하고 `isFree` 규칙이 갈라져 기각.
- **파일 계획:** quality.ts(격리), reservations.ts(만료·검증·격리 검사), samples.ts(등급·격리·운송 중), transit.ts(운송), state.ts(헬퍼), lab.test.ts
- **위험:** 도착 시 출발 용기 해제 누락/목적 점유 중복. 취소 시 목적 해제 누락 → 테스트로 확인.
- **검증 계획:** 명령별 단위 테스트, 실패 시 스냅숏 불변, 재전송.

## 계획과 달라진 점
없음

## 검증 결과
- `src/lab/lab.test.ts` 9개 통과, `pnpm check` 결과는 trace 참고.
