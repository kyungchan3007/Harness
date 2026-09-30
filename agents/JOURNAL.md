# JOURNAL — 태스크 목차 (append-only)

태스크당 한 줄. 자세한 과정은 각 태스크 폴더의 `trace.md`(직접)·`trace.auto.jsonl`(자동)에 있다.

| 날짜 | 태스크 | 결과 | 드러난 공백 | 기록 |
| --- | --- | --- | --- | --- |
| 2026-09-29 | 0001 뼈대 구성 | 게이트 ALL PASS | CI 없음 → 0007 | [trace](intent/specs/0001-bootstrap/trace.md) |
| 2026-09-29 | 0002 장바구니 금액 계산 | 테스트 13개, ALL PASS | 규칙↔테스트 누락을 게이트가 못 잡음 | [trace](intent/specs/0002-cart-pricing/trace.md) |
| 2026-09-29 | 0008 PRD·SDD·Trace 분리 + hooks 자동 기록 | 테스트 19개, e2e 2종, ALL PASS | 이 태스크 자체는 harness-lab 밖 세션이라 자동 기록 없음 | [trace](intent/specs/0008-trace-observability/trace.md) |
| 2026-09-29 | 0009 기록 강제 장치 | 테스트 33개, e2e 2종(차단·Stop 돌려보냄), ALL PASS | 차단된 시도가 자동 기록에서 빠졌음 → 보완 / Bash 쓰기는 사후에만 잡힘 | [trace](intent/specs/0009-record-enforcement/trace.md) |
| 2026-09-29 | 0010 README 정리 | 흐름도·강제 장치·실험 현황 표, ALL PASS | 로드맵 0004가 0009와 중복이었음 → 대체 표기 | [trace](intent/specs/0010-readme/trace.md) |
| 2026-09-29 | 0011 포트폴리오 README + trace 누락 표기 | 테스트 34개, 다이어그램 2개 렌더, ALL PASS | 재구성 trace가 소급 작성 금지 원칙 위반 → 누락 표기(0008 이전만 허용) | [trace](intent/specs/0011-readme-portfolio/trace.md) |
| 2026-09-29 | 0012 역할 분리 실험 설계 | PRD·SDD·태스크 0013~0016, 테스트 35개, ALL PASS | 게이트 검사기 오탐(번호 목록) 발견·수정 / `agent_type` 미검증 | [trace](intent/specs/0012-role-split-design/trace.md) |
| 2026-09-29 | 0017 커밋·이슈 지침서 + 토큰 자동 집계 | 테스트 45개, git commit e2e 5종, ALL PASS | transcript 스트리밍 중복(2.6배 과대) / 제목을 트레일러로 오인 / prepare 생략 | [trace](intent/specs/0017-commit-issue-guide/trace.md) |
| 2026-09-29 | 0018 README 작업 루프 다이어그램 가독성 | 폭 1883 → 329px, GitHub 축소 없음 확인, ALL PASS | "렌더 성공"만 보고 표시 크기를 안 봤음 / 표 칸 나란히 배치는 GitHub에서 폭이 줄어듦 | [trace](intent/specs/0018-readme-diagram/trace.md) |
| 2026-09-30 | 0019 복기·체크박스 측정 도구 + ClauseLens 기준선 | 참조율 33%, 체크박스 방치율 61%, 테스트 53개 ALL PASS | 측정 과대(쓰려고 읽음)·Bash 쓰기 오분류를 원본 대조로 발견 | [trace](intent/specs/0019-recall-metrics/trace.md) |
