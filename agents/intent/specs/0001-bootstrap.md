# 0001 — harness-lab 뼈대 구성

## PRD
- **문제:** ClauseLens에서 하네스를 직접 실험하면 실제 작업 루프(게이트, CI)가 흔들린다.
- **목표:** 하네스만 실험할 수 있는 별도 TypeScript 샌드박스를 만든다.
- **비목표:** 실제 제품 기능, CI, 배포.

## Acceptance
- [x] `pnpm check` 게이트가 typecheck·테스트·문서 규칙을 검사하고 PASS한다
- [x] AGENTS.md / CLAUDE.md 진입점과 Intent·Context·Harness·Orchestration 계층이 있다
- [x] 실험 대상 도메인(메모 저장소)과 단위 테스트가 있다
- [x] LEARNINGS.md로 ClauseLens 역수입 경로가 있다
- [ ] GitHub Actions에서 게이트 실행 (후속 태스크)

## SDD
- **읽은 문서:** ClauseLens `AGENTS.md`, `agents/harness/{README,loop,guardrails}.md`, `evals/checks.sh`
- **접근:** ClauseLens의 4+1 계층을 축소 복제한다. 모노레포·Expo·Prisma는 제외하고 단일 패키지로 둔다.
- **대안·트레이드오프:**
  - ClauseLens 안의 브랜치에서 실험: 실제 코드로 검증할 수 있지만 본 게이트·CI와 섞인다. → 기각
  - 빈 repo에서 처음부터 설계: 자유도는 높지만 ClauseLens와 비교하기 어렵다. → 기각
  - 축소 복제(채택): 비교하기 쉽고, 역수입 경로가 단순하다.
- **파일 계획:** `package.json`, `tsconfig.json`, `src/memo{,.test}.ts`, `AGENTS.md`, `CLAUDE.md`, `LEARNINGS.md`, `agents/**`
- **위험:** 문서가 ClauseLens와 달라지는 것. LEARNINGS.md로 관리한다.
- **검증 계획:** `pnpm check` PASS

## 검증 결과
- `pnpm check`: ALL PASS (Typecheck, Unit tests 3개, lockfile 검사, spec Acceptance 검사)
