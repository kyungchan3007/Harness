# 0030 — 포인트 적립 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace NNNN`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | DEFINE | 원문 request.md, domain.md, price-cart.ts, money.ts, 템플릿 읽음 | 원문에 쿠폰·VIP 수치가 없다. 기본 1%만 확정이고 나머지는 가정으로 표시해야 한다 |
| 2 | DEFINE | prd.md 작성: 이슈 #1, 역할 분리 on, 가정/미확정 표와 요청자 질문 6개 | 가정값: 쿠폰 0.5%, VIP 2%, VIP+쿠폰 1%. "좀"=절반, "더 많이"=2배, VIP+쿠폰은 쿠폰 감산을 VIP 요율에도 적용(2%×½). 근거는 해석 단순성뿐이라 확정 사실로 쓰지 않음 |
| 3 | PLAN | sdd.md 작성: 정책 객체(`PointsPolicy`), bp 정수 요율, 4칸 표 직접 조회, 내림 | 부동소수점 `0.01`은 오차 위험이라 bp 정수. 곱셈 조합 대신 표 조회로 VIP+쿠폰 우선순위를 값으로 명시. 큰 금액은 `total`을 10,000으로 나눠 몫·나머지로 계산해 안전 정수 초과 방지 |
| 4 | PLAN | `total`(배송비 포함)을 기준으로 확정, 쿠폰 판정은 `discount > 0` | domain.md의 "결제 금액 = total" 용어를 따름. 둘 다 가정으로 표시하고 질문 목록에 올림 |
| 5 | PLAN | domain.md 편집이 hook에 막힘(sdd.md·TASKS 행 없음) → TASKS 행과 sdd.md를 먼저 만들고 재시도 | 기록 우선 규칙대로 순서를 바로잡음. 우회하지 않음 |
| 6 | PLAN | domain.md에 용어 4개와 "포인트 규칙 (0030)" 10개 규칙·요율 표 추가 | 숫자·내림·VIP+쿠폰 조합·범위 밖(환불 회수 등)을 문서에 명시. `DEFAULT_POINTS_POLICY`를 이 표와 테스트로 대조하게 함 |
| 7 | BUILD | builder: request.md·prd·sdd·domain.md·money.ts·price-cart.ts(+테스트 스타일) 읽음. 원문과 prd/sdd 차이 없음 | 원문은 수치 미정이라 prd 가정값(0.5%/2%/1%)을 그대로 따름 |
| 8 | BUILD | `src/pricing/points.ts` 구현: sdd 시그니처 그대로. 요율은 `DEFAULT_POINTS_POLICY`에만, 계산은 `q·rate + floor(r·rate/10000)` 정수 분해 | `BP_DENOMINATOR`만 상수로 둠. 등급 검사는 `Object.hasOwn`(`"toString"` 같은 프로토타입 키도 거부) |
| 9 | BUILD | `src/pricing/points.test.ts` 작성: 기본 정책 대조, 규칙 3·7·4·5·6·2·9·8, 정책 주입·정책 검증 12종, 1~2,000원 전수 대조(floor 직접 계산과 비교) | MAX_SAFE_INTEGER 값은 4칸 모두 단언(90071992547409 등) |
| 10 | GATE | `pnpm check` ALL PASS (146 tests) | 문서와 다르게 구현한 곳 없음. 문서 문제 없음 |
| 11 | VERIFY | verifier: 원문 먼저 읽고 prd Acceptance 전 항목을 코드·테스트 줄 단위로 대조, `pnpm check` 직접 실행(ALL PASS) | MAX_SAFE_INTEGER 결과(…409)를 손으로 q/r 분해해 확인. 가정 요율(0.5%/2%/1%)은 domain.md·prd·코드 주석 모두 가정으로 표시됨, 확정 사실처럼 쓴 곳 없음. 약한 단언 없음, 정책 검증 12종 모두 양쪽 경로 확인. 판정: approved (1차) |
