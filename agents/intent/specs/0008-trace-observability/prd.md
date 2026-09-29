# 0008 — PRD·SDD·Trace 분리 + hooks 자동 기록 — PRD

- **문제:** 에이전트가 작업하는 과정이 블랙박스다. spec 한 파일에 요구사항과 설계가 섞여 있고, 실제로 무엇을 읽고 어디서 헤맸는지는 어디에도 남지 않는다.
- **목표:**
  - 태스크마다 폴더 하나에 `prd.md`(왜·무엇) · `sdd.md`(어떻게·검증) · `trace.md`(과정)를 둔다.
  - Claude Code hooks가 도구 호출을 `trace.auto.jsonl`에 자동으로 남긴다.
  - 에이전트 자체 기록(trace.md)과 자동 기록을 비교할 수 있게 한다.
- **비목표:** Codex 쪽 자동 기록, 대시보드, 기록 분석 자동화.

## Acceptance
- [x] 0001·0002 spec이 태스크 폴더의 prd/sdd/trace로 옮겨졌다
- [x] 템플릿이 prd/sdd/trace 세 개로 나뉘었다
- [x] hooks가 도구 호출을 현재 태스크 폴더의 `trace.auto.jsonl`에 기록한다 (브랜치 `task/NNNN-*` 기준)
- [x] 태스크 브랜치가 아니면 커밋되지 않는 위치에 기록한다
- [x] public repo이므로 비밀값으로 보이는 문자열을 가리고, 경로는 프로젝트 기준 상대 경로로 남긴다
- [x] hook이 실패해도 에이전트 작업을 막지 않는다
- [x] 게이트가 태스크 폴더마다 prd(Acceptance 포함)·sdd·trace가 있는지 검사한다
- [x] hook 로직 단위 테스트 + 실제 `claude -p` 실행으로 자동 기록 e2e 확인
- [x] `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
