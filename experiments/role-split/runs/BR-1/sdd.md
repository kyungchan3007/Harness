# 0030 — 쿠폰 적용 — SDD

요구사항: [prd.md](prd.md)

## 설계

- **읽은 문서:**
  - `agents/intent/specs/0030-coupons/request.md` (원문, 이슈 #1 본문)
  - `agents/context/domain.md` (도메인 규칙, 배송비 정책)
  - `src/pricing/price-cart.ts` (PriceBreakdown, ShippingPolicy, DEFAULT_SHIPPING_POLICY)
  - `src/cart/cart.ts` (LineItem 타입)
  - `src/money.ts` (Won 타입)

- **접근:**
  - 파일 구조: `src/pricing/coupon.ts` 신규 생성 (Coupon 인터페이스, CouponError, priceWithCoupons 함수, 헬퍼 함수들)
  - 실행 흐름: 입력 유효성 검증 → 빈 장바구니 확인 → 상품 쿠폰 적용 → 주문 쿠폰 적용 → PriceBreakdown 구성
  - 핵심 계산: 정률(Math.floor 버림), 정액(상한), maxDiscount 제한, minOrder 미충족 시 0원
  - 중복 제한: 상품 쿠폰은 sku별 1개, 주문 쿠폰은 1개, 존재 검증
  - 유효성 검증: 정률 1~100, 정액 1+, maxDiscount/minOrder 0+, 상품쿠폰 sku 필수

- **대안·트레이드오프:**
  - 쿠폰 중복 제한: 런타임 오류(CouponError) vs 무시 → 선택: 오류 (request.md 규칙 8 "넘으면 CouponError")
  - 할인액 계산 소수점 처리: 버림(Math.floor) vs 반올림 → 선택: 버림 (request.md 규칙 1 "원 미만은 버림")
  - minOrder 미충족: 오류 vs 할인 0원 → 선택: 할인 0원 오류 아님 (request.md 규칙 4 "오류가 아니라 할인 0원")
  - PriceBreakdown 구성: 기존 함수 재사용 vs 새로 작성 → 선택: 기존 재사용 (배송비 로직 50,000 경계, 중복 최소화)
  - 쿠폰 검증 시점: 전체 먼저 vs 개별 계산 시 → 선택: 전체 먼저 (부분 적용 방지)

- **파일 계획:**
  - `src/pricing/coupon.ts` (NEW): Coupon 인터페이스, CouponError 클래스, priceWithCoupons 함수, 유효성 검증 헬퍼, 할인액 계산 헬퍼
  - `src/pricing/coupon.test.ts` (NEW): 12개 규칙별 테스트, 경계값 테스트, 불변성 테스트
  - `agents/context/domain.md` (UPDATE): 쿠폰 규칙(0030) 12개 항목 추가
  - `agents/orchestration/TASKS.md` (UPDATE): 0030 행 추가 (owner, status=in-progress)

- **위험:**
  - 쿠폰 적용 순서 오류 (상품 먼저 필수): 함수에서 명시적 순서 강제, 순서 테스트
  - 할인액 계산 정확도 (정률 버림, 정액 상한): 각 계산별 테스트, 경계값 포함
  - 중복 제한 누락 (상품당 1개, 주문 1개): 배열 중복 검사 함수, 위반 시 CouponError
  - 배송비 기준 오류 (할인 후 금액): domain.md 규칙 따름, priceCart 함수 재사용
  - 입력 수정 (items·coupons 변경): readonly 타입 명시, 새 객체만 생성

- **검증 계획:**
  - 단위 테스트: 정률 쿠폰 (기본/버림/maxDiscount/minOrder), 정액 쿠폰 (기본/상한/maxDiscount/minOrder), 상품쿠폰, 주문쿠폰, 순서, 중복, 유효성, 빈 장바구니, 불변성
  - 통합 테스트: 다중 상품+상품쿠폰+주문쿠폰, 배송비(50,000 경계)
  - 게이트: `pnpm check` ALL PASS (lint, test, type, trace)

## 계획과 달라진 점

(작업 진행 중 기록)

## 검증 결과

(구현 후 기록)
