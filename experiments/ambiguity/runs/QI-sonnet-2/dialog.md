## AI

구현은 시작하지 않았고, 아래 항목을 정해 주셔야 `prd.md`를 쓸 수 있습니다. `domain.md`에는 포인트, 쿠폰, VIP 규칙이 없습니다. 쿠폰은 "0003에서 다룬다"고만 적혀 있고, `src/`에도 쿠폰이나 회원 등급 코드가 없습니다.

**1. "쿠폰을 쓴 주문은 적립을 좀 줄여 주세요"**
- 줄이는 비율이 얼마인가요? (예: 0.5%, 적립 없음)
- 쿠폰이 적용됐는지만 보나요, 할인액 크기도 보나요?
- 쿠폰 종류(정액, 정률, 배송비 쿠폰)에 따라 달라지나요?
- 쿠폰 모듈이 아직 없습니다. 이번 작업에서는 "쿠폰 사용 여부"를 입력 값(boolean)으로 받기만 해도 되나요? 아니면 0003(쿠폰)을 먼저 해야 하나요?

**2. "VIP 회원은 더 많이 적립해 주세요"**
- 적립률은 몇 %인가요?
- VIP는 어떻게 판별하나요? 회원 등급 모델이 없으니, 입력 값(`isVip` 등)으로 받으면 되나요?
- VIP가 쿠폰을 쓰면 규칙이 어떻게 적용되나요? (예: 감소 규칙만 적용, VIP 적립률에서 감소, VIP는 감소 없음)

**3. 적립 기준 금액**
- "결제 금액"은 `total`(`subtotal − discount + shipping`)인가요?
- 배송비를 뺀 상품 금액을 기준으로 하는 건 아닌가요?

**4. 1포인트 단위 처리**
- 소수가 나오면 버림, 반올림, 올림 중 어느 쪽인가요? (예: 결제 1,950원 × 1% = 19.5포인트)
- 결제 금액이 100원 미만이면 0포인트가 되는데, 이대로 두면 되나요?

**5. 범위**
- 이번 작업은 적립 포인트 계산 함수(`src/pricing/points.ts`)만 만드나요? 포인트 잔액, 사용, 취소/환불 시 회수는 범위 밖이 맞나요?
- 계산 함수 이름과 시그니처는 제가 정해도 되나요? (예: `calcPoints({ total, usedCoupon, isVip }) → 정수`)

답을 주시면 `0030-points`의 `prd.md`, `sdd.md`, `trace.md`를 쓰고, `domain.md`에 포인트 규칙을 추가한 뒤 TASKS에 등록하고 구현하겠습니다.

## 요청자

1. 쿠폰을 쓴 주문은 적립률을 절반으로 줄입니다 (1% → 0.5%). 쿠폰을 썼는지는 priceCart 결과(PriceBreakdown)의 discount가 0보다 큰지로 판단합니다. 쿠폰 할인은 discount로 들어옵니다. 입력은 priceCart 결과(PriceBreakdown: subtotal·discount·shipping·total)와 회원 정보 { grade: "VIP" | "NORMAL" }입니다. 함수 이름은 자유입니다.
2. VIP는 적립률 2배입니다 (1% → 2%). 회원 정보는 { grade: "VIP" | "NORMAL" } 형태로 따로 받습니다. VIP가 쿠폰을 쓰면 VIP 2배를 먼저 적용하고 쿠폰으로 절반을 줄입니다 (2% → 1%). 입력은 priceCart 결과(PriceBreakdown: subtotal·discount·shipping·total)와 회원 정보 { grade: "VIP" | "NORMAL" }입니다. 함수 이름은 자유입니다.
3. 적립 기준은 쿠폰 할인 후 상품 금액(subtotal − discount)입니다. 배송비는 빼고 계산합니다.
4. 1포인트 미만은 버립니다(내림).
5. 입력은 priceCart 결과(PriceBreakdown: subtotal·discount·shipping·total)와 회원 정보 { grade: "VIP" | "NORMAL" }입니다. 함수 이름은 자유입니다.

## AI

포인트 적립 함수를 `src/pricing/points.ts`에 구현했고, `pnpm check`는 ALL PASS입니다. 다만 이슈 #1의 체크박스 동기화는 못 했습니다. 이 저장소에 git remote가 없어 `pnpm issue-sync`가 `no git remotes found`로 실패했고, 커밋도 하지 않았습니다.

`calcPoints(breakdown, { grade })`는 `priceCart` 결과와 회원 등급을 받아 포인트(정수)를 돌려줍니다. 적용한 규칙은 답변 그대로입니다.
- **기준 금액:** `subtotal − discount`이고 배송비는 뺍니다.
- **적립률:** 일반 1%, VIP 2%입니다.
- **쿠폰:** `discount > 0`이면 적립률을 절반으로 줄입니다(VIP는 2배를 먼저 적용하고 줄여 1%). 1포인트 미만은 버립니다.

적립률은 정수로 계산해 부동소수점 오차를 피했고, 알 수 없는 등급이나 잘못된 금액은 `RangeError`로 거부합니다. 테스트 22개를 추가했고, 경계값은 일반 99/100원, VIP 49/50원, 일반+쿠폰 199/200원, VIP+쿠폰 99/100원입니다.

문서는 `agents/intent/specs/0030-points/`에 `prd.md`, `sdd.md`, `trace.md`를 만들었습니다. 이 규칙이 `domain.md`에 없었어서 "포인트 적립 규칙 (0030)"으로 추가했고, `architecture.md`, TASKS(done), JOURNAL도 갱신했습니다.

`discount > 0`을 쿠폰 사용으로 보기 때문에, 쿠폰이 아닌 할인이 들어오면 구분되지 않습니다. 쿠폰 모듈(0003)이 생기면 다시 검토해야 하고, `sdd.md`에 적어 두었습니다.

remote를 연결한 뒤 `pnpm issue-sync`를 실행하고, 커밋은 말씀해 주시면 진행하겠습니다.
