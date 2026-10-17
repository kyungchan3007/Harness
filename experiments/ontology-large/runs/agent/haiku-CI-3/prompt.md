작업 폴더(저장소 루트): /var/folders/ht/prc2m2q939d1l29154xtvtmw0000gn/T/run-2QkHbD
모든 파일 경로는 이 폴더 기준 절대 경로로, 모든 셸 명령은 `cd /var/folders/ht/prc2m2q939d1l29154xtvtmw0000gn/T/run-2QkHbD && …`로 실행하세요. 이 폴더 밖은 읽거나 쓰지 마세요. 다른 에이전트(Agent·Task 도구)와 웹은 쓰지 마세요.

<repo-instructions>
Contents of /var/folders/ht/prc2m2q939d1l29154xtvtmw0000gn/T/run-2QkHbD/AGENTS.md (project instructions):

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
| Context | [architecture](agents/context/architecture.md) · 정책 문서 [docs/](docs/) (`engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`) · [ontology](agents/ontology/ontology.json) (도메인 개념·관계·불변식, 검사: `pnpm onto:check`) |
| Harness | [agents/harness/](agents/harness/README.md) |
| Orchestration | [agents/orchestration/](agents/orchestration/TASKS.md) |

## 3. 작업 루프

`CLAIM → DEFINE(spec) → PLAN(SDD) → BUILD → GATE(pnpm check) → RECORD → REFLECT`
상세: [agents/harness/loop.md](agents/harness/loop.md)


Contents of /var/folders/ht/prc2m2q939d1l29154xtvtmw0000gn/T/run-2QkHbD/agents/ontology/ontology.json (imported by CLAUDE.md):

