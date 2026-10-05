# 0030 — 포인트 적립 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace NNNN`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 설계자(designer): 원문 request.md 먼저 Read, TASKS.md에 0030 행(in-progress) 추가 | 이슈 #1, 브랜치 task/0030-points. 가드가 PRD·SDD·TASKS 없이는 domain.md도 못 고치게 막아서 TASKS와 sdd를 domain.md보다 먼저 만듦 |
| 2 | DEFINE | prd.md 작성, 원문 문장 5개마다 Acceptance 항목을 대응시킴 | 원문에 숫자가 있는 건 "1%" 하나. 쿠폰·VIP 수치, 쿠폰 판정법, 조합, 반올림, 기준 금액은 전부 원문에 없음 → "원문에 없어 가정한 값 — 사람 확인 필요" 표로 prd에 노출. 쿠폰/VIP 개념이 코드·도메인에 없다는 점(0003 미구현)도 문제 정의에 적음 |
| 3 | DEFINE | 가정값 결정: NORMAL 1% / NORMAL+쿠폰 0.5% / VIP 2% / VIP+쿠폰 1% | 원문 방향(쿠폰 < 기본 < VIP)을 거스르지 않는 최소 안. "좀"=절반, "더"=2배는 임의 값이라 확정한 척하지 않고 [가정]으로 표시. 조합은 곱셈 합성: 쿠폰 시 감산도, VIP 시 가산도 무효화하지 않는 유일한 안(sdd 대안 비교) |
| 4 | DEFINE | 쿠폰 판정을 `discount > 0`이 아닌 명시 `couponUsed` 플래그로 결정 | discount는 쿠폰 외 할인·금액 0 쿠폰과 구분 불가, 0003 쿠폰 모델이 아직 없음. 대신 호출자가 플래그를 빠뜨리는 위험을 sdd 위험에 적음 |
| 5 | DEFINE | 기준 금액을 배송비 포함 `total`로 결정 | 원문이 "결제 금액"이라 했고 domain.md의 결제 금액(total) 정의가 배송비 포함. 어색해 보일 수 있어 [가정]으로 표시하고 바꾸는 방법을 sdd에 적음. 구현자가 "배송비 제외가 자연스럽다"며 임의로 바꾸지 않게 20,000원 상품 → 230 예시를 Acceptance에 고정 |
| 6 | PLAN | 적립률을 bp 정수 상수 표 한 곳(`POINT_RATES_BP`)으로, 계산은 몫·나머지 분리 정수 연산으로 설계. 공개 API를 sdd에 시그니처로 고정 | `0.01` 곱셈은 경계에서 부동소수 오차 위험. `total × bp`가 MAX_SAFE_INTEGER에서 넘칠 수 있어 BigInt 없이 q·r 분리. 요청자가 수치를 바꾸기 쉽게 한 곳 + domain.md 한 표 |
| 7 | PLAN | 테스트를 "원문 문장 테스트(대소 관계, 값 비의존)"와 "경계값 표 테스트(가정값 의존)"로 분리하도록 지시 | 가정 수치를 바꿀 때 원문 방향 테스트까지 깨지거나, 반대로 방향 테스트가 가정값에 묶여 의미를 잃는 걸 방지. 1%만 하드코딩 |
| 8 | PLAN | domain.md에 "포인트 적립 규칙 (0030)" 절(규칙 1~11)과 용어 4행 추가 | 규칙 단일 소스. 테스트 이름에 규칙 번호를 붙여 검사자가 1:1 대조 가능. 설계자는 src와 verdict.md를 건드리지 않음 |
| 9 | HANDOFF | 구현자에게: sdd 공개 API·경계값 표대로 `src/pricing/points.ts`·`points.test.ts` 구현. 넘길 열린 항목 | 가정값은 사람 확인 전까지 표대로 구현. `priceCart`·`money.ts`는 변경 금지. 요청자 확인 결과가 다르면 상수 표와 domain.md 표만 수정 |
| 10 | BUILD | 구현자(builder): 원문 request.md 먼저 Read, prd·sdd·domain.md 규칙 1~11 확인. `points.ts` 작성 | sdd 시그니처 그대로(`earnPoints`, `POINT_RATES_BP`, `BP_DENOMINATOR`). 계산은 `q×bp + ⌊r×bp/10000⌋` 정수 연산. 등급 검사는 `Object.hasOwn`으로 해서 `"toString"` 같은 프로토타입 키도 RangeError가 되게 함(sdd는 "런타임 검사"만 명시) |
| 11 | BUILD | `points.test.ts` 작성: (1) 원문 문장 테스트(대소 관계, 표 값 비의존) (2) 경계값 표 전 행 (3) priceCart 연동 4행 (4) 0원 (5) 잘못된 입력 RangeError (6) 상수 표 | 이름에 `포인트 규칙 N`을 붙여 domain.md와 1:1 추적. 추가로 MAX_SAFE_INTEGER 근방을 BigInt 기준값과 대조(테스트에서만 BigInt 사용), 규칙 10은 소스 텍스트에서 `0.0x`·50/100/200 리터럴이 표 밖에 없는지 검사 |
| 12 | GATE | `pnpm check` 1차 실패: 테스트에서 `earnPoints({subtotal,...})` 리터럴이 `Pick<PriceBreakdown,"total">`의 초과 속성 검사에 걸림(TS2353) | 시그니처(sdd)는 그대로 두고 테스트에서 객체를 변수에 담아 넘김. priceCart 결과를 넘기는 용도와 일치. 검사 약화 없음. 재실행 ALL PASS |
| 13 | VERIFY | 검사자(verifier): 원문 request.md 먼저 Read 후 prd·sdd·domain.md·구현·테스트 대조. `pnpm check` ALL PASS 직접 확인. 저장소 밖 /tmp 임시 테스트로 무작위 약 10만 건을 BigInt 기준값과 대조하고 방향 부등식 확인 | 구현자가 만든 테스트 기대값에만 의존하지 않고 독립 기준값으로 재검증. 방향(쿠폰 줄임/VIP 더 많이/조합)이 4개 조합 모두에서 성립. 가정값은 prd에 "사람 확인 필요"로 노출됨. 1차 approved, `pnpm verdict` 통과, 저장소에 임시 파일 남기지 않음 |

### 구현자 의견 (문서 변경 없음, 설계자 참고)
- 규칙 4 테스트에서 "discount>0인데 플래그 없음 → 오류 아님"을 확인했다. 이 동작은 sdd 위험 항목(호출자가 플래그를 빠뜨림)과 같은 맥락이라, 0003/주문 연결 시 플래그를 채우는 한 곳이 필요하다.
- prd/sdd와 달라진 구현은 없다. 문서가 틀렸다고 판단한 지점 없음.
