# 0040 — 시료 보관 엔진 확장 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1, 브랜치 task/0040-lab 사용, TASKS 행 추가 | 이미 만들어진 이슈·브랜치 사용 |
| 2 | DEFINE | docs 5개·ontology·src/lab 읽고 prd 작성 | 요청은 요약이라 정책 문서가 기준 |
| 3 | PLAN | 목적 용기 확보를 State.held로 분리 | isFree 한 곳에서 receive/split/move/startTransit 모두 막힘 |
| 4 | BUILD | 격리·등급·만료·운송 구현, 자식 등급 임시값 제거 | samples.ts 정책 주석: 부모 등급 상속 |
| 5 | GATE | 테스트·pnpm check | |
