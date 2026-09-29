# 0001 — harness-lab 뼈대 구성 — SDD

요구사항: [prd.md](prd.md)

## 설계
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
