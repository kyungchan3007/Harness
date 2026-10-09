# 0031 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #43 → `task/0031-metrics-typed-requests` | 0019는 이슈 제도 이전 작업이라 fix 브랜치를 걸 이슈가 없음 → 새 이슈 |
| 2 | EXPLORE | ClauseLens transcript의 오탐 22건을 메타 필드·주변 글자로 분류 | 원인 5가지(셸 출력·대화 요약·시스템 안내·붙여 넣은 글·uuid 중복) 확인. `<bash-input>`도 origin=human이라 메타만으로는 못 거름 |
| 3 | BUILD | typedText·요청형 CHECK_REQUEST·uuid 중복 제거·요약 제외·[보완] 기간 | 태그 없이 붙여 넣은 이슈 제목 목록은 기계로 구분 불가 → 요청형으로 좁힘 |
| 4 | VERIFY | 기간 테스트 실패 → 시간대 없는 시각이 KST로 해석됨 | 복기 쪽 문자열 비교(UTC)와 같게 UTC 고정 |
| 5 | VERIFY | ClauseLens 세 구간 재측정 → 3·0·1회 = 손 확인 값 | 고친 도구로 10/2 결론("2일 5회 증가")이 틀렸음을 다시 확인 |
| 6 | FIX | `fix/0031-cross-file-dedupe` — 파일 줄을 합쳐 toEvents 한 번 | 이식 이슈 #184를 처음 보는 AI가 "uuid 중복 제거가 파일을 못 넘는다" 지적 → 확인해 보니 맞음. 실제 중복은 한 파일 안이라 값은 그대로 |
