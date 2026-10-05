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
| 2026-09-30 | 0021 이슈·브랜치 연결 규칙 (#10) | 테스트 57개, e2e 6종, issue-link 확인, ALL PASS | 연결 여부는 오프라인 게이트로 못 봄 → 별도 명령 / e2e 절차 실수 1회 | [trace](intent/specs/0021-issue-branch-rule/trace.md) |
| 2026-09-30 | 0020 복기 주입 + 체크박스 동기화 (#12) | 테스트 67개, e2e 5종, issue-sync 실동작, ALL PASS | 주입 ≠ 반영(행동 변화는 미측정) / 이슈·prd 따로 쓰면 즉시 어긋남 / 테스트 흔적이 실제 기록에 섞임 | [trace](intent/specs/0020-recall-and-checkbox-sync/trace.md) |
| 2026-09-30 | 0013 역할 식별 확인 + 역할별 권한 강제 (#14) | 프로브로 agent_type 확인, 테스트 86개, 실제 보조 에이전트 e2e 5종, ALL PASS | 역할 없는 메인 대화는 우회 가능 / "막혔다"만 보면 누가 막았는지 놓침 | [trace](intent/specs/0013-role-permissions/trace.md) |
| 2026-09-30 | 0014 검사자 판정 흐름 (#16) | 테스트 93개, 실제 반려→수정→통과 e2e, ALL PASS | 준비 커밋 메시지가 검사자에게 힌트로 새어 나감 / 판정서 내용의 사실 여부는 자동 기록과 대조해야 함 | [trace](intent/specs/0014-verdict-flow/trace.md) |
| 2026-10-01 | 0015 실험 과제(쿠폰) + 숨겨진 채점용 테스트 (#18) | 채점 테스트 21개, 정답 21/21·틀린 구현 21개 전부 잡힘, 복사본 누출 0건, ALL PASS | 제외 경로 패턴 실수·복사본의 실험 폴더 연결을 누출 검사가 잡음 / 토큰 측정 시작 시각을 문구 검색으로 잡다가 내 명령어에 걸림 | [trace](intent/specs/0015-oracle-task/trace.md) |
| 2026-10-01 | 0016 역할 분리 실험 실행 (#21) | A 20.3 / B 9.7 / B′ 21.0 (21점 만점, 각 3회), 누출 접근 0, ALL PASS | 조율자의 요약 전달로 요구사항 손실 → B′ 추가 / 채점 기준이 세 번째 인자를 안 봄 / zsh 변수 분리 | [trace](intent/specs/0016-role-split-run/trace.md) |
| 2026-10-01 | 0022 원문 고정 강제 (#24) | BR 21·21·21 (같은 프롬프트의 0016 B 4·5·20), hook 직접 확인 4종, 테스트 115개, ALL PASS | 실험 복사본에 들어가는 문서에 힌트(함정 예시·점수)를 쓸 뻔함 / 실제 AI로는 차단을 못 일으킴 | [trace](intent/specs/0022-request-source/trace.md) |
| 2026-10-02 | 0023 채점표 세 번째 입력값 테스트 + 재채점 (#26) | 함정 22/22 확인, 재채점 12건(B-1·B-2만 T22 실패), ALL PASS | 타입만 다른 위반(Won→number)은 실행 테스트로 못 잡음 | [trace](intent/specs/0023-oracle-shipping-policy/trace.md) |
| 2026-10-04 | 0024 모호한 요청 실험 (#28) | 몰래 지어냄 A 95% · Q 14% · BR 86%, 9회·판정·직접 확인, ALL PASS | 채점 AI가 "명시 안 함"이라 쓰고 assumed 판정 → 인용 필수로 강화 / 흔한 말의 숨은 뜻은 아무도 못 봄 | [trace](intent/specs/0024-ambiguity/trace.md) |
| 2026-10-05 | 0025 "애매한 곳·가정" 필수 칸 (#30) | 몰래 지어냄 AM 57% · BM 24% (0024 A 95% · BR 86%), 6회·판정·칸 직접 확인, ALL PASS | 템플릿 안내 줄이 검사를 통과하던 구멍 / 복사본 힌트 2곳 / 판정 AI에 hook 끼어듦 / 숨은 뜻은 칸으로도 못 잡음 | [trace](intent/specs/0025-assumption-field/trace.md) |
| 2026-10-05 | 0026 모호한 요청 — 큰 모델 (#31) | 몰래 지어냄 A: Haiku 95% → Sonnet·Opus 10%, BR: 86% → Sonnet 0%, Opus 지시 없이 3/3 물음, 15회·판정·직접 확인, ALL PASS | Opus는 설치된 CLI로 못 돌림 / Sonnet A 거절 3번 / 채점 AI = Sonnet | [trace](intent/specs/0026-bigger-models/trace.md) |
| 2026-10-05 | 0027 묻고 → 답 → 이어 가기 (#32) | 숨겨진 테스트 평소 27% → 대화형 87%, 지난 실행 16개 재채점, ALL PASS | 요청자 AI가 묻지 않은 답을 덧붙임(첫 3회 무효) / 채점 AI에 hook 끼어듦 / 정답 의도가 흔한 선택과 겹침 | [trace](intent/specs/0027-ask-answer-continue/trace.md) |
