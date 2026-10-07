# 0030 — 포인트 적립 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0030`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1·브랜치 `task/0030-points`는 이미 있음. 요청을 받음 | 요청이 "좀 줄여라"·"더 많이"처럼 정도가 없고 domain.md에도 포인트·쿠폰·VIP 규칙이 없어, 구현하지 않고 5개 영역(쿠폰 감소율, VIP 적립률·판별·조합, 기준 금액, 내림/반올림, 범위·시그니처)을 질문으로 정리해 보냄 |
| 2 | DEFINE | 요청자 답변 수신(2026-10-07): 쿠폰 절반, VIP 2배, VIP+쿠폰은 2배 먼저 후 절반, 기준 `subtotal − discount`, 내림, 입력은 `PriceBreakdown` + `{ grade }`, 쿠폰 여부는 `discount > 0` | 답이 모두 수치로 확정돼 추측할 부분이 없음. prd.md에 확정 규칙과 Acceptance 작성, TASKS에 점유 |
| 3 | PLAN | sdd.md 작성, domain.md에 "포인트 적립 규칙 (0030)" 추가, architecture.md 모듈 표 갱신 | 소수 적립률은 부동소수점 오차로 경계값이 틀어질 수 있어 천분율 정수 연산으로 설계. 규칙의 단일 소스(domain.md)를 코드보다 먼저 고침 |
| 4 | BUILD | `src/pricing/points.ts`(`calcPoints`)와 `points.test.ts` 작성 | 적립률을 천분율 정수(일반 10‰·VIP 20‰, 쿠폰이면 `/2`)로 두고 `Math.floor(base × ‰ / 1000)`. 등급 검사는 `Object.hasOwn`으로 해 `"toString"` 같은 프로토타입 키를 막음 |
| 5 | BUILD | 경계값 테스트 표(`it.each`)의 제목이 어긋남을 확인하고 고침 | 처음엔 member 객체를 표에 넣어 `%i` 서식이 객체를 먹음(제목 오류). 등급 문자열로 바꾸고 서식을 `%s (%s)`로 고침. 판정 로직은 영향 없음 |
| 6 | GATE | `pnpm check` | 1회차에 ALL PASS (테스트 127개, `points.test.ts` 22개). 경계값 테스트 제목을 verbose로도 확인 |
| 7 | RECORD | prd 체크박스·sdd 검증 결과·TASKS·JOURNAL 갱신 | 알려진 한계 두 가지(규칙↔테스트 게이트 공백, `discount > 0` 가정)를 sdd 공백에 남김 |
