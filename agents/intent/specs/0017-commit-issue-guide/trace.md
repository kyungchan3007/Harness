# 0017 — 커밋·이슈 지침서 — Trace

> ClauseLens 세션에서 작업해 이 태스크 자체의 자동 기록은 없습니다. 토큰은 `--transcript --since`로 이 세션의 해당 구간을 집계합니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | PR #6 상태 확인 후 머지, `task/0017-commit-issue-guide` | 0013~0016은 역할 분리용 예약이라 0017 |
| 2 | CONTEXT | transcript 실물 확인: 요청마다 usage·timestamp·sessionId·gitBranch 존재 | 토큰을 추정이 아니라 실측으로 기록 가능 |
| 3 | CONTEXT | 같은 message.id가 최대 7줄 반복, usage 동일 (292줄 → 111개) | 그냥 합산하면 약 2.6배 과대 집계 → id로 중복 제거 |
| 4 | PLAN | 태스크 귀속은 gitBranch, 섹션 표기는 `[허점]` | `#` 줄은 git이 주석으로 지움 |
| 5 | BUILD | `usage.mjs` 작성 → 실제 e2e 기록으로 브랜치별 집계 확인 | 지어낸 데이터가 아니라 실물로 먼저 검증 |
| 6 | BUILD | 커밋 규칙·hook 작성 → 단위 테스트 1개 실패 | 제목 `feat: x`가 트레일러 정규식에 걸림 → 첫 줄 제외 |
| 7 | BUILD | 사용자 요청: README의 "ClauseLens로 옮긴다" 문구 삭제 | 이 repo는 연구·공부용. 목적 서술이라 이 태스크에 포함 |
| 8 | VERIFY | 기존 폴더 `pnpm install`이 hooks 경로를 안 잡음 → 새 클론에선 잡힘 | 설치할 게 없으면 prepare 생략. `pnpm run prepare` 안내 |
| 9 | VERIFY | git commit e2e 4종 + 실제 세션 후 실측 기입 확인 | 거부·자동 채움·제외 모두 기대대로 |
| 10 | RECORD | 이 태스크 커밋의 토큰은 `--transcript --since`로 이 세션 구간 집계 | ClauseLens 세션이라 브랜치 귀속 불가 |
