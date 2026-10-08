# 0030 — 포인트 적립 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0030`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1·브랜치 `task/0030-points`는 이미 있음. TASKS.md에 0030 등록(owner=claude, status=blocked: 질문 대기) | 사람이 준 이슈·브랜치를 그대로 사용 |
| 2 | DEFINE | domain.md·architecture.md·price-cart.ts를 읽고 prd.md 작성, 열린 질문 Q1~Q9 정리 | "좀 줄여"·"더 많이"는 수치가 없고, 결제 금액에 배송비 포함 여부·소수점 처리·쿠폰 판정·VIP+쿠폰 결합이 정해지지 않음. 요청이 "모호하면 추측하지 말라"고 했으므로 구현하지 않음 |
| 3 | PLAN | sdd.md 초안(함수 형태·파일 계획·검증 사례)만 작성 | 수치와 무관한 구조만 먼저 고정. 쿠폰 모듈(0003)이 없어서 쿠폰 여부는 입력으로 받는 안을 제안 |
| 4 | 막힘 | 사람의 답을 기다림 — BUILD·GATE 진행 안 함 | 답을 받으면 domain.md에 규칙 먼저 반영 → BUILD |
| 5 | DEFINE | 요청자 답변(2026-10-08) 반영: prd 질문·답 표, Acceptance 확정 | 답이 제안 기본값과 크게 다름 — 기준은 total이 아니라 subtotal, 쿠폰은 감액이 아니라 0P(NORMAL만). 추측 구현했으면 틀렸을 것 |
| 6 | DEFINE | Q8·Q9는 위임받음 → 0원은 0P·상한 없음, 0003보다 먼저 진행 | 규칙에서 자연스럽게 나오는 결과라 새 규칙을 만들지 않음. 쿠폰 판정이 discount만 보므로 0003과 독립 |
| 7 | PLAN | domain.md에 "포인트 적립 규칙 (0030)" 1~6 추가 | 첫 시도는 hook에 막힘 — prd.md를 같은 턴에 병렬로 쓰는 중이라 hook이 이전 prd를 봄. prd 저장 후 재시도로 통과 |
| 8 | BUILD | `points.ts`(`earnPoints`) + 테스트 8개 | 반올림을 `Math.round(x*0.01)` 대신 정수 연산 `floor((s×p+50)/100)`으로 — 부동소수점 x.5 경계 오차 회피. 등급 검증은 `Object.hasOwn`으로 프로토타입 키(`toString`) 차단 |
| 9 | GATE | `pnpm check` ALL PASS (113 tests) | 한 번에 통과 |
| 10 | RECORD | sdd·prd 체크박스·architecture·TASKS·JOURNAL 갱신 | 기록 일괄 수정용 python 스크립트가 권한에 막혀 Edit로 개별 수정 |
