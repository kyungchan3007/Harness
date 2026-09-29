# 0008 — PRD·SDD·Trace 분리 + hooks 자동 기록 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** loop.md, observability.md, Claude Code hooks 공식 문서(https://code.claude.com/docs/en/hooks)
- **접근:**
  - 태스크 폴더 `specs/NNNN-슬러그/`에 `prd.md` · `sdd.md` · `trace.md`(+ 자동 기록 `trace.auto.jsonl`).
  - `.claude/settings.json`에 SessionStart · UserPromptSubmit · PostToolUse · PostToolUseFailure · Stop hook 등록. 모두 같은 스크립트 `agents/harness/hooks/trace.mjs`를 부른다.
  - 기록 위치는 git 브랜치 `task/NNNN-*`로 정한다. 없으면 `.unassigned.jsonl`(gitignore).
  - 도구 결과(`tool_response`)는 기록하지 않는다. 무엇을 했는지만 남기고 내용은 남기지 않는다.
- **대안·트레이드오프:**
  - 에이전트 자체 기록만: 판단 이유는 남지만 누락·미화를 검증할 수 없다. → 자동 기록과 병행.
  - 자동 기록만: 빠짐없지만 "왜"가 없다. → 병행.
  - `transcript_path`의 전체 대화 로그를 복사: 가장 완전하지만 public repo에 대화 전문과 도구 출력이 올라간다. → 기각.
  - 기록 위치를 환경 변수나 현재 태스크 파일로 지정: 에이전트가 갱신을 잊으면 엉뚱한 곳에 쌓인다. → 브랜치 이름 기준(이미 루프에서 강제하는 규칙).
  - hook을 bash + jq로: 의존성(jq)이 생기고 테스트가 어렵다. → Node(.mjs), 순수 함수 분리 후 Vitest로 테스트.
- **파일 계획:** `.claude/settings.json`, `agents/harness/hooks/{trace,trace-report,trace.test}.mjs`, `agents/harness/evals/check-spec-folders.sh`, 템플릿 3종, 0001·0002 폴더 이전, loop·observability·README·AGENTS 갱신
- **위험:**
  - 비밀값 유출(public repo) → 패턴 기반 마스킹 + 경로 상대화 + 200자 제한. 패턴 밖의 비밀값은 못 막는다(한계로 명시).
  - hook 오류로 작업 중단 → 모든 예외를 잡고 exit 0.
- **검증 계획:** hook 순수 함수 단위 테스트, 실제 `claude -p` e2e(태스크 브랜치·비태스크 브랜치), 실패 입력 exit 코드 확인, `pnpm check`

## 계획과 달라진 점
- 경로 상대화에서 프로젝트 경로 단독 등장을 `.`로 바꿨더니 `directory is ..`처럼 헷갈려서 `<project>`로 변경.
- e2e 결과를 `sed`로 고쳐 증거로 쓰려다 되돌림. 증거는 수정 없는 원본이어야 한다 → 코드 수정 후 e2e 재실행.
- git이 없는 경로에서 `fatal:` 메시지가 stderr로 새서 `stdio`를 막음.

## 검증 결과
- 단위 테스트: hook 6개 포함 전체 19개 PASS
- e2e (`claude -p`, Haiku 4.5, 복사본 repo):
  - 태스크 브랜치: SessionStart · UserPromptSubmit · PostToolUse · PostToolUseFailure(`error` 포함) · Stop 5건이 `trace.auto.jsonl`에 기록됨 → 원본을 이 폴더에 보관
  - 프롬프트의 `API_KEY=fake-secret-123` → `API_KEY=[REDACTED]`
  - 비태스크 브랜치: `.unassigned.jsonl`에 기록, 태스크 폴더 기록 수 변화 없음, git에 잡히지 않음
- 실패 안전성: 깨진 JSON 입력, 쓸 수 없는 경로 모두 exit 0
- 한계: `matcher: ".*"`, `PostToolUseFailure.error` 필드명은 문서에 명확하지 않아 e2e로 확인함. Claude Code 버전이 바뀌면 재확인 필요.
