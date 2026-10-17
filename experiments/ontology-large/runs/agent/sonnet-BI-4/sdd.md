# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** `docs/` 정책 5개, `src/lab/*` 정책 주석, ontology
- **접근:**
  1. `quality.ts`: 격리 여부만 설정(예약 불변)
  2. `samples.ts`: 분취(격리·운송 중 거절, 자식 용기 등급 검사, 자식 등급=부모), 폐기·이동에 운송 중 거절, 받기·이동에 등급 검사
  3. `reservations.ts`: `expiresAt` 검증, 격리·운송 중 소비 거절, `advanceTime`이 `expiresAt <= now`인 ACTIVE 예약을 EXPIRED로 하고 `reserved`만 감소
  4. `transit.ts`: 목적 용기를 `occupied`에 넣어 확보(기존 `isFree` 규칙 재사용), 도착 시 출발 용기 해제, 취소 시 목적 확보 해제
  5. `state.ts`: `activeTransit` 조회 도우미
- **대안·트레이드오프:**
  - 별도 확보 맵: `isFree`를 고쳐야 하고 놓치기 쉬워 기각
- **위험:** 실패 시 부분 변경 → 모든 명령이 작업 복사본에서 실행되므로 검사를 먼저, 변경은 마지막에
- **검증 계획:** `src/lab/lab.test.ts`, `pnpm check`

## 검증 결과
- 테스트 11개 통과, `pnpm check` ALL PASS
