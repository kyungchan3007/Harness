작업 폴더(저장소 루트): /var/folders/ht/prc2m2q939d1l29154xtvtmw0000gn/T/run-Vp6bDR
모든 파일 경로는 이 폴더 기준 절대 경로로, 모든 셸 명령은 `cd /var/folders/ht/prc2m2q939d1l29154xtvtmw0000gn/T/run-Vp6bDR && …`로 실행하세요. 이 폴더 밖은 읽거나 쓰지 마세요. 다른 에이전트(Agent·Task 도구)와 웹은 쓰지 마세요.

<repo-instructions>
Contents of /var/folders/ht/prc2m2q939d1l29154xtvtmw0000gn/T/run-Vp6bDR/AGENTS.md (project instructions):

# AGENTS.md — harness-lab 에이전트 허브

> 모든 AI 에이전트의 단일 진입점. Claude Code는 `CLAUDE.md → @AGENTS.md`로 읽습니다.
> 항상 컨텍스트에 로드되므로 짧게 유지하고, 세부 내용은 링크로 위임합니다.

## 0. 한 줄 요약

에이전트 하네스 실험용 TypeScript 샌드박스.

## 1. 절대 규칙

1. **완료 전 게이트:** `pnpm check`가 PASS여야 "done"이라고 말할 수 있다.
2. **문서 먼저:** 모든 태스크는 `agents/intent/specs/NNNN-슬러그/`에 `prd.md`·`sdd.md`를 먼저 쓰고, 작업 내내 `trace.md`에 과정을 남긴다. 브랜치는 `task/NNNN-슬러그`(hooks 자동 기록 위치가 여기서 정해짐).
3. **클레임과 기록:** [TASKS.md](agents/orchestration/TASKS.md)에서 태스크를 점유하고, 끝나면 [JOURNAL.md](agents/JOURNAL.md)에 남긴다.
4. **실험은 기록한다:** 하네스 실험 결과(효과 있음/없음)는 [LEARNINGS.md](LEARNINGS.md)에 남긴다.
5. **커밋·이슈·PR에 허점·보완·토큰:** 태스크 커밋은 `[허점]` `[보완]` `[컨텍스트·토큰]` 섹션을 쓴다. 토큰은 `pnpm usage`가 자동으로 채우고, 누락 시 commit-msg hook이 커밋을 거부한다. [지침서](agents/harness/commit-and-issue.md)
6. **모든 브랜치는 이슈에서:** 이슈를 먼저 만들고 `gh issue develop`으로 브랜치를 만들어 연결한다. 기존 이슈의 fix는 새 이슈 없이 그 이슈에서 `fix/NNNN-슬러그`, fix 중 나온 공통 모듈·다른 기능·다른 도메인은 새 이슈. [지침서](agents/harness/branch-and-issue.md)

## 2. 계층

작업을 시작하기 전에 아래 표의 **Context 문서를 모두 읽는다.**

| 계층 | 위치 |
| --- | --- |
| Intent | [agents/intent/](agents/intent/) |
| Context | [architecture](agents/context/architecture.md) · 정책 문서 [docs/](docs/) (`engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`) |
| Harness | [agents/harness/](agents/harness/README.md) |
| Orchestration | [agents/orchestration/](agents/orchestration/TASKS.md) |

## 3. 작업 루프

`CLAIM → DEFINE(spec) → PLAN(SDD) → BUILD → GATE(pnpm check) → RECORD → REFLECT`
상세: [agents/harness/loop.md](agents/harness/loop.md)

</repo-instructions>

아래 요청을 이 저장소의 규칙(AGENTS.md)대로 처리해 주세요.
작업 번호 0040, 이슈 #1(이미 있음), 브랜치 `task/0040-lab`(이미 체크아웃됨)입니다. 태스크 폴더는 `agents/intent/specs/0040-lab/`로 만드세요.

---
# 요청 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송

제공된 시료 보관 엔진(`src/lab/`)의 기존 기능을 그대로 유지하면서, 격리·보관 적합성·예약 만료·운송 기능을 추가해 주세요.
시작 코드는 기존 기능의 구현을 모듈로 나눈 것이며, 확장된 공개 계약(`src/lab/types.ts`)의 새 필드와 새 메서드 연결은 아직 미완성입니다.

- 공개 진입점은 `src/lab/lab.ts`의 `createLab(catalog: Catalog): Lab`입니다.
- `src/lab/types.ts`는 고치지 말고, 필요한 구현은 `src/lab/` 안에서 바꿔 주세요.
- 메모리 안에서 한 번에 한 호출씩 처리합니다. 실제 시계·외부 저장소·동시 호출은 다루지 않습니다. 실패는 예외가 아니라 `{ ok: false, code }`로 돌려줍니다.

## 격리
- `quarantine`·`release`는 ACTIVE 시료의 격리 여부를 설정합니다. 이미 그 상태여도 성공합니다.
- 격리된 시료의 분취·새 예약·예약 소비는 `QUARANTINED`로 거절합니다.

## 보관 등급
- 받을 때 시료의 요구 보관 등급(`storageGrade`)을 정하고, 용기마다 지원 등급 목록(`supportedGrades`)이 있습니다.
- 받기·분취·이동의 목적 용기가 시료의 요구 등급에 맞지 않으면 `STORAGE_INCOMPATIBLE`로 거절합니다.

## 예약 만료
- 논리 시각은 0에서 시작합니다. `advanceTime(eventId, to)`는 현재 이상인 유효한 절대 시각을 받고, 과거 시각은 `INVALID_INPUT`입니다.
- 새 예약의 만료 시각(`expiresAt`)은 기한 없음(`null`)이거나 현재보다 미래인 유효 시각이어야 합니다. 아니면 `INVALID_INPUT`.
- 시각이 진행돼 만료된 ACTIVE 예약은 `EXPIRED`가 되고 예약 양을 풀어 줍니다. 만료는 실제 남은 양·소비량·폐기량을 바꾸지 않습니다.

## 운송
- `startTransit`은 ACTIVE 시료의 운송을 고유한 운송 ID로 시작합니다. `confirmArrival`·`cancelTransit`으로 끝냅니다.
- 도착 확정은 시료를 목적 용기로 옮기고 운송을 `ARRIVED`로, 취소는 시료를 출발 용기에 둔 채 운송을 `CANCELED`로 하고 목적 용기 확보를 풉니다.
- 운송 중에는 분취·소비·폐기·직접 이동·추가 운송 시작을 `IN_TRANSIT`으로 거절합니다.

## 따를 계약
이 요청은 구현 범위를 요약한 것이며 전체 정책 목록이 아닙니다. **기존 문서와 코드 계약을 따르세요.** 적용할 계약은 `src/lab/types.ts`, `docs/`의 정책 문서 다섯 개(`engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`), 관련 구현 모듈의 정책 주석에 있습니다. 기존 재전송·원자성·이력 규칙은 새 명령에도 적용됩니다. 저장소에 적히지 않은 실제 연구실 관행은 더하지 마세요.


끝나면 마지막 메시지에 한 일과 게이트 결과를 5줄 이내로 적어 주세요.