{
 "note": "요청·docs·코드 주석·types에 흩어진 규칙을 기계가 읽는 형태로 다시 정리한 것. 새 규칙 없음. 원출처와 다르면 원출처가 기준. source = 원출처. 검사: pnpm onto:check",
 "concepts": [
  {
   "id": "장소·용기·책임자",
   "def": "처음 목록에만 존재. 용기는 장소 하나에 고정, 용량과 지원 보관 등급 목록(`supportedGrades`)",
   "source": "engine.md 대상, types"
  },
  {
   "id": "시료",
   "def": "용기에 담긴 액체(정수 μL). 요구 보관 등급(`storageGrade`)·격리 여부(`quarantined`)가 있음",
   "source": "engine.md, storage.md, quality.md"
  },
  {
   "id": "시작 시료 / 자식 시료",
   "def": "`receive`로 만든 계보의 시작 / `split`으로 부모에서 나눈 시료",
   "source": "engine.md E2"
  },
  {
   "id": "예약",
   "def": "시료의 일정량을 쓰겠다고 잡아 둔 것. 만료 시각(`expiresAt`, null=기한 없음)",
   "source": "reservations.md"
  },
  {
   "id": "논리 시각 `now`",
   "def": "0에서 시작, `advanceTime`으로만 진행",
   "source": "요청, reservations.md"
  },
  {
   "id": "운송",
   "def": "시료를 다른 용기로 옮기는 2단계 절차",
   "source": "요청, transit.md"
  },
  {
   "id": "이벤트 / 영수증",
   "def": "성공한 명령 하나의 기록 / { eventId, seq }",
   "source": "engine.md E5·E6"
  }
 ],
 "quantities": [
  {
   "id": "remaining",
   "def": "용기에 실제로 남은 양",
   "source": "engine.md"
  },
  {
   "id": "reserved",
   "def": "ACTIVE 예약 양의 합",
   "source": "reservations.md"
  },
  {
   "id": "available",
   "def": "remaining − reserved",
   "source": "reservations.md"
  },
  {
   "id": "consumedQty / discardedQty",
   "def": "소비 누적 / 폐기 누적",
   "source": "reservations.md, engine.md E3"
  }
 ],
 "relations": [
  {
   "relation": "용기 → 장소",
   "card": "1:1",
   "mutable": "안 바뀜",
   "source": "engine.md"
  },
  {
   "relation": "ACTIVE 시료 → 용기",
   "card": "시료 1 : 용기 1, 용기 1 : 시료 0..1",
   "mutable": "move·도착 확정으로",
   "source": "engine.md E1, transit.md"
  },
  {
   "relation": "끝난 시료 → 용기",
   "card": "없음(containerId null)",
   "mutable": "—",
   "source": "engine.md E3"
  },
  {
   "relation": "ACTIVE 운송 → 목적 용기",
   "card": "운송 1 : 용기 1, 용기 1 : ACTIVE 운송 0..1 (배타적 확보)",
   "mutable": "운송이 끝나면 풀림",
   "source": "transit.md, storage.ts 주석"
  },
  {
   "relation": "자식 → 부모, 시료 → 시작 시료",
   "card": "1:1",
   "mutable": "안 바뀜",
   "source": "engine.md E2"
  },
  {
   "relation": "자식의 책임자·보관 등급",
   "card": "분취 순간 부모의 것을 이어받음",
   "mutable": "등급은 이후 안 바뀜",
   "source": "engine.md E4, samples.ts 주석, storage.md"
  },
  {
   "relation": "예약 → 시료, 운송 → 시료",
   "card": "n:1",
   "mutable": "안 바뀜",
   "source": "reservations.md, transit.md"
  }
 ],
 "states": [
  {
   "target": "시료 생애",
   "states": "ACTIVE → DEPLETED(분취·소비로 0) / DISCARDED(discard)",
   "transitions": "끝난 상태는 되살릴 수 없음",
   "source": "engine.md E3"
  },
  {
   "target": "시료 격리",
   "states": "quarantined true/false (생애와 따로)",
   "transitions": "quarantine·release, 같은 값이어도 성공",
   "source": "요청, quality.md"
  },
  {
   "target": "예약",
   "states": "ACTIVE → CANCELED / CONSUMED / EXPIRED",
   "transitions": "끝난 예약에 cancel·consume → RESERVATION_CLOSED",
   "source": "reservations.md"
  },
  {
   "target": "운송",
   "states": "ACTIVE → ARRIVED / CANCELED",
   "transitions": "끝난 운송에 새 도착·취소 → TRANSIT_CLOSED",
   "source": "transit.md"
  }
 ],
 "commands": {
  "receive": {
   "requires": "양 범위·등급 값(INVALID_INPUT) · 새 sampleId(ID_TAKEN) · 있는 용기·책임자 · 빈 용기(시료도 운송 확보도 없음, CONTAINER_OCCUPIED) · 용량 · 등급 적합(STORAGE_INCOMPATIBLE)",
   "effects": "시작 시료(등급 지정, 격리 false)",
   "source": "engine.md, 요청, storage.md"
  },
  "split": {
   "requires": "자식 1개 이상 · 부모 ACTIVE · **격리 아님(QUARANTINED)** · **운송 중 아님(IN_TRANSIT)** · 자식 용기 비어 있고 서로 다름·확보 안 됨 · 용량 · **자식 용기가 부모 등급 지원** · 합 ≤ 부모 available",
   "effects": "자식(부모의 rootId·책임자·**등급** 이어받음)",
   "source": "engine.md, 요청, samples.ts 주석, storage.md"
  },
  "reserve": {
   "requires": "양 범위 · expiresAt는 null 또는 now보다 큰 유효 정수(INVALID_INPUT) · 새 reservationId · 시료 ACTIVE · **격리 아님** · 양 ≤ available",
   "effects": "reserved += 양. 운송 중에도 가능",
   "source": "요청, reservations.md, transit.md"
  },
  "cancel": {
   "requires": "예약 있음 · ACTIVE",
   "effects": "CANCELED, reserved −= 양. **격리·운송 중에도 가능, 격리는 그대로**",
   "source": "reservations.md, quality.md"
  },
  "consume": {
   "requires": "예약 있음 · ACTIVE · **격리 아님** · **운송 중 아님**",
   "effects": "양 전체: remaining·reserved 감소, consumedQty 증가, 0이면 DEPLETED",
   "source": "reservations.md, 요청"
  },
  "discard": {
   "requires": "시료 ACTIVE · **운송 중 아님** · ACTIVE 예약 없음(HAS_RESERVATION)",
   "effects": "남은 양 전부 폐기, DISCARDED, 용기 비움. **격리는 막지 않음**",
   "source": "engine.md E3, 요청, quality.md"
  },
  "move": {
   "requires": "시료 ACTIVE · **운송 중 아님** · 빈 용기(지금 용기·운송 확보 포함 CONTAINER_OCCUPIED) · 용량 · **등급 적합**",
   "effects": "용기만 바뀜. **격리는 막지 않음**",
   "source": "engine.md E4, 요청, quality.md"
  },
  "transferCustody": {
   "requires": "시료 ACTIVE · 있는 책임자",
   "effects": "그 시료 하나만. 격리·운송 중에도 가능",
   "source": "engine.md E4, quality.md, transit.md"
  },
  "quarantine / release": {
   "requires": "시료 ACTIVE",
   "effects": "quarantined만 바꿈. **기존 예약(상태·양·만료) 그대로**, 예약 있어도 가능",
   "source": "요청, quality.md"
  },
  "advanceTime(to)": {
   "requires": "to는 now 이상의 유효 정수(INVALID_INPUT)",
   "effects": "now = to, **expiresAt ≤ now인 ACTIVE 예약은 모두 EXPIRED**(경계 포함), 예약 양만 풀림. 이벤트 하나",
   "source": "요청, reservations.md"
  },
  "startTransit": {
   "requires": "**운송 ID 새것(끝난 운송 포함, ID_TAKEN)** · 시료 ACTIVE · 운송 중 아님(IN_TRANSIT) · 목적 용기 있음·비어 있음·확보 안 됨 · 용량 · **등급 적합**",
   "effects": "ACTIVE 운송, 출발 용기 점유 유지 + 목적 용기 확보. 격리는 막지 않음",
   "source": "요청, transit.md, storage.md"
  },
  "confirmArrival": {
   "requires": "운송 있음(UNKNOWN_TRANSIT) · ACTIVE(TRANSIT_CLOSED)",
   "effects": "시료를 목적 용기로(출발 용기 빔), ARRIVED",
   "source": "요청, transit.md"
  },
  "cancelTransit": {
   "requires": "운송 있음 · ACTIVE",
   "effects": "출발 용기에 그대로, CANCELED, 목적 확보 풀림",
   "source": "요청, transit.md"
  }
 },
 "invariants": [
  {
   "id": "I1",
   "rule": "계보마다: 받은 양 = Σ(remaining + consumedQty + discardedQty)",
   "source": "engine.md E2"
  },
  {
   "id": "I2",
   "rule": "ACTIVE 시료는 용기 하나, 용기 하나엔 ACTIVE 시료 최대 하나, 끝난 시료는 containerId null",
   "source": "engine.md E1·E3"
  },
  {
   "id": "I3",
   "rule": "remaining ≤ 용기 용량, 0 ≤ reserved ≤ remaining",
   "source": "engine.md E1, reservations.md"
  },
  {
   "id": "I4",
   "rule": "reserved = 그 시료의 ACTIVE 예약 양 합",
   "source": "reservations.md"
  },
  {
   "id": "I5",
   "rule": "끝난 시료·예약·운송은 다시 ACTIVE가 되지 않는다",
   "source": "engine.md E3, reservations.md, transit.md"
  },
  {
   "id": "I6",
   "rule": "parentId·rootId 불변, 자식 rootId = 부모 rootId",
   "source": "engine.md E2"
  },
  {
   "id": "I7",
   "rule": "events[i].seq = i+1, 이벤트 수 = 성공한 새 명령 수",
   "source": "engine.md E6"
  },
  {
   "id": "I8",
   "rule": "실패한 명령 뒤 스냅숏 = 명령 전 스냅숏 (분취는 전부 아니면 전무)",
   "source": "engine.md E6"
  },
  {
   "id": "I9",
   "rule": "성공한 eventId 재전송: 같은 op·args → 처음 Receipt·상태 그대로 / 다르면 EVENT_CONFLICT / 실패한 eventId는 기록 안 됨",
   "source": "engine.md E5"
  },
  {
   "id": "I10",
   "rule": "시료·예약·운송 ID는 끝난 뒤에도 다시 못 씀",
   "source": "engine.md E1, transit.md"
  },
  {
   "id": "I11",
   "rule": "이력 args는 받을 때의 값(호출한 쪽이 고쳐도 그대로)",
   "source": "engine.md E6"
  },
  {
   "id": "I12",
   "rule": "ACTIVE 시료의 요구 등급은 담긴 용기의 지원 목록에 정확히 들어 있다. 시료 등급은 만들어진 뒤 바뀌지 않는다",
   "source": "storage.md"
  },
  {
   "id": "I13",
   "rule": "expiresAt ≤ now인 ACTIVE 예약은 없다",
   "source": "reservations.md"
  },
  {
   "id": "I14",
   "rule": "ACTIVE 운송의 시료는 ACTIVE이고 출발 용기에 있다. ACTIVE 운송의 목적 용기는 비어 있고 다른 ACTIVE 운송의 목적지가 아니다",
   "source": "transit.md, storage.ts 주석"
  }
 ],
 "confusables": [
  {
   "pair": "격리 quarantined / 생애 status",
   "distinction": "쓰지 못하게 묶음(되돌릴 수 있음) / ACTIVE·끝남",
   "source": "quality.md"
  },
  {
   "pair": "예약 취소 / 예약 만료",
   "distinction": "명령으로 끝냄 CANCELED / 시각 진행으로 끝남 EXPIRED (둘 다 기록 남음)",
   "source": "reservations.md"
  },
  {
   "pair": "출발 용기 점유 / 목적 용기 확보",
   "distinction": "운송 중 시료가 실제로 있는 곳 / 도착할 자리를 잡아 둠 — 둘 다 다른 시료가 못 씀",
   "source": "transit.md"
  },
  {
   "pair": "직접 이동 move / 운송",
   "distinction": "한 번에 옮김(운송 중엔 금지) / 시작→도착·취소 2단계",
   "source": "요청, transit.md"
  },
  {
   "pair": "등급 정확 일치 / 상하 관계",
   "distinction": "목록에 그 이름이 있어야 함 / 없음(FROZEN 용기도 CHILLED는 못 받음)",
   "source": "storage.md"
  }
 ],
 "errors": {
  "INVALID_INPUT": "양·등급·시각·만료 시각 값이 잘못됨",
  "QUARANTINED": "격리로 금지된 분취·새 예약·소비",
  "STORAGE_INCOMPATIBLE": "목적 용기가 요구 등급을 지원하지 않음",
  "IN_TRANSIT": "운송 중 금지된 명령",
  "UNKNOWN_TRANSIT": "없는 운송",
  "TRANSIT_CLOSED": "끝난 운송에 새 도착·취소",
  "CONTAINER_OCCUPIED": "시료가 있거나 운송 목적지로 확보된 용기",
  "ID_TAKEN": "시료·예약·운송 ID 재사용"
 }
}
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