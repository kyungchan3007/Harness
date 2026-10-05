# 0030 — 포인트 적립 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0030`으로 확인).

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1·브랜치 `task/0030-points`는 이미 있음. TASKS에 0030 in-progress로 점유 | 이슈 본문은 `gh` 권한 승인이 필요해 읽지 못함. 요청문 원문을 기준으로 함 |
| 2 | CONTEXT | AGENTS·loop·guardrails·commit 지침서·domain·architecture, 0002 spec, price-cart 코드 읽음 | domain.md에 VIP·쿠폰 사용 개념이 없고, 쿠폰(0003)도 미구현 |
| 3 | DEFINE | 요청의 빈칸 6개(기준 금액·쿠폰 감소폭·VIP 증가폭·조합·소수 처리·쿠폰 판정)를 prd에 가정 표로 노출 | "좀 줄여/더 많이"는 수치가 없다. 조용히 정해 버리면 확인 기회가 사라지므로 잠정값 + 명시 보고. 값은 정책 객체 한 곳이라 수정 비용이 작음 |
| 4 | PLAN | 정수 bp 4칸 표 + 정수 연산 계산식, `priceCart` 비연결 | 소수 적립률은 부동소수점 경계 오차 위험. 합성 배수는 조합 결과가 암묵적 |
| 5 | DEFINE | domain.md에 용어 2개 + "포인트 적립 규칙 (0030)" 6개 추가, 잠정 값에 `(잠정)` 표시. architecture.md 모듈 표에 한 줄 | 문서 먼저 규칙. 코드보다 앞서 고정해야 테스트가 문서를 기준으로 쓰임 |
| 6 | BUILD | `src/pricing/points.ts`, `points.test.ts`(12개) 작성 | 큰 금액은 `total * bp`가 안전 정수를 넘을 수 있어 몫·나머지로 분해. 기대값은 코드와 별개로 손계산 |
| 7 | GATE | `pnpm check` 1회차 ALL PASS (테스트 117개) | 실패·되돌림 없음 |
| 8 | RECORD | sdd 검증 결과, prd 체크박스, JOURNAL, TASKS 갱신 | 커밋은 요청이 없어 하지 않음 |
| 9 | RECORD | `pnpm issue-sync` 실패: 이 저장소에 git remote가 없어(`no git remotes found`) 이슈 #1에 체크박스를 반영하지 못함 | 환경 제약. 이슈 동기화·`pnpm issue-link`는 remote가 있는 곳에서 다시 실행 필요. 게이트와 무관 |
