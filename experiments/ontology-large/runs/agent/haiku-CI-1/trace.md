# 0040 — Trace

에이전트가 작업하는 동안 직접 남긴 판단·이유·막힘·되돌림 기록. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남긴다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 브랜치 `task/0040-lab`(이슈 #1)에서 시작, 태스크 폴더 `specs/0040-lab/` 생성, TASKS 행 추가 | 요청이 준 번호·이슈·브랜치를 그대로 사용 |
| 2 | EXPLORE | `src/lab/*`, `docs/*`, `types.ts`, `ontology.json`, 온톨로지 검사 테스트 읽음 | 온톨로지 검사가 I1~I14와 시드 탐색으로 공개 계약을 검사하므로 기준으로 삼음. 베이스라인에서 시드 10의 I13 위반 확인(예약 만료 미구현) |
| 3 | DESIGN | 확보는 `State.held`(용기→운송 ID)로, 운송 중 판정은 `inTransit`으로 | 확보를 `occupied`에 섞으면 I2(용기당 시료 하나) 검사가 흐려짐 → 별도 맵 |
| 4 | BUILD | 분취 자식 등급을 `"AMBIENT"` 임시값에서 부모 등급 상속으로 교체 | docs/storage.md와 samples.ts 주석이 상속을 요구, TODO 제거 |
| 5 | BUILD | `receive`에 등급 값 검사(`isGrade`) 추가 | ontology.json의 receive 조건 "등급 값(INVALID_INPUT)"을 따름 |
| 6 | BUILD | 격리·운송 검사를 명령별로 배치: 분취·소비·폐기·직접 이동은 운송 중 거절, 소비·분취는 격리 거절, 예약·격리·해제·책임자 변경은 허용 | docs/quality.md·docs/transit.md의 허용·금지 목록을 그대로 옮김 |
| 7 | BUILD | `advanceTime`은 `to < now`를 거절하고, 만료 시각 ≤ to인 ACTIVE 예약을 한 번에 EXPIRED 처리 | docs/reservations.md 경계 포함 판정(expiresAt ≤ now) |
| 8 | VERIFY | `vitest run src/lab agents/ontology` 실행 | 테스트 기대값 한 건 오류 발견(도착 후 같은 용기로 가는 운송을 `a`로 보내 `ID_TAKEN`이라 가정) → 실제 규칙은 `a`가 비어 있으므로 성공해야 함. 기대값을 고침 |
| 9 | VERIFY | 온톨로지 검사 14/14, 단위 테스트 12/12, `tsc` 통과 | 시드 40개 무작위 탐색 전체에서 I1~I14 위반 0 |
