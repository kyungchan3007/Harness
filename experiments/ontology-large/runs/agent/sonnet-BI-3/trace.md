# 0040 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1, 브랜치 `task/0040-lab`, TASKS 행 추가 | 저장소에 원격이 없어 `pnpm request` 대신 지시문을 request.md로 그대로 옮김 |
| 2 | EXPLORE | docs 5개·ontology·src/lab 전부 읽음 | 운송 점유는 `occupied` 재사용이 가장 안전(받기·분취·이동·운송 모두 isFree 하나로 막힘) |
| 3 | BUILD | quarantine/release, advanceTime 만료, 등급 연결·상속, 운송 3종, 운송 중 IN_TRANSIT | 목적 확보는 occupied 재사용, 운송 중 판정은 transits 조회. 자식 등급은 samples.ts 정책 주석대로 부모 상속(TODO 임시값 제거) |
| 4 | VERIFY | lab.test.ts 작성, 타입 오류(noUncheckedIndexedAccess) 수정 후 pnpm check | ALL PASS |
