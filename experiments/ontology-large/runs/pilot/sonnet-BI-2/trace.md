# 0040 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1, 브랜치 `task/0040-lab`(이미 체크아웃), TASKS.md 점유 | 사용자가 이슈·브랜치를 이미 준비함 |
| 2 | EXPLORE | docs 5개·types.ts·src/lab 모듈 읽음 | 미구현 3곳(quality·advanceTime·transit)과 TODO 2곳(분취 등급, supports 연결) 확인 |
| 3 | DEFINE/PLAN | prd·sdd 작성 | 운송 확보는 occupied 맵 재사용(isFree 주석 정책) |
| 4 | BUILD | 첫 Edit이 가드에 막힘 — 가정 줄에 (가정) 표시 누락, "업무 수치" 줄이 업무 값 규칙에 걸림 | 해당 줄은 애매한 점이 아니라 삭제. 가드가 의도대로 동작 |
| 5 | BUILD | 격리·등급·만료·운송 구현, 분취 자식 등급 임시값 제거 | 검사 순서는 재전송(run)이 맨 앞이라 안전. 상태 변경은 모든 검사 뒤 |
| 6 | VERIFY | 테스트 22개 작성, tsc 인덱스 접근 오류 3건 수정 | 운송 중 허용 명령(reserve·cancel·custody·격리·시각)도 테스트로 고정 |
