# 0010 — README 정리 — Trace

> ClauseLens 세션에서 작업해 이 태스크 자체의 자동 기록은 없습니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | `main` 최신화 후 `task/0010-readme`, TASKS 0010 in-progress | 0009 머지 이후라 강제 장치 적용 상태에서 시작 |
| 2 | CONTEXT | 기존 README·TASKS 확인 → 로드맵 0004가 0009에서 이미 구현됨 발견 | TASKS에 "0009로 대체" 표기, README 로드맵도 맞춤 |
| 3 | DEFINE·PLAN | prd·sdd 작성 | 흐름도는 이미지 대신 mermaid(텍스트라 갱신·diff 가능) |
| 4 | BUILD | README 재작성: 왜(표) → 흐름도(mermaid) → 기록 4종 → 강제 4지점 → 실험 현황 → 사용법 → 구조 | 문장은 요약과 "왜"만, 나머지는 표 |
| 5 | BUILD | Write가 "먼저 Read 필요"로 실패 → 읽고 재작성 | 되돌림 1회. 같은 턴의 링크 검사는 옛 README 대상이라 무효 처리 후 재실행 |
| 6 | VERIFY | 링크 검사 통과, mermaid 첫 검증은 셸 프로세스 치환 탓에 실패 → 파일로 재검증해 렌더 성공 | 도구 문제와 문법 문제를 구분 |
