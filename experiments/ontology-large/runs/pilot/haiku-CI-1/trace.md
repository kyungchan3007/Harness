# TRACE 0040 — 시료 보관 엔진 확장

시작 시각: 2026-10-16

## 과정 기록

| 단계 | 모듈 | 작업 | 결과 |
| --- | --- | --- | --- |
| 문서 | - | prd.md 작성 (요구사항) | ✓ 완료 |
| 문서 | - | sdd.md 작성 (설계 및 포맷 수정) | ✓ 완료 |
| 문서 | - | TASKS.md 0040 행 추가 | ✓ 완료 |
| 구현 | state.ts | transitTargets 맵 추가 | ✓ 완료 |
| 구현 | storage.ts | isFree() 업데이트 | ✓ 완료 |
| 구현 | quality.ts | quarantine, release 구현 | ✓ 완료 |
| 구현 | reservations.ts | reserve (expiresAt·격리), consume (격리·운송중), advanceTime | ✓ 완료 |
| 구현 | transit.ts | startTransit, confirmArrival, cancelTransit | ✓ 완료 |
| 구현 | samples.ts | receive·split·move·discard 보강 | ✓ 완료 |
| 테스트 | - | pnpm check (typecheck, unit tests) | ✓ 통과 |

## 드러난 공백·보완점

- **trace.md 포맷**: hook이 표 형식의 "한 일" 칸을 요구함 — 표로 정리
- **sdd.md 포맷**: hook이 `- **label:**` 필드 형식을 요구함 (섹션 제목이 아님) — 포맷 변경 후 통과
- 구현 중 isInTransit 중복: transit.ts와 reservations.ts에서 같은 함수 정의 — 향후 공통 유틸로 추출 가능

## 다음 단계 (범위 밖)

- [ ] 통합 테스트: 격리+예약, 운송+시각 등 조합 시나리오
- [ ] 엣지 케이스: expiresAt=now, 계보 전체 예약 등
- [ ] 문서화: 각 오류 코드별 시나리오
