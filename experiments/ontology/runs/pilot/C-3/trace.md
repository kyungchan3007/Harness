# 0040 — 연구실 시료 보관 엔진 — trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1 → `task/0040-lab` | 이슈가 이미 생성되어 있음 → 그대로 사용 |
| 2 | DEFINE | prd.md(애매한 곳 5개) · sdd.md(접근·대안·검증 계획) 작성 | 규칙 R1~R8이 요청에서 명확히 정의됨 → 단일 소스로 따름 |
| 3 | BUILD | src/lab/lab.ts (8개 명령, 중복 감지, 원자성) · lab.test.ts (41개 테스트) | 공개 예시 5개 + 규칙별 테스트 + 경계값으로 구성 |
| 4 | VERIFY | TypeScript 타입 에러 수정 (EventView['op'], containerId null 체크) | 끝난 시료의 containerId는 항상 null이 되므로, 접근 전 가드 체크 추가 |
| 5 | GATE | pnpm check ALL PASS (Typecheck ✓, Unit tests 179/179 ✓) | 테스트 이름에 규칙 번호를 붙여 domain.md 추적처럼 prd 규칙을 1:1 대응 |

---

## 자동 기록 (trace.auto.jsonl)
(hooks에 의해 자동 추가됨)
