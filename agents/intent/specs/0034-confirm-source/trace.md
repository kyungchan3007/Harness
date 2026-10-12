# 0034 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | DEFINE | 이슈 #50 → `task/0034-confirm-source` | 0033 SI-2 확인 위조가 근거. 게이트는 대화 기록을 못 보므로 hook에만 |
| 2 | BUILD | `transcript.mjs`(사람 메시지·답 대조) + `checkConfirmations` + hook 연결, typedText를 옮김 | 사람 메시지가 없는 기록(보조 에이전트)은 판단 보류 — 막으면 역할 분리 작업의 정상 확인까지 막힘 |
| 3 | VERIFY | 0033 대화 기록 재확인: SI-1 통과 · SI-2 3줄 모두 [확인 위조?] · SI-3 통과(칸이 "없음") | 기대대로 |
