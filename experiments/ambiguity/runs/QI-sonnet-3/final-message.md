`src/pricing/points.ts`에 `calcPoints(price, member)`를 만들었고, 최종 `pnpm check`가 ALL PASS입니다(테스트 115개). 커밋과 이슈 #1 체크박스 동기화(`pnpm issue-sync`)는 요청이 없어서 하지 않았습니다.

- **계산:** 기준 금액(`subtotal − discount`)을 적립률의 역수로 나눈 몫이 포인트입니다. 부동소수점은 쓰지 않고 정수 나눗셈으로 내림합니다.
  - 일반 회원 1%
  - 쿠폰 사용(`discount > 0`) 0.5%
  - VIP 2%
  - VIP와 쿠폰 동시 1%
- **입력:** `PriceBreakdown`과 `{ grade: "VIP" | "NORMAL" }`를 받습니다. 음수나 소수 금액, `discount > subtotal`, 모르는 등급은 `RangeError`로 거부합니다.
- **위임받아 정한 것:** 기준 금액이 0이면 0포인트이고, 빈 장바구니도 같습니다. 범위는 계산 함수까지이며, 잔액, 사용, 환불 시 회수는 이번 태스크에 넣지 않았습니다.
- **문서:** `domain.md`에 "포인트 적립 규칙 (0030)"을 추가했고, `prd.md`·`sdd.md`·`trace.md`, `TASKS.md`(done), `JOURNAL.md`를 갱신했습니다.
- **보완 필요:** `discount > 0`을 쿠폰 사용으로 보는 것은 지금은 맞지만, 쿠폰이 아닌 할인이 생기면 규칙 4를 다시 정해야 합니다. 이 내용은 `sdd.md`의 위험 항목에 적어 두었습니다.
