# 0030 — 쿠폰 적용 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | PRD·SDD 작성, TASKS에 등록 | spec 문서가 먼저 필요하므로 guard 규칙 충족 |
| 2 | DESIGN | 접근·대안·검증 계획 명시 (SDD) | 할인 적용 순서·minOrder 무적용·정율 버림 등 핵심 판정 |
| 3 | PLAN | coupon.ts 아키텍처 설계 (validateCoupon, calculateDiscount) | 상품/주문 쿠폰 분리, minOrder는 무적용 조건이므로 오류 아님 |
| 4 | BUILD | 구현: coupon.ts (150 줄, Coupon 인터페이스·CouponError·priceWithCoupons) | 상품 쿠폰 순회 → 주문 쿠폰 적용 → priceCart 위임 |
| 5 | BUILD | 테스트: coupon.test.ts (31개 테스트, 모든 규칙 커버) | 정률/정액, maxDiscount, minOrder, 중복, 존재 여부 검증 + 배송비 상호작용 |
| 6 | GATE | pnpm check 실행 (typecheck, 테스트, 기록 검사) | ALL PASS |
