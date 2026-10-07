# 0030 — 포인트 적립 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0030`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1·브랜치 `task/0030-points`는 이미 있음(사람 제공). TASKS.md에 0030 행 추가 | 이슈·브랜치 생성 생략 — 요청에서 이미 있다고 명시 |
| 2 | CLAIM | `pnpm request 1` 실패 ("no git remotes found") | 원문 request.md를 손으로 만들면 "이슈 본문 그대로"가 아니게 됨 → 만들지 않고 prd에 대화 원문을 옮겨 둠. remote 연결 후 다시 실행 필요 |
| 3 | DEFINE | domain.md·price-cart.ts 조사 | 쿠폰은 0003(미구현)이라 `discount` 금액만 있고, 회원·VIP 개념은 도메인에 없음. "결제 금액"은 domain.md상 배송비 포함 `total` |
| 4 | DEFINE | prd에 열린 질문 Q1~Q9 정리 | "좀 줄여"·"더 많이"에 수치 없음, 반올림 방식·결제 금액 범위·VIP+쿠폰 조합 순서 불명 → 추측 구현 금지 지시에 따라 질문으로 멈춤 |
| 5 | PLAN | sdd에 잠정 방향만 기록, 상태 보류 | 코드 작성 안 함. TASKS status=blocked(사람 답 대기) |
| 6 | DEFINE | 요청자 답 수령(Q1~Q7 확정, Q8·Q9 위임) → prd에 질문·답 표, domain.md에 "포인트 적립 규칙 (0030)" 6개 규칙, architecture.md 모듈 표 갱신 | Q8: 0원·1포인트 미만은 내림 규칙 결과대로 0, 상한은 요청에 없으니 두지 않음(추가 규칙을 지어내지 않는 쪽). Q9: 도메인 단일 소스 원칙상 추가가 맞음 |
| 7 | DEFINE | prd에 예시 표 9줄 고정 | "배송비 제외"가 실제로 검증되도록 `total` 기준이면 값이 달라지는 예(100 vs 130)를 넣음. 0.5% 내림 경계 예(10,398 → 51.99 → 51) 추가 |
| 8 | PLAN | 적립률을 정수 bp로 계산하기로 결정, TASKS in-progress | 실수 0.005 곱셈은 내림 경계에서 1포인트 틀릴 수 있음 |
| 9 | BUILD | points.ts·points.test.ts 작성 | 쿠폰 절반을 rate÷2가 아니라 분모×2로 구현 — 정책값이 홀수 bp일 때도 정수 유지(sdd "계획과 달라진 점") |
| 10 | GATE | `pnpm check` ALL PASS, 테스트 116개 | 첫 실행에 통과, 되돌림 없음 |
| 11 | RECORD | sdd 검증 결과·허점, prd Acceptance, JOURNAL, TASKS done | `pnpm issue-sync`는 git remote가 없어 실행 불가 → 커밋·이슈 동기화는 사람에게 남김 |
