# 0040 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1, 브랜치 task/0040-lab에서 시작 | 지정된 번호 |
| 2 | EXPLORE | types.ts·docs 5종·ontology·src/lab 전체 읽음 | 분취 등급은 samples.ts 주석(상속), 점유는 storage.ts 주석(운송 확보)에 정책이 있음 |
| 3 | BUILD | 격리, 등급 연결, advanceTime·만료 검증, 운송 구현 | 목적 확보를 occupied 재사용으로 처리해 isFree 한 곳에서 모든 충돌을 막음 |
| 4 | VERIFY | lab.test.ts 6개 작성. 운송 테스트 1건이 용량 초과를 먼저 내 실패 | 구현이 아니라 테스트 가정 오류(다중 위반은 코드 자유, E6.4) → 해당 줄 삭제 |
