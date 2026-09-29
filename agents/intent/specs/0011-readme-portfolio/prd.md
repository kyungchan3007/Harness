# 0011 — 포트폴리오 README + 0001·0002 trace 누락 표기 — PRD

- **문제:**
  - README가 정보는 있지만 포트폴리오로 보기엔 밋밋하다. ClauseLens README와 톤·구성이 다르다.
  - 0001·0002의 `trace.md`는 사후에 재구성한 기록이다. AI Harness 원칙("완료 후 소급 작성 금지, 누락 사실만 기록")과 어긋난다.
- **목표:**
  - ClauseLens README와 같은 형식(가운데 헤더·배지·목차·현황표·번호 흐름도·한 줄 요약·실제 예시·로드맵·푸터)으로 README를 다시 꾸민다.
  - 0001·0002 trace는 재구성 표를 지우고 **누락 사실만** 남긴다.
  - 게이트가 누락 표기를 받아들이되, **trace 제도(0008) 이전 태스크에만** 허용해 앞으로 trace를 건너뛰는 구멍이 되지 않게 한다.
- **비목표:** 영어 README, 이미지·GIF 제작, 하네스 동작 변경(누락 허용 범위 외).

## Acceptance
- [x] README: 가운데 정렬 헤더·배지·NOTE 콜아웃·목차
- [x] README: 실험 현황표(업데이트 날짜·PR 링크·범례)
- [x] README: 번호 붙은 작업 루프 흐름도 + 한 줄 요약
- [x] README: 강제 장치 시퀀스 다이어그램(실제 e2e 흐름 기반)
- [x] README: 실제 자동 기록 예시(`trace.auto.jsonl` 차단 항목)
- [x] README: 발견한 것, 도메인, 구조, 기술 스택, 실행 방법, 로드맵, 푸터
- [x] 0001·0002 trace: 재구성 표 삭제, 누락 사실만
- [x] 게이트·hooks: 누락 표기는 0008 이전 태스크만 허용, 이후 태스크는 여전히 FAIL (단위 테스트)
- [x] `pnpm check` ALL PASS, README 링크·mermaid 검증

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
