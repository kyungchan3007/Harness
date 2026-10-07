포인트 적립 함수를 `src/pricing/points.ts`에 구현했고, `pnpm check`는 ALL PASS입니다. 다만 이슈 #1의 체크박스 동기화는 못 했습니다. 이 저장소에 git remote가 없어 `pnpm issue-sync`가 `no git remotes found`로 실패했고, 커밋도 하지 않았습니다.

`calcPoints(breakdown, { grade })`는 `priceCart` 결과와 회원 등급을 받아 포인트(정수)를 돌려줍니다. 적용한 규칙은 답변 그대로입니다.
- **기준 금액:** `subtotal − discount`이고 배송비는 뺍니다.
- **적립률:** 일반 1%, VIP 2%입니다.
- **쿠폰:** `discount > 0`이면 적립률을 절반으로 줄입니다(VIP는 2배를 먼저 적용하고 줄여 1%). 1포인트 미만은 버립니다.

적립률은 정수로 계산해 부동소수점 오차를 피했고, 알 수 없는 등급이나 잘못된 금액은 `RangeError`로 거부합니다. 테스트 22개를 추가했고, 경계값은 일반 99/100원, VIP 49/50원, 일반+쿠폰 199/200원, VIP+쿠폰 99/100원입니다.

문서는 `agents/intent/specs/0030-points/`에 `prd.md`, `sdd.md`, `trace.md`를 만들었습니다. 이 규칙이 `domain.md`에 없었어서 "포인트 적립 규칙 (0030)"으로 추가했고, `architecture.md`, TASKS(done), JOURNAL도 갱신했습니다.

`discount > 0`을 쿠폰 사용으로 보기 때문에, 쿠폰이 아닌 할인이 들어오면 구분되지 않습니다. 쿠폰 모듈(0003)이 생기면 다시 검토해야 하고, `sdd.md`에 적어 두었습니다.

remote를 연결한 뒤 `pnpm issue-sync`를 실행하고, 커밋은 말씀해 주시면 진행하겠습니다.
