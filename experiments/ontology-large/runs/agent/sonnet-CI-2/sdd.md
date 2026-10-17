# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, ontology.json, docs/ 5종, src/lab/ 전부, types.ts
- **접근:** 기존 모듈 구조 유지. 모든 변경은 `engine.run`의 작업 복사본 안에서 하므로 실패 시 원자성·재전송은 그대로 보장된다.
  - storage.ts `isFree`: 점유(`occupied`) + ACTIVE 운송의 목적 용기 확보를 함께 본다(트랜짓 맵을 스캔해 별도 상태를 만들지 않음).
  - samples.ts: receive/split/move에 `supports` 검사, 등급 값 검증, split은 부모 격리·운송 검사와 등급 상속, discard/move는 운송 검사.
  - reservations.ts: reserve에 격리·expiresAt 검증, consume에 격리·운송 검사, advanceTime 구현.
  - quality.ts, transit.ts 구현.
  - 공통 헬퍼 `inTransit(s, sampleId)`를 state.ts에 둔다.
- **대안·트레이드오프:** 목적 용기 확보를 `occupied` 맵에 넣는 안은 도착·취소 때 해제 누락 위험이 있어 파생 계산(스캔)으로 한다. 규모가 작아 비용 무시 가능.
- **파일 계획:** state.ts, storage.ts, samples.ts, reservations.ts, quality.ts, transit.ts, lab.ts(테스트 추가: lab.test.ts)
- **위험:** 소비·격리 검사 순서에 따라 코드가 달라져도 E6.4로 허용. 재전송 판정은 Engine.run이 맨 앞에서 한다.
- **검증 계획:** vitest로 명령별 정상·실패·원자성·재전송·이력 불변·만료 경계(expiresAt == now)를 테스트.

## 계획과 달라진 점
없음

## 검증 결과
pnpm check ALL PASS (타입체크·단위 테스트·기록 검사). 새 테스트 src/lab/lab.test.ts.
