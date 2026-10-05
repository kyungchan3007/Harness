# 0030 — 포인트 적립 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0030`으로 확인).

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1·브랜치 `task/0030-points`는 이미 있음. TASKS.md에 0030 행(in-progress) 추가 | 사용자가 이슈·브랜치를 준비해 둠. `gh issue view 1`은 권한 승인이 필요해 실행되지 않았고, 이슈 본문은 못 읽음 → 요청 본문만 근거 |
| 2 | CONTEXT | domain.md·architecture.md·price-cart.ts·records.mjs 읽음. 쿠폰·VIP·포인트는 코드·문서에 없음 | 쿠폰은 0003(미구현), 회원 등급은 개념 자체가 없음 → 입력으로만 받는 순수 함수가 맞는 크기 |
| 3 | DEFINE | prd에 **가정 표** 작성 | 요청의 "좀 줄여"·"더 많이"에 수치가 없음. 조용히 정하면 도메인 규칙이 지어낸 값이 되므로 임시 값임을 문서·최종 보고에 드러내기로 함 |
| 4 | PLAN | sdd 작성: bp 정수 연산, 정책 주입, 명시적 `couponUsed` | 부동소수 곱 오차 회피 / 쿠폰 외 할인 대비 |
| 5 | BUILD | domain.md에 규칙·용어 추가 → `points.ts`·`points.test.ts` 작성 | 문서 먼저, 코드가 문서를 따름. 테스트 이름에 규칙 번호 |
| 6 | BUILD | 계산식을 몫·나머지 분할로 변경 | `total × bp`가 `MAX_SAFE_INTEGER` 근처에서 정수 정밀도를 잃는 것을 설계 중 발견. BigInt 대조 테스트로 고정 |
| 7 | GATE | `pnpm check` 1회에 ALL PASS (테스트 118개) | 실패·되돌림 없음 |
| 8 | RECORD | prd 체크박스 갱신, sdd·JOURNAL·TASKS 마무리. 가정 확인 항목은 미체크로 남김 | 임시 값을 사용자가 확인하기 전에는 "확정"이라 쓰지 않음. 이슈 동기화는 `gh` 미승인으로 못 함 |
