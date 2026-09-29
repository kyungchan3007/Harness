# 0011 — 포트폴리오 README + 0001·0002 trace 누락 표기 — Trace

> ClauseLens 세션에서 작업해 이 태스크 자체의 자동 기록은 없습니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | PR #4 상태 확인 후 머지, `task/0011-readme-portfolio`, TASKS 0011 | 기존 PR에 커밋 추가하지 않고 새 태스크로 |
| 2 | CONTEXT | ClauseLens README 형식 분석, Notion 04 §4 "소급 작성 금지" 확인 | 0001·0002 trace가 원칙 위반임을 사용자에게 알리고 누락 표기로 결정받음 |
| 3 | PLAN | 누락만 남기면 게이트가 FAIL → 누락 표기 허용 범위를 "0008 미만"으로 제한 | 모든 태스크에 허용하면 trace 건너뛰기 구멍 |
| 4 | BUILD | `checkTrace`에 누락 표기 + 0008 미만 조건, 테스트 추가 → 34개 PASS | 0001·0002 trace를 누락 사실만으로 교체 |
| 5 | BUILD | README 재작성 (ClauseLens 구성) | 예시는 0009 e2e 원본에서, 시퀀스는 A·B를 이어 그리고 그 사실을 명시 |
| 6 | VERIFY | 현황표 "4 / 8" 오기 발견 → "4 / 9" | 실험 표 행 수와 대조 |
| 7 | VERIFY | awk 다이어그램 추출이 macOS awk 문법 오류 → Python으로 추출해 렌더, 이미지로 확인 | 도구 문제, 다이어그램 문제 아님 |
