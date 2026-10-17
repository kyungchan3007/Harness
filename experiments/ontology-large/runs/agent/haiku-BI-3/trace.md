# 0040 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1, 브랜치 `task/0040-lab`(이미 체크아웃) | 요청 파일 지정대로 태스크 폴더 `0040-lab` 생성 |
| 2 | EXPLORE | `src/lab/` 모듈과 `docs/` 다섯 개, `types.ts` 읽음 | 격리·운송·advanceTime이 `throw` 미구현, `split`의 등급 상속이 임시값 `AMBIENT` |
| 3 | BUILD | state·storage·samples·reservations·quality·transit 수정 | 운송 목적 확보는 `holds` 맵으로 분리해 출발 점유와 섞지 않음 |
| 4 | BUILD | `lab.test.ts` 작성 | 정책 문서의 허용·금지 목록을 명령별로 고정 |
| 5 | VERIFY | 테스트 실패 2건은 테스트 작성 실수(순서·잘못된 단언)라 테스트를 고침 | 엔진 규칙이 아니라 검증 쪽 오류였음 |
| 6 | GATE | `tsc`·`vitest` 통과, 게이트에서 태스크 기록 누락 확인 | 기록 파일을 마지막에 작성 |
