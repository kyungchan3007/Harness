# 0030 — 쿠폰 적용 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0030`으로 확인).

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 태스크 0030 쿠폰 적용 점유, AGENTS.md 규칙 확인 | domain.md가 단일 소스이고, 배송비·장바구니 규칙은 이미 구현됨 |
| 2 | DEFINE | prd.md, sdd.md 작성, TASKS.md에 0030 추가 | 구현 전 스펙을 명확히 해서 검증 계획 수립 |
| 3 | DESIGN | 알고리즘 설계: 상품 쿠폰 분류 → 정율/정액 계산 → maxDiscount/minOrder 제약 | priceCart와 분리해서 명확성 택함 |
| 4 | BUILD | coupon.ts 구현 (Coupon 인터페이스, CouponError, priceWithCoupons 함수) | validateCoupon, calculateDiscount를 분리해서 관심사 분리 |
| 5 | BUILD | coupon.test.ts 작성 (정률, 정액, maxDiscount, minOrder, 상품/주문 쿠폰, 적용 순서, 배송비, 에러 케이스) | 규칙 13개에 각 경계값과 조합 케이스 포함 |
| 6 | GATE | pnpm check: Typecheck 에러 → orderCoupons[0]! 논-널 어서션 추가, 테스트 계산 오류 수정 | Math.floor 구현 확인, 배송비 경계값 재검증 |
