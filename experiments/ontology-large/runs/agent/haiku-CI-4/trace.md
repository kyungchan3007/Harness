# 0040 — 시료 보관 엔진 확장 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 브랜치 `task/0040-lab`(이슈 #1, 이미 체크아웃) 확인 | 요청이 지정한 번호·브랜치 그대로 사용 |
| 2 | CONTEXT | 계약·정책 문서 5개, 모듈 8개, 온톨로지 읽음 | 요청 요약이 아닌 docs·types가 기준이라 원문 대조 |
| 3 | DEFINE | `prd.md` 작성, 애매한 곳 표 기록 | 분취 등급 상속·자식 용기 등급 검사는 정책 문서에 있어 가정이 아닌 확인됨 |
| 4 | PLAN | `sdd.md` 작성, 목적 확보를 `targets` Map으로 분리 | 출발 점유와 목적 확보를 한 `occupied`에 섞으면 정책과 어긋남 |
| 5 | BUILD | state에 `targets`(운송 목적 확보)와 `inTransit` 추가, storage `isFree`가 두 집합 검사 | 출발 점유와 목적 확보를 한 Map에 섞으면 정책 구분이 안 됨 |
| 6 | BUILD | samples: 받기·분취·이동 등급 검사, 분취 자식 등급 상속(TODO 제거), 격리·운송 중 검사 | docs/storage.md·transit.md 적용 범위 그대로 |
| 7 | BUILD | quality·reservations·transit 구현 (advanceTime 만료 sweep, 운송 3명령) | 만료는 이벤트 하나에서 확정 기록 |
| 8 | VERIFY | `tsc` 통과, `lab.test.ts` 21개 중 1개 실패 → 테스트 가정 오류(C 용기 용량 500 < 600) 확인 후 테스트를 "실패·무변화"로 수정 | 구현 결과는 E6.4상 허용 범위, 테스트의 단일 코드 가정이 틀렸음 |
| 9 | GATE | 태스크 기록 검사 실패 4건: 애매한 곳 줄에 (가정)/(확인됨: …) 표기 누락 → 표기 수정 | 기록 규칙이 요구한 형식 그대로 맞춤 |
| 10 | GATE | `pnpm check` ALL PASS (typecheck, 단위 163개, lockfile, 기록) | 완료 선언 가능 |
| 11 | RECORD | TASKS 0040 done, JOURNAL 한 줄, prd Acceptance 체크 | 커밋은 요청되지 않아 하지 않음 |
