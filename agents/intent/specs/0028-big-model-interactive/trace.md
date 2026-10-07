# 0028 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #36 → `task/0028-big-model-interactive` | 모호한 요청 묶음의 남은 칸(큰 모델 × 대화형) |
| 2 | BUILD | interactive.mjs에 groupKey·CLAUDE_BIN·CLI 버전 기록 | 결과 폴더가 0027 Haiku QI와 섞이지 않게, Opus는 앱 내장 CLI로 |
| 3 | VERIFY | 첫 실행 시도에서 Opus용 내장 CLI 경로가 없음 | 앱 업데이트로 2.1.286이 2.1.289로 바뀜 → 새 경로 확인, Opus 호출 시험 후 실행 |
| 4 | VERIFY | 6회 실행 → QI-sonnet-2 모델 쪽 거절 | `_invalid/`로 옮기고 같은 번호로 다시 |
| 5 | VERIFY | 첫 메시지에서 M1 질문 직접 확인 → 채점 | 6회 모두 스스로 배송비를 물음(새어 나감 없음) → 15/15 × 2 |
| 6 | RECORD | sdd·LEARNINGS·JOURNAL·README | 결론: 질문을 빠짐없이 뽑는 모델 + 답하는 사람 = 100% |
