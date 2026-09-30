# 0020 — 복기 주입 + 체크박스 한 곳 관리·동기화 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** 0019 sdd·기준선(주입 시점 문제), 0017 커밋 `[보완]` 형식, 0021 이슈 규칙, `session-context.mjs`·`records.mjs`·`metrics/lib.mjs`(`extractFollowups`·`followupMentioned`·`REASON_MARK`)
- **접근:**
  1. **복기 모듈 `hooks/lib/recall.mjs`** — `buildRecap(projectDir)`:
     - 미처리 `[보완]`: 최근 커밋 40개에서 `[보완]` 항목을 뽑고, 이후 커밋·TASKS에서 핵심어로 언급된 것은 제외(0019 `followupMentioned` 재사용). 최신 6개.
     - 최근 작업 일지: `JOURNAL.md` 표의 마지막 3행(작업·드러난 공백).
     - 현재 작업 상태: `describeSession` 재사용.
     - 항목당 120자, 전체 1,500자 제한.
  2. **주입 시점** — `SessionStart`(대화 시작)는 기존 `session-context`에 복기를 붙이고, `UserPromptSubmit`(요청 입력)에 `recall-hook`을 추가. 대화별 마지막 주입 날짜·브랜치를 `hooks/.recall-state.json`(커밋 안 함)에 저장하고, **날짜나 브랜치가 바뀌었을 때만** 다시 주입.
  3. **주입 기록** — 주입할 때 자동 기록에 `RecallInjected`(보완 N개·일지 M개) 한 줄.
  4. **`pnpm issue-sync`** (`evals/issue-sync.mjs`):
     - 기본: prd Acceptance 목록으로 이슈 본문의 `## Acceptance` 체크리스트를 교체 (gh로 수정).
     - `--check`: 이슈와 prd의 항목·체크 상태 비교, 어긋나면 exit 1.
     - `--close`: 현재 브랜치의 PR이 merged이고 이슈가 열려 있으며 사유 없는 미체크가 없으면 코멘트와 함께 닫기.
  5. **완료 검사** — `inspectTask`에 "TASKS status가 done이면 prd에 사유 없는 미체크 금지" 추가. `REASON_MARK`는 `records.mjs`로 옮겨 hooks·게이트·측정이 같은 기준을 쓴다.
- **대안·트레이드오프:**
  - 복기를 대화 시작에만: 0019에서 한 대화가 한 달 넘게 이어져 거의 발동 안 함을 확인. → 날짜·브랜치 변경 시에도.
  - 매 요청마다 주입: 확실하지만 요청마다 토큰을 쓴다. → 변경 시에만.
  - Notion 복기를 주입: hooks에서 Notion을 읽으려면 인증·네트워크가 필요하고 느리다. → 저장소 안 원본(커밋 `[보완]`, JOURNAL)만. Notion은 게시용.
  - 이슈를 원본으로: 네트워크 없이는 완료 검사가 볼 수 없다. → prd가 원본, 이슈는 복사본.
  - `Closes #N` 자동 닫힘에 의존: 0021에서 실패 확인. → 명시적 `--close`.
- **파일 계획:** `hooks/lib/recall.mjs`(+test), `hooks/recall-hook.mjs`, `hooks/session-context.mjs`, `hooks/lib/records.mjs`(+test), `metrics/lib.mjs`(REASON_MARK 재수출), `evals/issue-sync.mjs`(+순수 함수 test), `.claude/settings.json`, `.gitignore`, `package.json`, 지침서(branch-and-issue.md·loop.md)
- **위험:**
  - 주입이 AI 행동을 바꾸는지는 별개 → 실제 Claude 실행으로 "주입된 보완 항목을 아는가" 확인.
  - hooks는 빨라야 함 → git 명령만, 네트워크 없음. 실패해도 작업을 막지 않음.
  - `[보완]` 처리 판정은 핵심어 매칭이라 이미 처리된 걸 다시 보여줄 수 있음 → 한계로 명시.
- **검증 계획:** 복기 조합·주입 판정·체크리스트 파싱/교체/비교·완료 검사 규칙 단위 테스트, 실제 `claude -p` 두 번(같은 조건 → 두 번째는 반복 주입 안 함, 주입 내용을 AI가 답할 수 있는지), 이슈 #12로 `issue-sync --check`/동기화 실제 실행, `pnpm check`

## 계획과 달라진 점
- **대화 시작 주입도 자동 기록에 남김:** 처음에는 요청 입력 hook에만 기록을 넣어, 대화 시작에서 주입한 사실이 기록에 빠졌다(e2e에서 발견) → session-context에도 `RecallInjected` 기록 추가.
- **테스트 흔적 제거:** hook을 실제 repo에서 직접 시험 실행해 가짜 대화(`test-1`) 주입 기록이 0020의 `trace.auto.jsonl`에 들어갔다 → 실제 대화가 아니므로 삭제(trace에 기록).
- **이슈·prd 문구 어긋남을 도구가 바로 잡음:** 이슈 #12와 prd를 따로 쓰면서 완료 조건 문구 3개가 달랐다 → `issue-sync --check`가 찾아냄 → 동기화.

## 검증 결과
- 단위 테스트 10개 추가(복기 조합·반복 방지·임시 repo 주입·체크리스트 교체/비교·TASKS 상태·done 방치 검사), 전체 67개 PASS
- 실제 Claude e2e (원격 없는 복사본, Haiku 4.5, 허용 도구 없음). 원본: [e2e/](e2e/)

| 확인 | 결과 |
| --- | --- |
| 대화 시작 시 복기 주입 | `RecallInjected`(보완 6 · 일지 3) 기록 |
| 도구·파일 없이 "미처리 보완 두 개를 말해봐" | 주입된 항목 두 개를 그대로 답함 → 컨텍스트에 들어감 |
| 같은 대화 첫 요청 | 다시 주입 안 함 |
| 같은 대화 재개(resume), 같은 날·브랜치 | 다시 주입 안 함 |
| 같은 대화 재개, 브랜치 변경 | **다시 주입** |

- `pnpm issue-sync` 실제 실행(이슈 #12): `--check`가 문구 3개 어긋남 검출 → 동기화 → 다른 섹션 보존·일치 확인
- 완료 검사: 기존 done 작업 12개 모두 새 규칙 통과(0001의 미체크는 "후속" 사유 있음)
- `pnpm check`: ALL PASS
- 한계: 주입된 복기를 AI가 **행동에 반영하는지**는 이번에 확인하지 않음(주입 여부만) — 0019 지표를 다시 재는 것으로 확인 예정 / `[보완]` 처리 판정은 핵심어 매칭 / 복기 원본은 저장소 안뿐(Notion 미포함)
