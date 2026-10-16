# 0040 — 연구실 시료 보관 엔진 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | DEFINE | prd.md: 목표, 기능, 불변식, Acceptance 체크박스 5개, 애매한 곳·가정 3개 | PRD 문서 완성 |
| 2 | DEFINE | sdd.md: 설계(상태 머신·트랜잭션·멱등성), 대안·트레이드오프 4개, 검증 계획 | SDD 문서 완성 |
| 3 | BUILD | src/lab/lab.ts: createLab 함수 + 8개 명령 (receive/split/reserve/cancel/consume/discard/move/transferCustody) | 규칙 R1~R8 모두 구현 |
| 4 | BUILD | eventId 캐시 구현 + JSON.stringify로 args 비교 (R7 멱등성) | 같은 eventId 재전송 시 상태 변경 안 함 |
| 5 | BUILD | args 깊은 복사 (JSON.parse/stringify) | R8-3: 호출 후 넘긴 객체를 고쳐도 이력은 그대로 |
| 6 | BUILD | DEPLETED/DISCARDED 상태에서 containerId를 null로 설정 | I2: 끝난 시료는 용기 없음 |
| 7 | VERIFY | typecheck 통과, 단위 테스트 139개 모두 통과 | 불변식 I1~I11 자동 검증 통과 |
