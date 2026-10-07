# 0029 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #38 → `task/0029-design-opus-build-haiku` | 0028에서 나온 "정하기 Opus, 만들기 Haiku" 가설 검증 |
| 2 | BUILD | interactive.mjs 조합 모드 + phaseUsage, 단위 테스트 | 넘김은 문서 파일만(요약 없음), 0028에선 토큰을 안 남겨 "왜 싼가"를 미루어 봤음 → 이번엔 단계별 실측 |
| 3 | VERIFY | MIX 3회 실행 → 2회가 문답 2번, 비용 $2.06·$2.21 | 대화를 읽어 보니 Opus의 "커밋할까요?"를 장치가 질문으로 봄 → 실제 사용엔 없는 비용이라 표에선 빼고 원래 값도 함께 기록 |
| 4 | VERIFY | 채점 15/15, 문서·구현 함수 모양 대조, designedCode 확인 | Haiku가 지어낸 값 없음 — 문서로 넘기면 정확도 유지 |
| 5 | VERIFY | 단계별 비용 분해 | 비싼 건 Opus의 "넘길 문서 쓰기"($0.73). Haiku 구현은 요청 34번이지만 $0.28 |
| 6 | RECORD | sdd·LEARNINGS·JOURNAL·README | 결론: 정확도는 같고 작은 작업에선 전부 Opus가 더 쌈(약 1.4배 차) |
