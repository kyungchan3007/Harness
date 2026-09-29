# Architecture

- 런타임: Node 22+, TypeScript(strict, ESM/NodeNext)
- 패키지 매니저: pnpm 전용 (npm/yarn lockfile은 게이트에서 차단)
- 테스트: Vitest (`src/**/*.test.ts`)
- 도메인: `src/memo.ts`, 인메모리 메모 저장소. 시간은 `now()`로 주입해 테스트를 결정적으로 만든다.
