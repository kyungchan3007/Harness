# 0040 — 시료 보관 엔진 확장 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1, 브랜치 task/0040-lab 확인, TASKS 점유 | 이미 준비된 상태 |
| 2 | DEFINE·PLAN | prd·sdd 작성 | 문서·주석에 적힌 계약만 구현, 새 관행 추가 안 함 |
| 3 | BUILD | quality·reservations·samples·transit 구현, state에 inTransit 추가 | 목적 용기 확보를 점유 맵에 올려 isFree 하나로 처리 |
| 4 | 막힘 | hook이 prd 가정 줄에 (가정) 표시 없다고 차단 | 표시를 달고 재시도 |
| 5 | GATE | 첫 실행 실패: 테스트의 undefined 기본 인자 함정·타입 오류 | 테스트 쪽 실수라 테스트만 수정, 구현 변경 없음 → ALL PASS |
