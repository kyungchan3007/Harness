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
| 2026-10-07 | 0028 큰 모델 + 대화형 (#36) | 숨겨진 테스트 Sonnet·Opus 대화형 15/15, 6회·M1 질문 직접 확인, ALL PASS | 앱 업데이트로 내장 CLI 경로 바뀜 / Sonnet 모델 쪽 거절 1번 / 정답 의도가 흔한 선택과 겹침 | [trace](intent/specs/0028-big-model-interactive/trace.md) |
| 2026-10-07 | 0029 설계 Opus + 구현 Haiku 조합 (#38) | 15/15, 1번 $1.35 (전부 Opus $0.98), 단계별 비용·토큰 실측, ALL PASS | 장치가 "커밋할까요?"를 질문으로 봐 Opus 턴 낭비(2회) / 큰 구현 손익분기 미측정 | [trace](intent/specs/0029-design-opus-build-haiku/trace.md) |
| 2026-10-08 | fix/0027 진행 확인은 질문이 아님 (#32) | 저장된 대화 재검증: 질문 28개 유지·"커밋할까요?" 2개 제외, 테스트 3개, ALL PASS | 첫 고침이 코드 속 `policy?`·인사말 "알려 주세요"를 질문으로 봄 / 검증 스크립트가 대화를 잘못 자름 | [trace](intent/specs/0027-ask-answer-continue/trace.md) |
| 2026-10-08 | 0030 흔하지 않은 정답 의도 (#41) | 추측 41% → 4%, 대화형 Opus 100% · Haiku 60%, 숨겨진 테스트 자체 검증 7/7, ALL PASS | Haiku는 M1을 안 물어 다른 답(M7)까지 무너짐 / 의도 세트 1개 | [trace](intent/specs/0030-uncommon-intent/trace.md) |
| 2026-10-09 | 0031 측정 도구 정정 (#43) | 체크 수동 지시 고친 도구 3·0·1회 = 손 확인 값, 테스트 5개, ALL PASS | 10/2 "2일 5회 증가"는 도구 오탐이었음 / 시간대 없는 시각이 KST로 해석됨 | [trace](intent/specs/0031-metrics-typed-requests/trace.md) |
| 2026-10-09 | fix/0031 파일을 넘는 중복 제거 (#43) | 줄을 합쳐 한 번에 toEvents, 재측정 값 그대로(3·0·1), ALL PASS | "여러 파일에 중복"은 틀린 서술(실제는 같은 파일 안) / 이식 이슈 확인에서 처음 보는 AI가 발견 | [trace](intent/specs/0031-metrics-typed-requests/trace.md) |
| 2026-10-11 | 0032 업무 값 가정 금지 + 확인 필요 멈춤 (#46) | 기존 6회 재채점: 멈춘 실행 0 → 6, 가정으로 지어낸 값 21/25가 사람 확인으로, 테스트 6개, ALL PASS | 규칙을 설명하는 내 prd 줄이 업무 값으로 잡힘 / 빈 확인됨·괄호 없는 확인 필요 구멍 / 몰래 지어냄 40%는 그대로 | [trace](intent/specs/0032-business-value-confirm/trace.md) |
| 2026-10-12 | 0033 업무 값 확인 규칙으로 새로 실행 (#48) | Haiku 3회: 3/3 멈춤 · 2/3 지시 없이 물음 · 숨겨진 테스트 73% (칸만 53%, 지시 87%), ALL PASS | 확인됨 위조 1회·답 받은 뒤 "없음"으로 덮기 1회 / 실행 이름 괄호 버그로 감시가 안 끝남 / 판정 AI는 대화를 못 봄 | [trace](intent/specs/0033-strict-rule-live/trace.md) |
| 2026-10-12 | 0034 (확인됨: 답) 대화 기록 대조 (#50) | 0033 재확인 SI-2 차단 / Haiku 3회: 3/3 물음 · 위조 통과 0 (시도 1회 막힘) · 숨겨진 테스트 80%, 테스트 8개, ALL PASS | "알아서 정해 주세요"면 확인됨으로 통과 / M1은 여전히 못 물음 / 비용 1.5배 | [trace](intent/specs/0034-confirm-source/trace.md) |
| 2026-10-13 | 0035 README 최신화 — 연구 질문·핵심 결과를 맨 위에 (#52) | 연구 한눈에 보기 + 실험 현황(29 완료·테스트 156개)·발견한 것 10개·로드맵 12줄, ALL PASS | prd에 사용자가 답하지 않은 "(확인됨: …)"을 적었다가 고침(0034가 막는 위조를 직접 함) / 표 밖 문장 누출 2건 | [trace](intent/specs/0035-readme-research/trace.md) |
| 2026-10-13 | 0036 다른 회사 검사자 — 같은 결함 코드를 Claude·Codex가 검사 (#56) | 심은 결함 짚음 Opus 23/23 · Haiku 20/23 · Codex 12/12(14개만), 정상 반려 Codex 2/2, 누출 0, 테스트 8개, ALL PASS | Codex 사용 한도로 12건 빠짐 / 정답 주석 힌트·테스트 요구·계산 도구·판정 줄 형식을 시범에서 발견 / 질문 도구 답은 0034가 위조로 봄 | [trace](intent/specs/0036-cross-vendor-roles/trace.md) |
| 2026-10-16 | 0037 온톨로지를 더하면 좋아지는가 — intent만 vs 문서형 vs 기계 판독형 (#58) | 시료 과제·숨겨진 45+대조 20, 파일럿 9 + 본 15 + 주입형 10 = 34번: A 93.7% · BI 92.1% · C 96.8% · CI 99.1%, 링크만 두면 온톨로지 읽기 26/26 0번, ALL PASS | 용어 혼동 채점은 25/25 "구별"로 판별력 없음, 과제가 작아 천장 근처(A 만점 0/5지만 93%대) → 과제 확대·다른 모델은 후속 |
| 2026-10-17 | 0038 온톨로지 큰 과제 — 흩어지고 빠진 규칙, Haiku·Sonnet × A·BI·CI (#60) | 장치 R1~R12·숨겨진 49+회귀 45+대조 20·틀린 구현 19 / 파일럿 12(CLI) → 본 실험 CLI 13회에서 크레딧 소진 → 서브에이전트 30회: 빠진 규칙 6조건 모두 100, 만점 28/30, 검사 차단 0 · ALL PASS | 번들 CLI가 Console 키로 로그인돼 있었음(구독 아님). 서브에이전트 실행은 모델 버전·주입 방식·상한이 CLI와 달라 결과를 섞지 않음. 다음: Dayro 적용 판단(dayro-analysis.md) |
| 2026-10-27 | 0039 Self-Harness 축소판 — 실패 신고로 AGENTS.md 자동 개선 (#62) | Codex 설계 2라운드(블로커 7 반영) · 장치 experiments/self-harness(격리 채점 · 단계별 공개 규칙 · 대화 기록 실측) · 파일럿 H0 5회: 학습 100 ×5, 문서 스스로 찾음 5/5 → 판별 불가 종료 · ALL PASS | 외부 쓰기 감지가 명령 중간 경로를 놓침(보고로 발견 후 수정) / 무효 3/5가 전부 "밖에 로그 쓰기" — 다음 무대 후보 | [trace](intent/specs/0039-self-harness/trace.md) |
