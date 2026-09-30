# 0021 — 이슈·브랜치 연결 규칙 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** 사용자 지시(2026-09-30), `records.mjs`(`parseTaskId`·`checkPrd`), `trace.mjs`(`resolveTraceFile`), commit-and-issue.md, loop.md, `gh issue develop --help`
- **접근:**
  1. **브랜치 생성은 `gh issue develop <이슈> --name <브랜치> --base main --checkout`.** GitHub가 이슈와 브랜치를 연결하고, 이슈 화면 "Development"에 브랜치가 뜬다.
  2. **fix 브랜치 = 원 태스크 소속.** `parseTaskId`가 `task/NNNN-`뿐 아니라 `fix/NNNN-`도 태스크 NNNN으로 인식 → guard·Stop·게이트·커밋 규칙·자동 기록이 원 태스크 폴더를 쓴다. fix 기록은 그 폴더의 `trace.md`에 남기고, 원 이슈에 코멘트로 요약.
  3. **이슈 번호 필수(0021 이후).** `checkPrd`가 태스크 번호 ≥ 0021이면 `- **이슈:** #번호` 줄을 요구 → 없으면 게이트 FAIL, guard가 코드 수정 차단. 이전 태스크는 이슈 없이 진행됐으므로 면제(0011의 "제도 도입 이전 면제"와 같은 원칙).
  4. **연결 확인은 별도 명령 `pnpm issue-link`.** `gh issue develop --list <이슈>`에 현재 브랜치가 있는지 확인. 네트워크가 필요해 게이트(오프라인)에는 넣지 않는다.
- **대안·트레이드오프:**
  - fix 브랜치에 새 태스크 번호: 폴더·기록이 원 작업과 끊긴다. → 원 번호 재사용.
  - 연결 확인을 게이트에 포함: 오프라인·gh 미인증 환경에서 게이트가 깨진다. → 별도 명령, PR 전에 실행.
  - 이슈 번호를 브랜치 이름에(`task/10-...`): 태스크 번호와 이슈 번호가 둘 다 필요해 이름이 길어지고 기존 규칙과 충돌. → 브랜치는 태스크 번호, 이슈 번호는 prd·TASKS에.
  - fix와 새 이슈의 경계를 기계 판정: 도메인 판단이라 규칙화 어려움. → 지침서에 판단 질문 3개(공통 모듈인가·다른 기능인가·다른 도메인인가)로 안내.
- **파일 계획:** `hooks/lib/records.mjs`(+test), `hooks/trace.mjs`(+test), `evals/issue-link.mjs`, `package.json`, `agents/harness/branch-and-issue.md`(지침서), commit-and-issue.md·loop.md·AGENTS.md·README, 템플릿 prd.md
- **위험:** 기존 `task/` 전용 로직이 여러 곳에 흩어져 있어 한 곳이라도 빠지면 fix 브랜치에서 기록이 엉뚱한 곳에 쌓인다 → `parseTaskId`로 일원화, 단위 테스트로 확인.
- **검증 계획:** `fix/` 인식·이슈 번호 요구·면제 단위 테스트, 복사본에서 실제 `fix/` 브랜치로 guard·게이트·커밋 e2e, `pnpm issue-link`를 이 브랜치(#10)로 실행, `pnpm check`

## 계획과 달라진 점
- 없음 (설계대로). e2e 스크립트 실수로 한 번 잘못된 커밋(main)에서 검증해 "차단 안 됨"이 나왔다 → 0021 커밋 기준으로 재실행해 정상 확인. 도구 결함이 아니라 검증 절차의 실수.

## 검증 결과
- 단위 테스트: fix 브랜치 인식·이슈 번호 필수(0021~)·이전 태스크 면제·fix 브랜치 자동 기록 위치·fix 브랜치 수정 허용, 전체 57개 PASS
- e2e (원격 없는 복사본):

| 시나리오 | 결과 |
| --- | --- |
| ① `fix/0021-e2e` 브랜치에서 코드 수정 | 원 태스크(0021) 기록으로 허용 |
| ② fix 브랜치 자동 기록 | 원 태스크 폴더 `trace.auto.jsonl`로 |
| ③ fix 브랜치 커밋 | 세 섹션 없으면 거부 (태스크 커밋과 동일) |
| ④ 이슈 번호 없는 새 태스크 0022 | 코드 수정 **차단** + `gh issue develop` 안내 |
| ⑤ 같은 상태 게이트 | FAIL |
| ⑥ 이슈 번호 추가 | guard·게이트 통과 |

- 실제 repo: `pnpm issue-link` → `task/0021-issue-branch-rule ↔ 이슈 #10 연결됨`
- 이 태스크 자체: 이슈 #10 먼저 생성 → `gh issue develop 10`으로 브랜치 생성·연결
- `pnpm check`: ALL PASS
