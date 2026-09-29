# 0001 — harness-lab 뼈대 구성 — PRD

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

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
