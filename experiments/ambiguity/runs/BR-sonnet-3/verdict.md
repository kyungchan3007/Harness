# 0030 — 판정서

## 1차 · 2026-10-05
판정: approved

### 근거
- (반려 사유 없음)

### 확인한 것
- `pnpm check` 직접 실행: Typecheck, Unit tests(11 파일·120 테스트), lockfile, Task records 모두 PASS, 결과 ALL PASS.
- 기대값을 BigInt 정수 나눗셈(`floor(total×bps/10000)`)으로 독립 계산해 구현식과 비교했다. bps 0·7·50·100·200·300·9999, total 0·1·99·199·12,345·52,999·999,999·MAX_SAFE_INTEGER 등에서 불일치 0건이다. 12,345는 일반 123, 쿠폰 61, VIP 246, VIP+쿠폰 123이다. MAX_SAFE_INTEGER 일반은 90071992547409로 맞다.
- 비정상 입력: `assertWon`이 total(-1, 1.5, NaN, Infinity, MAX_SAFE+1)을 거부하고, `assertBps`가 정책 4칸을 전부 검증한다. 테스트가 이를 덮는다.
- 정책 인자: 호출 시 `vip: 300`을 넘기면 10,000원에서 300포인트가 나온다. 기본 정책 상수는 `DEFAULT_POINT_POLICY` 한 곳에만 있다.
- 순수성: 입력과 기본 정책 객체를 스냅샷과 비교하는 테스트가 있고, 구현에 변이 코드는 없다.
- `git status`/`git diff`: `src/` 수정 0건이다. `price-cart.ts`, `money.ts`, `src/cart/**`는 그대로이고 `points.ts`와 `points.test.ts`만 신규다. 문서는 domain.md와 TASKS.md만 수정됐다.
- 테스트 품질: 기대값이 구현식이 아니라 리터럴 숫자(100, 61, 246, 90_071_992_547_409 등)라서 동어반복이 아니다. 항상 통과하는 단언은 없다. 경계값(99/199, 0, MAX_SAFE)과 priceCart 연동(23,000 → 230)도 있다. 15개 `it` 블록 안에 sdd 22개 케이스가 모두 들어 있다.
- 문서의 "잠정" 표시는 prd(Q1~Q5), sdd, domain.md 표와 규칙 1~4에 모두 유지됐다. 확정 사실로 쓴 곳은 없다.

### 원문 대조
- 원문 "결제 금액의 1%": `DEFAULT_POINT_POLICY.general = 100bps`, 입력 `total`은 priceCart의 total이다. 테스트 10,000 → 100 ✓
- 원문 "쿠폰을 쓴 주문은 적립을 좀 줄여": 쿠폰 사용은 일반 기준 `generalWithCoupon = 50`. 쿠폰 < 일반 < VIP 순서 테스트가 있다. 방향은 ✓. 폭은 원문에 없어 잠정이다.
- 원문 "VIP 회원은 더 많이": `vip = 200`. 방향은 ✓. 폭은 원문에 없어 잠정이다.
- 원문 "1포인트 단위(정수)": 정수 연산과 내림만 쓰고, `Number.isInteger`·0 이상 테스트가 있다 ✓
- 원문 "`src/pricing/points.ts`": 파일 존재, `calculatePoints`와 `DEFAULT_POINT_POLICY`를 export한다 ✓
- 원문에 없던 값(쿠폰 0.5%, VIP 2%, VIP+쿠폰 1%, 내림, 배송비 포함 total)은 모두 "잠정/열린 질문"으로 표시돼 있다.

### 사용자 확인 필요 (반려 사유 아님)
- 잠정값 자체(쿠폰 0.5%, VIP 2%, VIP+쿠폰 1%, 소수 내림, 배송비 포함 total)는 원문에 정량 기준이 없어 정한 것이다. 사용자가 확정하기 전까지는 확정 사실이 아니다. 바뀌면 `DEFAULT_POINT_POLICY`, domain.md 표, 테스트 기대값을 함께 고친다.
- 사소한 관찰(비차단): 잘못된 정책 RangeError 테스트는 `general`만 확인한다. 나머지 3칸의 검증은 코드에는 있지만 테스트로는 덮이지 않는다.
