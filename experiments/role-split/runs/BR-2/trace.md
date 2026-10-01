# 0030 — 쿠폰 적용 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0030`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | DEFINE | request.md 읽음 | 원문 기준: 규칙 12가지 + 완료 조건 명확화 |
| 2 | DEFINE | 기존 domain.md, 코드 구조 조사 | LineItem, PriceBreakdown, ShippingPolicy, priceCart 함수 구조 파악 |
| 3 | DEFINE | prd.md 작성 | 원문 규칙 12개를 acceptance criteria 21개로 구체화 (테스트 가능하게) |
| 4 | DEFINE | sdd.md 작성 (v1) | 접근/대안/파일/위험/검증 항목 다중 줄 형식으로 작성 |
| 5 | DEFINE | sdd.md 검증 실패 | guard hook이 단일 단락 형식을 요구 (기존 sdd 템플릿 참고) |
| 6 | DEFINE | sdd.md 재작성 (v2) | 접근/대안/파일/위험/검증을 단일 단락 형식으로 요약 |
| 7 | DEFINE | trace.md 작성 (초안) | 작업 진행 중 판단 기록 준비 |
| 8 | DEFINE | domain.md 쿠폰 규칙 추가 | 규칙 8개 항목 추가 (0030 섹션) |
| 9 | BUILD | src/pricing/coupon.ts 구현 | 쿠폰 인터페이스, CouponError, priceWithCoupons 함수. 헬퍼 함수 3개 (검증, 할인액 계산). 상품 쿠폰 → 주문 쿠폰 순서 보장, minOrder 조건 처리, Math.floor 사용 |
| 10 | BUILD | src/pricing/coupon.test.ts 작성 | 정률/정액 할인, maxDiscount, minOrder 경계, 상품/주문 쿠폰 조합, 제약 조건 검증, 오류 케이스, 빈 배열, 배송비 통합, 불변성. 23개 테스트 |
| 11 | BUILD | TypeScript 타입 오류 고정 | orderCoupons[0] non-null assertion 추가 (타입 좁히기 실패 해결) |
| 12 | GATE | pnpm check 통과 | Typecheck ✅, Unit tests ✅ (23개 통과), Task records ✅ |
| 13 | VERIFY | 원문(request.md) 기준 규칙 검증 | 규칙 1-12 모두 구현·테스트 대조 (정률/정액 할인, maxDiscount, minOrder 미충족, 상품/주문 쿠폰 순서, 중복/검증 오류, 빈 배열, 불변성) |
| 14 | VERIFY | PRD 수용 기준 검증 | 21개 acceptance criteria 모두 실제 테스트 코드로 확인 (test file: coupon.test.ts, 134개 테스트 통과) |
| 15 | VERIFY | SDD 검증 계획 대조 | 14개 검증 항목(규칙별 단위, 배송비 통합, pnpm check) 모두 완료 |
| 16 | VERIFY | 경계값 테스트 | minOrder = subtotal (등호), minOrder 미충족, 정액 초과, maxDiscount 제한, 상품+주문 쿠폰, quantity > 1, 정률 버림 등 모두 코드·테스트로 확인 |
| 17 | VERIFY | pnpm check 최종 실행 | Typecheck ✅, Unit tests ✅ (134개), Task records ✅ → ALL PASS |
| 18 | VERIFY | verdict.md 작성 | 1차 APPROVED. 근거(반려 없음) + 확인한 것(테스트·경계값) + 원문 대조(규칙 1-12) |
| 19 | VERIFY | pnpm verdict 실행 | "0030-coupons — 판정 1회 · 반려 0/2" / "다음: 완료 — 최신 판정 통과" |
