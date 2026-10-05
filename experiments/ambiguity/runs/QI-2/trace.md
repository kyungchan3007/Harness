# 0030 — 포인트 적립 시스템 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | DEFINE | 사용자와 모호한 요구사항 명확화 (적립률 감소 수치, VIP 배율, 소수점 처리, 조합 순서) | 추측으로 구현하면 domain.md와 어긋남 → QA 필수 |
| 2 | DEFINE | prd.md, sdd.md에 대안·트레이드오프 작성, domain.md 포인트 규칙 추가, TASKS.md에 0030 등록 | 0009의 guard rails가 이 문서들을 먼저 요구함 |
| 3 | BUILD | `src/pricing/points.ts`: `earnPoints(breakdown, member)` 구현 | VIP 배율 먼저 적용 후 쿠폰 계수 순차 적용, `Math.floor`로 내림 |
| 4 | BUILD | `src/pricing/points.test.ts`: 규칙별 테스트 작성 (규칙 1~6) | breakdown 함수의 인자 순서 실수 → 수정 후 PASS |
| 5 | VERIFY | `pnpm check`: Typecheck ✅, Unit tests 111 ✅, 게이트 ALL PASS | 모든 도메인 규칙 검증됨 |

## 공백·보완점

- (없음)

## 컨텍스트·토큰

회원 정보 인터페이스는 `Member { grade: "VIP" | "NORMAL" }` 형태로, 향후 다른 등급 추가에 유연합니다. 적립률 상수(1%, 2배, 절반)는 현재 함수 내 명시적 계산으로 작성되어, 필요 시 상수 분리 가능합니다.
