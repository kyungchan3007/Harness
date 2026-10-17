# 0040 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0040`으로 확인).

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 브랜치 `task/0040-lab`(이슈 #1) 확인 | 요청이 이미 체크아웃된 브랜치로 지정됨 |
| 2 | DEFINE | `prd.md`·`sdd.md` 작성 | 가드 규칙상 `src/` 수정 전에 spec이 먼저 있어야 함 |
| 3 | EXPLORE | `src/lab/*.ts`, `docs/` 5개, `types.ts` 전부 읽음 | 기존 명령 구조(`Engine.run` + 본문 검사)를 그대로 따르기로 함 |
| 4 | BUILD | `state.ts`에 `claims` 추가, `storage.ts`·`samples.ts`·`reservations.ts`·`quality.ts`·`transit.ts` 구현 | 운송 목적 확보를 `occupied`가 아닌 별도 맵으로 둠 — 출발 용기와 목적 확보가 한 맵에서 섞이면 도착·취소 때 시료 ID로 헷갈림 |
| 5 | BUILD | 분취 TODO(등급 `AMBIENT` 고정) 제거, 부모 등급 상속으로 교체 | 정책(`storage.md`)이 상속을 요구. 주석의 TODO는 이 변경으로 해소 |
| 6 | VERIFY | `tsc` 통과, 단위 테스트 1건 실패 | 실패 원인은 테스트 쪽: 용기 C가 CHILLED를 지원하는데 거절을 기대함. 용기 B(FROZEN 전용)로 고쳐 기대를 맞춤. 구현은 그대로 둠 |
| 7 | GATE | `checks.sh` 첫 실행 FAIL — PRD 가정 표기·trace·TASKS 행 누락 | 기록 검사 실패. 가정 줄에 `(가정)`·`(확인됨)` 표기 후 trace·TASKS 추가 |

## 계획과 달라진 점
- 없음 (운송 확보 표현은 sdd에서 `claims`로 정했고 구현도 같음)
