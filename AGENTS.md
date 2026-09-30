# AGENTS.md — harness-lab 에이전트 허브

> 모든 AI 에이전트의 단일 진입점. Claude Code는 `CLAUDE.md → @AGENTS.md`로 읽습니다.
> 항상 컨텍스트에 로드되므로 짧게 유지하고, 세부 내용은 링크로 위임합니다.

## 0. 한 줄 요약

에이전트 하네스 실험용 TypeScript 샌드박스. 실험 대상 도메인은 쇼핑몰 할인·주문 엔진이고, 규칙의 단일 소스는 [domain.md](agents/context/domain.md)입니다.

## 1. 절대 규칙

1. **완료 전 게이트:** `pnpm check`가 PASS여야 "done"이라고 말할 수 있다.
2. **문서 먼저:** 모든 태스크는 `agents/intent/specs/NNNN-슬러그/`에 `prd.md`·`sdd.md`를 먼저 쓰고, 작업 내내 `trace.md`에 과정을 남긴다. 브랜치는 `task/NNNN-슬러그`(hooks 자동 기록 위치가 여기서 정해짐).
3. **클레임과 기록:** [TASKS.md](agents/orchestration/TASKS.md)에서 태스크를 점유하고, 끝나면 [JOURNAL.md](agents/JOURNAL.md)에 남긴다.
4. **실험은 기록한다:** 하네스 실험 결과(효과 있음/없음)는 [LEARNINGS.md](LEARNINGS.md)에 남긴다.
5. **커밋·이슈·PR에 허점·보완·토큰:** 태스크 커밋은 `[허점]` `[보완]` `[컨텍스트·토큰]` 섹션을 쓴다. 토큰은 `pnpm usage`가 자동으로 채우고, 누락 시 commit-msg hook이 커밋을 거부한다. [지침서](agents/harness/commit-and-issue.md)
6. **모든 브랜치는 이슈에서:** 이슈를 먼저 만들고 `gh issue develop`으로 브랜치를 만들어 연결한다. 기존 이슈의 fix는 새 이슈 없이 그 이슈에서 `fix/NNNN-슬러그`, fix 중 나온 공통 모듈·다른 기능·다른 도메인은 새 이슈. [지침서](agents/harness/branch-and-issue.md)

## 2. 계층

| 계층 | 위치 |
| --- | --- |
| Intent | [agents/intent/](agents/intent/) |
| Context | [architecture](agents/context/architecture.md) · [domain](agents/context/domain.md) |
| Harness | [agents/harness/](agents/harness/README.md) |
| Orchestration | [agents/orchestration/](agents/orchestration/TASKS.md) |

## 3. 작업 루프

`CLAIM → DEFINE(spec) → PLAN(SDD) → BUILD → GATE(pnpm check) → RECORD → REFLECT`
상세: [agents/harness/loop.md](agents/harness/loop.md)
