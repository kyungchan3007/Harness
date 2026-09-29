# AGENTS.md — harness-lab 에이전트 허브

> 모든 AI 에이전트의 단일 진입점. Claude Code는 `CLAUDE.md → @AGENTS.md`로 읽습니다.
> 항상 컨텍스트에 로드되므로 짧게 유지하고, 세부 내용은 링크로 위임합니다.

## 0. 한 줄 요약

에이전트 하네스 실험용 TypeScript 샌드박스. 도메인은 메모 저장소(`src/memo.ts`) 하나뿐입니다.

## 1. 절대 규칙

1. **완료 전 게이트:** `pnpm check`가 PASS여야 "done"이라고 말할 수 있다.
2. **문서 먼저:** 모든 태스크는 `agents/intent/specs/NNNN-슬러그.md`(PRD+SDD)를 먼저 쓴다.
3. **클레임과 기록:** [TASKS.md](agents/orchestration/TASKS.md)에서 태스크를 점유하고, 끝나면 [JOURNAL.md](agents/JOURNAL.md)에 남긴다.
4. **실험은 기록한다:** 하네스 실험 결과(효과 있음/없음)는 [LEARNINGS.md](LEARNINGS.md)에 남긴다.

## 2. 계층

| 계층 | 위치 |
| --- | --- |
| Intent | [agents/intent/](agents/intent/) |
| Context | [agents/context/architecture.md](agents/context/architecture.md) |
| Harness | [agents/harness/](agents/harness/README.md) |
| Orchestration | [agents/orchestration/](agents/orchestration/TASKS.md) |

## 3. 작업 루프

`CLAIM → DEFINE(spec) → PLAN(SDD) → BUILD → GATE(pnpm check) → RECORD → REFLECT`
상세: [agents/harness/loop.md](agents/harness/loop.md)
